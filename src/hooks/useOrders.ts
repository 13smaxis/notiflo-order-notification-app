// src/hooks/useOrders.ts - Updated with preparing time calculation

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Order,
  OrderStage,
  Customer,
  OrderStatus,
  StatusHistory,
  DatabaseOrder,
  mapStatusCodeToStage,
  mapStageToStatusCode
} from '@/types/order';

// ============= preparing TIME CALCULATION =============

interface preparingTimingData {
  preparing_started_at: string | null;
  preparing_paused_at: string | null;
  preparing_accumulated_ms: number;
  previous_preparing_ms: number;
  ready_at: string | null;
  collected_at: string | null;
}

/**
 * Calculate preparing timing from status_history
 * Determines when preparing started, paused, accumulated time, etc.
 */
async function calculatepreparingTiming(orderId: string): Promise<preparingTimingData> {
  const { data: history, error } = await supabase
    .from('status_history')
    .select(`
      *,
      status:status_id(status_code)
    `)
    .eq('order_id', orderId)
    .order('changed_at', { ascending: true });

  if (error) {
    console.error('Error fetching status history:', error);
    return {
      preparing_started_at: null,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
      ready_at: null,
      collected_at: null
    };
  }

  const result: preparingTimingData = {
    preparing_started_at: null,
    preparing_paused_at: null,
    preparing_accumulated_ms: 0,
    previous_preparing_ms: 0,
    ready_at: null,
    collected_at: null
  };

  let previouspreparingEndTime: string | null = null;
  let preparingedSessions: Array<{ start: string; end: string }> = [];

  for (let i = 0; i < history.length; i++) {
    const entry = history[i] as any;
    const statusCode = entry.status?.status_code;

    // Track when status changed to 'preparing' (preparing started)
    if (statusCode === 'preparing') {
      result.preparing_started_at = entry.changed_at;
    }

    // Track when status changed FROM 'preparing' to something else (preparing paused)
    if (i > 0) {
      const prevEntry = history[i - 1] as any;
      const prevStatusCode = prevEntry.status?.status_code;
      if (prevStatusCode === 'preparing' && statusCode !== 'preparing') {
        result.preparing_paused_at = entry.changed_at;
        previouspreparingEndTime = entry.changed_at;

        // Record this preparing session
        preparingedSessions.push({
          start: result.preparing_started_at!,
          end: entry.changed_at
        });
      }
    }

    // Track ready time
    if (statusCode === 'ready') {
      result.ready_at = entry.changed_at;
    }

    // Track collected time
    if (statusCode === 'collected') {
      result.collected_at = entry.changed_at;
    }
  }

  // Calculate accumulated time
  if (result.preparing_started_at && !result.preparing_paused_at) {
    // Currently preparinging - calculate from start to now
    const startTime = new Date(result.preparing_started_at).getTime();
    const now = Date.now();
    result.preparing_accumulated_ms = now - startTime;
  } else if (result.preparing_started_at && result.preparing_paused_at) {
    // preparinging was paused - calculate from start to pause
    const startTime = new Date(result.preparing_started_at).getTime();
    const pauseTime = new Date(result.preparing_paused_at).getTime();
    result.preparing_accumulated_ms = pauseTime - startTime;
  }

  // Calculate previous preparing time (sum of all completed preparing sessions)
  result.previous_preparing_ms = preparingedSessions.reduce((total, session) => {
    const start = new Date(session.start).getTime();
    const end = new Date(session.end).getTime();
    return total + (end - start);
  }, 0);

  return result;
}

/**
 * Transform database order to UI-friendly Order
 * Adds calculated fields, maps status codes to stages
 */
async function transformOrder(dbOrder: DatabaseOrder): Promise<Order> {
  const preparingTiming = await calculatepreparingTiming(dbOrder.order_id);

  return {
    ...dbOrder,
    id: dbOrder.order_id, // Alias
    stage: mapStatusCodeToStage(dbOrder.status?.status_code || 'queue'),
    customer_phone: dbOrder.customer?.customer_phone || '',
    ...preparingTiming
  };
}

// ============= HOOK =============

export function useOrders(storeId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all order statuses once
  const fetchStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('order_status')
        .select('*')
        .order('sequence_order', { ascending: true });

      setStatuses(data || []);
    } catch (err: any) {
      console.error('Fetch statuses error:', err);
      setError(err.message);
    }
  }, []);

  // Get status by code
  const getStatusByCode = useCallback(
    (code: string) => {
      return statuses.find(s => s.status_code === code);
    },
    [statuses]
  );

  // Fetch and transform orders
  const fetchOrders = useCallback(async () => {
    if (!storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: dbOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customer_id(customer_id, customer_phone, name, email),
          status:status_id(status_id, status_code, status_name, sequence_order)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform each order (add preparing timing calculations)
      const transformedOrders = await Promise.all(
        (dbOrders || []).map(order => transformOrder(order as DatabaseOrder))
      );

      setOrders(transformedOrders);
      setError(null);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Initial fetch and subscriptions
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    if (!storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    fetchOrders();

    // Subscribe to order changes
    const channel = supabase
      .channel(`orders-store-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refetch to recalculate preparing times
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((order) => order.order_id !== payload.old.order_id)
            );
          }
        }
      )
      .subscribe();

    // Refresh preparing timers every second (for live timer display)
    const timerInterval = setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.stage === 'preparing' && order.preparing_started_at && !order.preparing_paused_at) {
            // Currently preparinging - update accumulated time
            const startTime = new Date(order.preparing_started_at).getTime();
            const now = Date.now();
            return {
              ...order,
              preparing_accumulated_ms: now - startTime
            };
          }
          return order;
        })
      );
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timerInterval);
    };
  }, [storeId, fetchOrders]);

  // Get or create customer
  const getOrCreateCustomer = useCallback(
    async (phoneNumber: string, name?: string, email?: string) => {
      try {
        const { data: existingCustomer, error: queryError } = await supabase
          .from('customer')
          .select('customer_id')
          .eq('customer_phone', phoneNumber)
          .single();

        if (existingCustomer) {
          return { customerId: existingCustomer.customer_id, error: null };
        }

        if (queryError && queryError.code !== 'PGRST116') {
          throw queryError;
        }

        const { data: newCustomer, error: createError } = await supabase
          .from('customer')
          .insert([{
            customer_phone: phoneNumber,
            name: name || null,
            email: email || null
          }])
          .select('customer_id')
          .single();

        if (createError) throw createError;

        return { customerId: newCustomer.customer_id, error: null };
      } catch (err: any) {
        return { customerId: null, error: err.message };
      }
    },
    []
  );

  // Create new order
  const addOrder = useCallback(
    async (orderData: {
      order_number: string;
      customer_phone: string;
      total_amount: number;
      customer_name?: string;
      customer_email?: string;
    }) => {
      if (!storeId) {
        return { data: null, error: 'No store selected' };
      }

      try {
        // Get or create customer
        const { customerId, error: customerError } = await getOrCreateCustomer(
          orderData.customer_phone,
          orderData.customer_name,
          orderData.customer_email
        );

        if (customerError || !customerId) {
          throw new Error(customerError || 'Failed to create/find customer');
        }

        // Get 'queue' status
        const queueStatus = getStatusByCode('queue');
        if (!queueStatus) {
          throw new Error('Queue status not found');
        }

        // Create order
        const { data: dbOrder, error } = await supabase
          .from('orders')
          .insert([{
            store_id: storeId,
            customer_id: customerId,
            status_id: queueStatus.status_id,
            order_number: orderData.order_number,
            total_amount: orderData.total_amount
          }])
          .select(`
            *,
            customer:customer_id(customer_id, customer_phone, name, email),
            status:status_id(status_id, status_code, status_name)
          `)
          .single();

        if (error) throw error;

        // Transform and add to state
        const transformedOrder = await transformOrder(dbOrder as DatabaseOrder);
        setOrders((prev) => [transformedOrder, ...prev]);

        return { data: transformedOrder, error: null };
      } catch (err: any) {
        return { data: null, error: err.message };
      }
    },
    [storeId, getOrCreateCustomer, getStatusByCode]
  );

  // Update order status (drag and drop)
  const updateOrderStatus = useCallback(
    async (orderId: string, newStage: OrderStage) => {
      try {
        // Map UI stage to database status code
        const statusCode = mapStageToStatusCode(newStage);
        const newStatus = getStatusByCode(statusCode);
        if (!newStatus) {
          throw new Error(`Status '${statusCode}' not found`);
        }

        const updatePayload: Record<string, string> = {
          status_id: newStatus.status_id,
          updated_at: new Date().toISOString()
        };

        // Update the order
        const { error } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('order_id', orderId);

        if (error) throw error;

        // The real-time subscription will handle the update
        return { error: null };
      } catch (err: any) {
        return { error: err.message };
      }
    },
    [getStatusByCode]
  );

  // Search orders
  const searchOrder = useCallback(
    async (orderNumber: string) => {
      if (!storeId) {
        return { data: null, error: 'No store selected' };
      }

      try {
        const { data: dbOrders, error } = await supabase
          .from('orders')
          .select(`
            *,
            customer:customer_id(customer_id, customer_phone, name, email),
            status:status_id(status_id, status_code, status_name)
          `)
          .eq('store_id', storeId)
          .ilike('order_number', `%${orderNumber}%`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformedOrders = await Promise.all(
          (dbOrders || []).map(order => transformOrder(order as DatabaseOrder))
        );

        return { data: transformedOrders, error: null };
      } catch (err: any) {
        return { data: null, error: err.message };
      }
    },
    [storeId]
  );

  // Delete order
  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, []);

  return {
    orders,
    statuses,
    loading,
    error,
    addOrder,
    updateOrderStatus,
    updateOrderStage: updateOrderStatus,
    searchOrder,
    deleteOrder,
    getStatusByCode,
    refetch: fetchOrders
  };
}
