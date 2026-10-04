const stageLabels = {
  queue: 'Queue',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

const toMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const summarizeDashboardData = (orders = [], notifications = [], profiles = []) => {
  const cancelledOrders = orders.filter((order) => order.status?.status_code === 'cancelled');
  const salesOrders = orders.filter((order) => order.status?.status_code !== 'cancelled');
  const revenue = salesOrders.reduce((total, order) => total + toMoney(order.total_amount), 0);

  const stageCounts = new Map(Object.keys(stageLabels).map((code) => [code, 0]));
  const dailySales = new Map();
  const employeeProfiles = new Map(
    profiles
      .filter((profile) => profile.employee_id)
      .map((profile) => [profile.employee_id, profile.full_name?.trim() || 'Employee'])
  );
  const employeeSales = new Map();

  for (const order of orders) {
    const statusCode = order.status?.status_code || 'other';
    stageCounts.set(statusCode, (stageCounts.get(statusCode) || 0) + 1);

    if (statusCode === 'cancelled') continue;

    const amount = toMoney(order.total_amount);
    const day = dateKey(order.created_at);
    const daily = dailySales.get(day) || { date: day, orders: 0, revenue: 0 };
    daily.orders += 1;
    daily.revenue += amount;
    dailySales.set(day, daily);

    const employeeId = order.created_by_employee_id || 'unassigned';
    const employee = employeeSales.get(employeeId) || {
      employeeId,
      name: employeeId === 'unassigned' ? 'Unassigned' : employeeProfiles.get(employeeId) || 'Employee',
      orders: 0,
      revenue: 0,
    };
    employee.orders += 1;
    employee.revenue += amount;
    employeeSales.set(employeeId, employee);
  }

  const notificationOutcomes = new Map();
  for (const notification of notifications) {
    const channel = notification.channel || 'other';
    const status = notification.delivery_status || 'unknown';
    const key = `${channel}:${status}`;
    const item = notificationOutcomes.get(key) || { channel, status, count: 0 };
    item.count += 1;
    notificationOutcomes.set(key, item);
  }

  return {
    orderCount: orders.length,
    activeOrderCount: salesOrders.length,
    cancelledOrderCount: cancelledOrders.length,
    revenue,
    averageOrderValue: salesOrders.length ? revenue / salesOrders.length : 0,
    stageCounts: [...stageCounts.entries()]
      .filter(([, count]) => count > 0)
      .map(([code, count]) => ({ code, name: stageLabels[code] || 'Other', count })),
    dailySales: [...dailySales.values()].sort((a, b) => a.date.localeCompare(b.date)),
    employeeSales: [...employeeSales.values()].sort((a, b) => b.revenue - a.revenue),
    notificationOutcomes: [...notificationOutcomes.values()],
    recentOrders: [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
  };
};