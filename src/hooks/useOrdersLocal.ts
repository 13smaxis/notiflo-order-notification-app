import { useEffect, useState, useCallback } from 'react';
import { Order, OrderStage } from '@/types/order';
import {
  seedDemoOrdersIfNeeded,
  listOrders,
  addOrderLocal,
  updateOrderStageLocal,
  searchOrdersLocal,
  deleteOrderLocal
} from '@/lib/local-db';

export function useOrdersLocal() 
{
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    try {
      setLoading(true);
      seedDemoOrdersIfNeeded();
      setOrders(listOrders());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'moses_butchery_local_orders') {
        setOrders(listOrders());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchOrders]);

  const sendSmsNotification = async (
    phoneNumber: string,
    orderNumber: string,
    stage: string
  ) => {
    // Demo no-op
    console.info('Demo SMS:', { phoneNumber, orderNumber, stage });
    return { success: true, data: { mocked: true } } as const;
  };

  const addOrder = async (orderData: {
    order_number: string;
    total_amount: number;
    customer_phone: string;
  }) => {
    try {
      const created = addOrderLocal(orderData);
      setOrders((prev) => [created, ...prev]);
      return { data: created, error: null as null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to add order' };
    }
  };

  const updateOrderStage = async (orderId: string, newStage: OrderStage) => {
    try {
      const ok = updateOrderStageLocal(orderId, newStage);
      if (!ok) throw new Error('Order not found');
      setOrders(listOrders());
      const order = orders.find((o) => o.id === orderId);
      if (newStage === 'ready' && order) {
        await sendSmsNotification(order.customer_phone, order.order_number, 'ready');
      }
      return { error: null as null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update order' };
    }
  };

  const searchOrder = async (orderNumber: string) => {
    try {
      const data = searchOrdersLocal(orderNumber);
      return { data, error: null as null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to search' };
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      deleteOrderLocal(orderId);
      setOrders(listOrders());
      return { error: null as null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to delete' };
    }
  };

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
