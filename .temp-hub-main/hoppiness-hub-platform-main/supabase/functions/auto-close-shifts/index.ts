import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BranchShift {
  id: string;
  branch_id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface OrderItem {
  id: string;
  product_name_snapshot: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Order {
  id: string;
  total: number;
  sales_channel: string | null;
  payment_method: string | null;
  order_items: OrderItem[];
}

interface CashShift {
  id: string;
  cash_register_id: string;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  cash_registers: { name: string }[] | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  profiles: { full_name: string | null }[] | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    const today = now.toISOString().split('T')[0];

    console.log(`[auto-close-shifts] Running at ${currentTime} for date ${today}`);

    // Find shifts that end at current time
    const { data: shifts, error: shiftsError } = await supabase
      .from('branch_shifts')
      .select('id, branch_id, name, start_time, end_time')
      .eq('end_time', currentTime + ':00')
      .eq('is_active', true);

    if (shiftsError) {
      throw new Error(`Error fetching shifts: ${shiftsError.message}`);
    }

    console.log(`[auto-close-shifts] Found ${shifts?.length || 0} shifts ending now`);

    const processedShifts: string[] = [];

    for (const shift of (shifts || []) as BranchShift[]) {
      // Check if closure already exists for today
      const { data: existingClosure } = await supabase
        .from('shift_closures')
        .select('id')
        .eq('branch_id', shift.branch_id)
        .eq('shift_id', shift.id)
        .eq('closure_date', today)
        .maybeSingle();

      if (existingClosure) {
        console.log(`[auto-close-shifts] Closure already exists for shift ${shift.name} at branch ${shift.branch_id}`);
        continue;
      }

      // Calculate time range for the shift
      const startTime = new Date(`${today}T${shift.start_time}`);
      let endTime = new Date(`${today}T${shift.end_time}`);

      // If end time is before start time, shift crosses midnight
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // Fetch orders for this shift
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          sales_channel,
          payment_method,
          order_items (
            id,
            product_name_snapshot,
            quantity,
            unit_price,
            subtotal
          )
        `)
        .eq('branch_id', shift.branch_id)
        .gte('created_at', startTime.toISOString())
        .lt('created_at', endTime.toISOString())
        .in('status', ['completed', 'delivered']);

      // Fetch cancelled orders
      const { data: cancelledOrders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('branch_id', shift.branch_id)
        .gte('created_at', startTime.toISOString())
        .lt('created_at', endTime.toISOString())
        .eq('status', 'cancelled');

      // Calculate breakdowns
      const salesByChannel: Record<string, number> = {};
      const salesByPayment: Record<string, number> = {};
      const salesByProduct: { name: string; quantity: number; total: number }[] = [];
      const productMap: Record<string, { quantity: number; total: number }> = {};

      for (const order of (orders || []) as Order[]) {
        // Channel breakdown
        const channel = order.sales_channel || 'unknown';
        salesByChannel[channel] = (salesByChannel[channel] || 0) + (order.total || 0);

        // Payment breakdown
        const payment = order.payment_method || 'unknown';
        salesByPayment[payment] = (salesByPayment[payment] || 0) + (order.total || 0);

        // Product breakdown
        for (const item of order.order_items || []) {
          const name = item.product_name_snapshot || 'Desconocido';
          if (!productMap[name]) {
            productMap[name] = { quantity: 0, total: 0 };
          }
          productMap[name].quantity += item.quantity;
          productMap[name].total += item.subtotal;
        }
      }

      // Convert product map to array
      for (const [name, data] of Object.entries(productMap)) {
        salesByProduct.push({ name, quantity: data.quantity, total: data.total });
      }

      // Sort by total descending
      salesByProduct.sort((a, b) => b.total - a.total);

      // Fetch cash register shifts that overlap with this operational shift
      const { data: cashShifts } = await supabase
        .from('cash_register_shifts')
        .select(`
          id,
          cash_register_id,
          opened_by,
          opened_at,
          closed_at,
          opening_amount,
          closing_amount,
          expected_amount,
          difference,
          cash_registers (name)
        `)
        .eq('branch_id', shift.branch_id)
        .gte('opened_at', startTime.toISOString())
        .lt('opened_at', endTime.toISOString());

      // Build cash registers summary
      const cashRegistersSummary = (cashShifts || []).map((cs: any) => ({
        register_name: cs.cash_registers?.[0]?.name || 'Caja',
        opened_by: cs.opened_by,
        opened_at: cs.opened_at,
        closed_at: cs.closed_at,
        initial: cs.opening_amount,
        expected: cs.expected_amount,
        declared: cs.closing_amount,
        difference: cs.difference,
      }));

      // Fetch attendance records
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select(`
          id,
          user_id,
          check_in,
          check_out,
          profiles:user_id (full_name)
        `)
        .eq('branch_id', shift.branch_id)
        .gte('check_in', startTime.toISOString())
        .lt('check_in', endTime.toISOString());

      // Build staff summary
      let totalStaffHours = 0;
      const staffSummary = (attendance || []).map((att: any) => {
        const checkIn = new Date(att.check_in);
        const checkOut = att.check_out ? new Date(att.check_out) : endTime;
        const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        totalStaffHours += hoursWorked;
        
        return {
          name: att.profiles?.[0]?.full_name || 'Empleado',
          check_in: att.check_in,
          check_out: att.check_out,
          hours: hoursWorked,
        };
      });

      // Calculate totals
      const totalSales = (orders || []).reduce((sum, o: Order) => sum + (o.total || 0), 0);
      const totalOrders = (orders || []).length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      const cancelledAmount = (cancelledOrders || []).reduce((sum, o: { total: number }) => sum + (o.total || 0), 0);

      // Create closure record
      const { error: insertError } = await supabase
        .from('shift_closures')
        .insert({
          branch_id: shift.branch_id,
          shift_id: shift.id,
          shift_name: shift.name,
          closure_date: today,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_sales: totalSales,
          total_orders: totalOrders,
          average_ticket: avgTicket,
          sales_by_product: salesByProduct,
          sales_by_channel: salesByChannel,
          sales_by_payment: salesByPayment,
          cash_registers_summary: cashRegistersSummary,
          staff_summary: staffSummary,
          total_staff_hours: totalStaffHours,
          cancelled_orders: cancelledOrders?.length || 0,
          cancelled_amount: cancelledAmount,
          notes: [],
        });

      if (insertError) {
        console.error(`[auto-close-shifts] Error creating closure for shift ${shift.name}:`, insertError);
      } else {
        console.log(`[auto-close-shifts] Created closure for shift ${shift.name} at branch ${shift.branch_id}`);
        processedShifts.push(`${shift.name} (${shift.branch_id})`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedShifts.length,
        shifts: processedShifts,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[auto-close-shifts] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
