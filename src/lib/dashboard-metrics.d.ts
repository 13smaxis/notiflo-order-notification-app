export interface DashboardOrder {
  order_id: string;
  order_number: string;
  total_amount: number | string | null;
  created_at: string;
  created_by_employee_id: string | null;
  status?: { status_code?: string | null; status_name?: string | null } | null;
}

export interface DashboardNotification {
  channel: string | null;
  delivery_status: string | null;
}

export interface DashboardProfile {
  employee_id: string | null;
  full_name: string | null;
}

export interface DashboardMetrics {
  orderCount: number;
  activeOrderCount: number;
  cancelledOrderCount: number;
  revenue: number;
  averageOrderValue: number;
  stageCounts: Array<{ code: string; name: string; count: number }>;
  dailySales: Array<{ date: string; orders: number; revenue: number }>;
  employeeSales: Array<{ employeeId: string; name: string; orders: number; revenue: number }>;
  notificationOutcomes: Array<{ channel: string; status: string; count: number }>;
  recentOrders: DashboardOrder[];
}

export function summarizeDashboardData(
  orders?: DashboardOrder[],
  notifications?: DashboardNotification[],
  profiles?: DashboardProfile[]
): DashboardMetrics;