import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStage } from '@/types/order';

export function useOrders() 
{
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try 
    {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } 
    catch (err: any) 
    {
      setError(err.message);
    } 
    finally 
    {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    
    fetchOrders();                                                                                              //-Calles the method that brings back all the orders
    
    const channel = supabase                                                                                    //-Set up real-time subscription
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') 
          {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } 
          else if (payload.eventType === 'UPDATE') 
          {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id ? (payload.new as Order) : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((order) => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Send SMS notification via edge function
  const sendSmsNotification = async (phoneNumber: string, orderNumber: string, stage: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-sms', {
        body: { phoneNumber, orderNumber, stage }
      });

      if (error) {
        console.error('SMS notification error:', error);
        return { success: false, error: error.message };
      }

      console.log('SMS notification result:', data);
      return { success: true, data };
    } catch (err: any) {
      console.error('SMS notification failed:', err);
      return { success: false, error: err.message };
    }
  };

  const addOrder = async (orderData: {
    order_number: string;
    total_amount: number;
    customer_phone: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{ ...orderData, stage: 'queue' }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  const updateOrderStage = async (orderId: string, newStage: OrderStage) => {
    try {
      // Find the order to get phone number
      const order = orders.find(o => o.id === orderId);

      const updates: any = {
        stage: newStage,
        updated_at: new Date().toISOString()
      };

      // Set timestamps based on stage
      if (newStage === 'grill') {
        updates.grill_started_at = new Date().toISOString();
      } else if (newStage === 'ready') {
        updates.ready_at = new Date().toISOString();
      } else if (newStage === 'collected') {
        updates.collected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Send SMS notification when order is ready
      if (newStage === 'ready' && order) {
        await sendSmsNotification(order.customer_phone, order.order_number, 'ready');
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const searchOrder = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('order_number', `%${orderNumber}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  };

  const deleteOrder = async (orderId: string) => {
    try 
    {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  /*
   * 
   */
  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrderStage,
    searchOrder,
    deleteOrder,
    refetch: fetchOrders,
    sendSmsNotification
  };
}
