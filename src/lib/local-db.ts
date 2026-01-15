import { Order, OrderStage } from '@/types/order';

const ORDERS_KEY = 'moses_butchery_local_orders';
const SEEDED_KEY = 'moses_butchery_local_seeded_v1';

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  // Prefer Web Crypto if available
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  // Fallback
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getAllOrders(): Order[] {
  const raw = localStorage.getItem(ORDERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function seedDemoOrdersIfNeeded() {
  if (localStorage.getItem(SEEDED_KEY)) return;

  const created_at = nowISO();
  const orders: Order[] = [
    {
      id: uuid(),
      order_number: '1001',
      total_amount: 120.0,
      customer_phone: '+27 71 000 0001',
      stage: 'queue',
      created_at,
      updated_at: created_at,
      grill_started_at: null,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1002',
      total_amount: 85.5,
      customer_phone: '+27 71 000 0002',
      stage: 'queue',
      created_at,
      updated_at: created_at,
      grill_started_at: null,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1003',
      total_amount: 210.99,
      customer_phone: '+27 71 000 0003',
      stage: 'grill',
      created_at,
      updated_at: created_at,
      grill_started_at: created_at,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1004',
      total_amount: 55.0,
      customer_phone: '+27 71 000 0004',
      stage: 'grill',
      created_at,
      updated_at: created_at,
      grill_started_at: created_at,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1005',
      total_amount: 149.99,
      customer_phone: '+27 71 000 0005',
      stage: 'ready',
      created_at,
      updated_at: created_at,
      grill_started_at: created_at,
      ready_at: created_at,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1006',
      total_amount: 75.25,
      customer_phone: '+27 71 000 0006',
      stage: 'collected',
      created_at,
      updated_at: created_at,
      grill_started_at: created_at,
      ready_at: created_at,
      collected_at: created_at,
      created_by: 'demo'
    }
  ];

  saveAllOrders(orders);
  localStorage.setItem(SEEDED_KEY, 'true');
}

export function listOrders(): Order[] {
  return getAllOrders().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function addOrderLocal(input: {
  order_number: string;
  total_amount: number;
  customer_phone: string;
}): Order {
  const created_at = nowISO();
  const order: Order = {
    id: uuid(),
    order_number: input.order_number,
    total_amount: input.total_amount,
    customer_phone: input.customer_phone,
    stage: 'queue',
    created_at,
    updated_at: created_at,
    grill_started_at: null,
    ready_at: null,
    collected_at: null,
    created_by: 'demo'
  };

  const orders = getAllOrders();
  orders.unshift(order);
  saveAllOrders(orders);
  return order;
}

export function updateOrderStageLocal(orderId: string, newStage: OrderStage) {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return false;
  const updated = { ...orders[idx] };
  updated.stage = newStage;
  updated.updated_at = nowISO();
  if (newStage === 'grill') updated.grill_started_at = updated.updated_at;
  if (newStage === 'ready') updated.ready_at = updated.updated_at;
  if (newStage === 'collected') updated.collected_at = updated.updated_at;
  orders[idx] = updated;
  saveAllOrders(orders);
  return true;
}

export function deleteOrderLocal(orderId: string) {
  const orders = getAllOrders();
  const next = orders.filter((o) => o.id !== orderId);
  saveAllOrders(next);
  return true;
}

export function searchOrdersLocal(orderNumber: string): Order[] {
  const n = orderNumber.trim().toLowerCase();
  if (!n) return listOrders();
  return listOrders().filter((o) => o.order_number.toLowerCase().includes(n));
}
