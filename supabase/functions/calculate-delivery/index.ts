import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CalcDeliveryRequest {
  branch_id: string;
  customer_lat: number;
  customer_lng: number;
  neighborhood_name?: string;
}

interface SuggestedBranch {
  id: string;
  name: string;
  slug: string;
}

interface CalcDeliveryResponse {
  available: boolean;
  cost: number | null;
  distance_km: number | null;
  duration_min: number | null;
  estimated_delivery_min: number | null;
  disclaimer: string | null;
  reason?: "out_of_radius" | "blocked_zone" | "delivery_disabled" | "outside_hours" | "assigned_other_branch" | "not_assigned";
  suggested_branch?: SuggestedBranch | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CalcDeliveryRequest = await req.json();

    if (!body.branch_id || body.customer_lat == null || body.customer_lng == null) {
      return json(400, { error: "branch_id, customer_lat and customer_lng are required" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch branch lat/lng
    const { data: branch, error: branchErr } = await supabase
      .from("branches")
      .select("id, latitude, longitude, city")
      .eq("id", body.branch_id)
      .single();

    if (branchErr || !branch?.latitude || !branch?.longitude) {
      return json(400, { error: "Branch not found or missing coordinates" });
    }

    // 2. Fetch branch delivery config
    const { data: branchConfig } = await supabase
      .from("branch_delivery_config")
      .select("*")
      .eq("branch_id", body.branch_id)
      .single();

    if (!branchConfig) {
      return json(200, unavailable("delivery_disabled"));
    }

    if (!branchConfig.delivery_enabled) {
      return json(200, unavailable("delivery_disabled"));
    }

    // 2b. Check delivery hours (franjas horarias) — use Argentina timezone
    if (branchConfig.delivery_hours) {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
      const dayOfWeek = String(now.getDay());
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dayWindows = (branchConfig.delivery_hours as Record<string, Array<{ opens: string; closes: string }>>)[dayOfWeek];

      if (!dayWindows || dayWindows.length === 0) {
        return json(200, unavailable("outside_hours"));
      }

      const inWindow = dayWindows.some((w) => {
        if (w.closes < w.opens) {
          return currentTime >= w.opens || currentTime <= w.closes;
        }
        return currentTime >= w.opens && currentTime <= w.closes;
      });

      if (!inWindow) {
        return json(200, unavailable("outside_hours"));
      }
    }

    // 3. Compute effective radius (check override expiry)
    let effectiveRadius = branchConfig.default_radius_km;
    if (branchConfig.radius_override_km != null) {
      const until = branchConfig.radius_override_until
        ? new Date(branchConfig.radius_override_until)
        : null;
      if (!until || until > new Date()) {
        effectiveRadius = branchConfig.radius_override_km;
      }
    }

    // 4. Exclusive territory check via neighborhood
    if (body.neighborhood_name) {
      // Find the neighborhood in city_neighborhoods
      const { data: hood } = await supabase
        .from("city_neighborhoods")
        .select("id, name")
        .eq("name", body.neighborhood_name)
        .eq("city", branch.city)
        .limit(1)
        .maybeSingle();

      if (hood) {
        // Check if blocked for security
        const { data: securityBlock } = await supabase
          .from("branch_delivery_neighborhoods")
          .select("id")
          .eq("branch_id", body.branch_id)
          .eq("neighborhood_id", hood.id)
          .eq("status", "blocked_security")
          .limit(1);

        if (securityBlock && securityBlock.length > 0) {
          return json(200, unavailable("blocked_zone"));
        }

        // Check exclusive assignment: is this neighborhood assigned to ANOTHER branch?
        const { data: assignedTo } = await supabase
          .from("branch_delivery_neighborhoods")
          .select("branch_id, branches!inner(id, name, slug)")
          .eq("neighborhood_id", hood.id)
          .eq("status", "enabled")
          .limit(1)
          .maybeSingle();

        if (assignedTo) {
          const assignedBranch = assignedTo.branches as any;
          if (assignedBranch.id !== body.branch_id) {
            // Assigned to another branch → suggest it
            return json(200, {
              ...unavailable("assigned_other_branch"),
              suggested_branch: {
                id: assignedBranch.id,
                name: assignedBranch.name,
                slug: assignedBranch.slug,
              },
            });
          }
          // Assigned to this branch → proceed normally
        } else {
          // Not assigned to any branch
          // Don't block, just proceed with radius check
        }
      }
    }

    // 5. Fetch pricing config (scoped to brand via branch)
    const { data: branchForBrand } = await supabase
      .from("branches")
      .select("brand_id")
      .eq("id", body.branch_id)
      .single();

    let pricingQuery = supabase
      .from("delivery_pricing_config")
      .select("*");

    if (branchForBrand?.brand_id) {
      pricingQuery = pricingQuery.eq("brand_id", branchForBrand.brand_id);
    }

    const { data: pricingConfig } = await pricingQuery.limit(1).maybeSingle();

    if (!pricingConfig) {
      return json(500, { error: "Delivery pricing not configured" });
    }

    // 6. Call Google Routes API for real driving distance
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      return json(500, { error: "Google Maps API key not configured" });
    }

    const routeResult = await computeRoute(
      googleApiKey,
      { lat: Number(branch.latitude), lng: Number(branch.longitude) },
      { lat: body.customer_lat, lng: body.customer_lng }
    );

    // 6b. Get dynamic prep time (queue-aware)
    const { data: dynamicPrepData } = await supabase.rpc("get_dynamic_prep_time", {
      p_branch_id: body.branch_id,
      p_tipo_servicio: "delivery",
    });
    const dynamicPrepMin = Array.isArray(dynamicPrepData) && dynamicPrepData[0]
      ? dynamicPrepData[0].prep_time_min
      : pricingConfig.prep_time_minutes;

    if (!routeResult) {
      // Fallback: use haversine when Google Routes fails
      const haversineDist = haversineDistance(
        Number(branch.latitude),
        Number(branch.longitude),
        body.customer_lat,
        body.customer_lng
      );

      if (haversineDist > effectiveRadius) {
        return json(200, unavailable("out_of_radius"));
      }

      const estimatedDuration = (haversineDist / pricingConfig.estimated_speed_kmh) * 60;
      const cost = calculateCost(pricingConfig, haversineDist);
      const totalTime = Math.ceil(estimatedDuration) + dynamicPrepMin;

      return json(200, {
        available: true,
        cost: Math.round(cost),
        distance_km: Math.round(haversineDist * 10) / 10,
        duration_min: Math.ceil(estimatedDuration),
        estimated_delivery_min: totalTime,
        disclaimer: pricingConfig.time_disclaimer,
        suggested_branch: null,
      } satisfies CalcDeliveryResponse);
    }

    const distanceKm = routeResult.distanceMeters / 1000;
    const durationMin = Math.ceil(parseInt(routeResult.duration.replace("s", "")) / 60);

    // 7. Check against effective radius
    if (distanceKm > effectiveRadius) {
      return json(200, unavailable("out_of_radius"));
    }

    // 8. Calculate cost
    const cost = calculateCost(pricingConfig, distanceKm);

    // 9. Calculate total delivery time (driving + dynamic prep)
    const estimatedDeliveryMin = durationMin + dynamicPrepMin;

    return json(200, {
      available: true,
      cost: Math.round(cost),
      distance_km: Math.round(distanceKm * 10) / 10,
      duration_min: durationMin,
      estimated_delivery_min: estimatedDeliveryMin,
      disclaimer: pricingConfig.time_disclaimer,
      suggested_branch: null,
    } satisfies CalcDeliveryResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: message });
  }
});

function unavailable(reason: CalcDeliveryResponse["reason"]): CalcDeliveryResponse {
  return {
    available: false,
    cost: null,
    distance_km: null,
    duration_min: null,
    estimated_delivery_min: null,
    disclaimer: null,
    reason,
    suggested_branch: null,
  };
}

function calculateCost(
  config: { base_distance_km: number; base_price: number; price_per_extra_km: number },
  distanceKm: number
): number {
  const extraKm = Math.max(0, distanceKm - config.base_distance_km);
  return config.base_price + extraKm * config.price_per_extra_km;
}

async function computeRoute(
  apiKey: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceMeters: number; duration: string } | null> {
  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
          },
          destination: {
            location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
          },
          travelMode: "DRIVE",
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      distanceMeters: route.distanceMeters,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
