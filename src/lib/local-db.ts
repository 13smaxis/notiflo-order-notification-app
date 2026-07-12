import { Order, OrderStage } from '@/types/order';

const ORDERS_KEY = 'notiflo_local_orders';
const SEEDED_KEY = 'notiflo_local_seeded_v2';

type LegacyPreparingOrder = Order & {
  legacy_preparing_started_at?: string | null;
  legacy_preparing_paused_at?: string | null;
  legacy_preparing_accumulated_ms?: number;
  legacy_previous_preparing_ms?: number;
};

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeOrder(order: LegacyPreparingOrder): Order {
  const stage = order.stage === 'preparing' ? 'preparing' : order.stage;
  return {
    ...order,
    stage,
    preparing_started_at: order.preparing_started_at ?? order.legacy_preparing_started_at ?? null,
    preparing_paused_at: order.preparing_paused_at ?? order.legacy_preparing_paused_at ?? null,
    preparing_accumulated_ms: order.preparing_accumulated_ms ?? order.legacy_preparing_accumulated_ms ?? 0,
    previous_preparing_ms: order.previous_preparing_ms ?? order.legacy_previous_preparing_ms ?? 0
  };
}

function getAllOrders(): Order[] {
  const raw = localStorage.getItem(ORDERS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LegacyPreparingOrder[];
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeOrder);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveAllOrders(normalized);
    }
    return normalized;
  } catch (error) {
    void error;
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
      preparing_started_at: null,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
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
      preparing_started_at: null,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1003',
      total_amount: 210.99,
      customer_phone: '+27 71 000 0003',
      stage: 'preparing',
      created_at,
      updated_at: created_at,
      preparing_started_at: created_at,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
      ready_at: null,
      collected_at: null,
      created_by: 'demo'
    },
    {
      id: uuid(),
      order_number: '1004',
      total_amount: 55.0,
      customer_phone: '+27 71 000 0004',
      stage: 'preparing',
      created_at,
      updated_at: created_at,
      preparing_started_at: created_at,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
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
      preparing_started_at: created_at,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
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
      preparing_started_at: created_at,
      preparing_paused_at: null,
      preparing_accumulated_ms: 0,
      previous_preparing_ms: 0,
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
    preparing_started_at: null,
    preparing_paused_at: null,
    preparing_accumulated_ms: 0,
    previous_preparing_ms: 0,
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
  const previousStage = updated.stage;
  updated.stage = newStage;
  updated.updated_at = nowISO();

  if (previousStage === 'preparing' && newStage !== 'preparing') {
    if (updated.preparing_started_at) {
      const elapsed = Date.now() - new Date(updated.preparing_started_at).getTime();
      updated.previous_preparing_ms = (updated.previous_preparing_ms || 0) + elapsed;
      updated.preparing_accumulated_ms = 0;
      updated.preparing_paused_at = updated.updated_at;
    }
  } else if (newStage === 'preparing' && previousStage !== 'preparing') {
    updated.preparing_started_at = updated.updated_at;
    updated.preparing_accumulated_ms = 0;
    updated.preparing_paused_at = null;
  }

  if (newStage === 'ready' && !updated.ready_at) updated.ready_at = updated.updated_at;
  if (newStage === 'collected' && !updated.collected_at) updated.collected_at = updated.updated_at;

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

export function searchOrdersLocal(query: string): Order[] {
  const q = query.trim().toLowerCase();
  if (!q) return listOrders();
  return listOrders().filter((o) =>
    o.order_number.toLowerCase().includes(q) ||
    o.customer_phone.toLowerCase().includes(q)
  );
}
