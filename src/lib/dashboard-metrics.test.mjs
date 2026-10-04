import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeDashboardData } from './dashboard-metrics.mjs';

test('summarizes revenue, stages, employee totals, and notification outcomes', () => {
  const metrics = summarizeDashboardData(
    [
      {
        order_id: 'order-1',
        order_number: '101',
        total_amount: '120.50',
        created_at: '2026-10-04T09:00:00.000Z',
        created_by_employee_id: 'employee-1',
        status: { status_code: 'ready' },
      },
      {
        order_id: 'order-2',
        order_number: '102',
        total_amount: 79.5,
        created_at: '2026-10-04T10:00:00.000Z',
        created_by_employee_id: null,
        status: { status_code: 'queue' },
      },
      {
        order_id: 'order-3',
        order_number: '103',
        total_amount: 500,
        created_at: '2026-10-04T11:00:00.000Z',
        created_by_employee_id: 'employee-1',
        status: { status_code: 'cancelled' },
      },
    ],
    [
      { channel: 'sms', delivery_status: 'sent' },
      { channel: 'whatsapp', delivery_status: 'failed' },
      { channel: 'sms', delivery_status: 'sent' },
    ],
    [{ employee_id: 'employee-1', full_name: 'Jordan Lee' }]
  );

  assert.equal(metrics.orderCount, 3);
  assert.equal(metrics.activeOrderCount, 2);
  assert.equal(metrics.cancelledOrderCount, 1);
  assert.equal(metrics.revenue, 200);
  assert.equal(metrics.averageOrderValue, 100);
  assert.deepEqual(metrics.stageCounts.map(({ code, count }) => [code, count]), [
    ['queue', 1],
    ['ready', 1],
    ['cancelled', 1],
  ]);
  assert.deepEqual(metrics.employeeSales, [
    { employeeId: 'employee-1', name: 'Jordan Lee', orders: 1, revenue: 120.5 },
    { employeeId: 'unassigned', name: 'Unassigned', orders: 1, revenue: 79.5 },
  ]);
  assert.equal(metrics.notificationOutcomes.find((item) => item.channel === 'sms').count, 2);
  assert.equal(metrics.dailySales.length, 1);
});

test('handles empty datasets without NaN totals', () => {
  const metrics = summarizeDashboardData();

  assert.equal(metrics.orderCount, 0);
  assert.equal(metrics.revenue, 0);
  assert.equal(metrics.averageOrderValue, 0);
  assert.deepEqual(metrics.dailySales, []);
  assert.deepEqual(metrics.employeeSales, []);
});