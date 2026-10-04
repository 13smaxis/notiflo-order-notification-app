import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { summarizeDashboardData, type DashboardMetrics } from '@/lib/dashboard-metrics.mjs';

const emptyMetrics = summarizeDashboardData();

const getRangeBounds = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const endExclusive = new Date(`${endDate}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return {
    from: start.toISOString(),
    to: endExclusive.toISOString(),
  };
};

export function useDashboardData(storeId: string | null, startDate: string, endDate: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(Boolean(storeId));
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!storeId) {
      setMetrics(emptyMetrics);
      setLoading(false);
      setError(null);
      setWarnings([]);
      return;
    }

    let active = true;
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      setWarnings([]);

      try {
        const range = getRangeBounds(startDate, endDate);
        const [ordersResult, notificationsResult, profilesResult] = await Promise.all([
          supabase
            .from('orders')
            .select(`
              order_id,
              order_number,
              total_amount,
              created_at,
              created_by_employee_id,
              status:status_id(status_code, status_name)
            `)
            .eq('store_id', storeId)
            .or('is_deleted.is.null,is_deleted.eq.false')
            .gte('created_at', range.from)
            .lt('created_at', range.to)
            .order('created_at', { ascending: false }),
          supabase
            .from('notification')
            .select('notification_id, channel, delivery_status, created_at, orders!inner(store_id)')
            .eq('orders.store_id', storeId)
            .gte('created_at', range.from)
            .lt('created_at', range.to),
          supabase
            .from('profile')
            .select('employee_id, full_name')
            .eq('store_id', storeId)
            .not('employee_id', 'is', null),
        ]);

        if (ordersResult.error) throw ordersResult.error;

        const partialWarnings = [
          notificationsResult.error ? 'Notification reporting is unavailable for this account.' : null,
          profilesResult.error ? 'Employee names are unavailable; attributed orders may appear under Employee.' : null,
        ].filter((warning): warning is string => Boolean(warning));

        if (active) {
          setMetrics(summarizeDashboardData(
            ordersResult.data || [],
            notificationsResult.error ? [] : notificationsResult.data || [],
            profilesResult.error ? [] : profilesResult.data || []
          ));
          setWarnings(partialWarnings);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
          setMetrics(emptyMetrics);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadMetrics();
    return () => { active = false; };
  }, [endDate, startDate, storeId]);

  return { metrics, loading, error, warnings };
}