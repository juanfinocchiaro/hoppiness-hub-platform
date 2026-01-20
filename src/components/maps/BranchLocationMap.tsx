import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, MapPin } from 'lucide-react';
import { devWarn } from '@/lib/errorHandler';
import { toast } from 'sonner';

const libraries: ("places")[] = ['places'];

interface BranchLocationMapProps {
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  onLocationChange: (lat: string, lng: string) => void;
  readOnly?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '250px',
};

// Default to Córdoba, Argentina
const defaultCenter = {
  lat: -31.4201,
  lng: -64.1888,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

function BranchLocationMapInner({
  apiKey,
  address,
  city,
  latitude,
  longitude,
  onLocationChange,
  readOnly = false,
}: BranchLocationMapProps & { apiKey: string }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  // Initialize marker position from props
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerPosition({ lat, lng });
      }
    }
  }, []);

  // Initialize geocoder when map loads
  useEffect(() => {
    if (isLoaded && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // If we have a marker, center on it
    if (markerPosition) {
      map.setCenter(markerPosition);
      map.setZoom(16);
    }
  }, [markerPosition]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (readOnly || !e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    onLocationChange(lat.toFixed(7), lng.toFixed(7));
  }, [readOnly, onLocationChange]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    onLocationChange(lat.toFixed(7), lng.toFixed(7));
  }, [onLocationChange]);

  const geocodeAddress = useCallback(async () => {
    if (!geocoderRef.current || !address) {
      toast.error('Ingresá una dirección primero');
      return;
    }

    const fullAddress = city ? `${address}, ${city}, Argentina` : `${address}, Argentina`;
    setGeocoding(true);

    try {
      geocoderRef.current.geocode({ address: fullAddress }, (results, status) => {
        setGeocoding(false);
        
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          
          setMarkerPosition({ lat, lng });
          onLocationChange(lat.toFixed(7), lng.toFixed(7));
          
          // Center map on result
          if (mapRef.current) {
            mapRef.current.setCenter({ lat, lng });
            mapRef.current.setZoom(16);
          }
          
          toast.success('Ubicación encontrada');
        } else {
          toast.error('No se pudo encontrar la dirección. Probá con más detalles.');
        }
      });
    } catch (error) {
      setGeocoding(false);
      toast.error('Error al buscar la dirección');
    }
  }, [address, city, onLocationChange]);

  const center = markerPosition || defaultCenter;
  const zoom = markerPosition ? 16 : 12;

  if (loadError) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-destructive text-sm">Error al cargar el mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={geocodeAddress}
            disabled={geocoding || !address}
            className="gap-1.5"
          >
            {geocoding ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            Buscar dirección en mapa
          </Button>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={!readOnly}
              onDragEnd={handleMarkerDragEnd}
              animation={google.maps.Animation.DROP}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#1d4ed8" stroke="white" stroke-width="1.5">
                    <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(36, 36),
                anchor: new google.maps.Point(18, 36),
              }}
            />
          )}
        </GoogleMap>
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Buscá la dirección o hacé click en el mapa para ubicar la sucursal. Podés arrastrar el marcador para ajustar.
        </p>
      )}
    </div>
  );
}

// Wrapper that fetches API key
export default function BranchLocationMap(props: BranchLocationMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          devWarn('No authenticated session for Google Maps API');
          setLoadingKey(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-maps-key`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        devWarn('Error fetching Google Maps API key:', error);
      } finally {
        setLoadingKey(false);
      }
    };
    fetchApiKey();
  }, []);

  if (loadingKey) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <MapPin className="h-8 w-8 opacity-50" />
        <p className="text-sm">Mapa no disponible</p>
        <p className="text-xs">Configurá la API key de Google Maps</p>
      </div>
    );
  }

  return <BranchLocationMapInner {...props} apiKey={apiKey} />;
}
