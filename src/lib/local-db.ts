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

/**
 * Get all orders from local storage
 * @returns An array of Order objects
 */
function getAllOrders(): Order[]                                                                                //-TypeScript function that retunrns arrays(all orders from local storage)
{
  const raw = localStorage.getItem(ORDERS_KEY); 
  if (!raw) return [];                                                                                          //-If no orders stored, return empty array
  try {                                                                                                         //-Try to parse the stored orders
    const parsed = JSON.parse(raw) as Order[];                                                                  //-Parse the JSON string into an array of Order objects
    return Array.isArray(parsed) ? parsed : [];                                                                 //-Check if parsed data is an array, if not return empty array
  } catch {
    return [];                                                                                                  //-If parsing fails, return empty array
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
      grill_paused_at: null,
      grill_accumulated_ms: 0,
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
    grill_paused_at: null,
    grill_accumulated_ms: 0,
    previous_grill_ms: 0,
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

  // Handle grill timer - simple logic
  if (previousStage === 'grill' && newStage !== 'grill') {
    // Leaving grill: save current session time to previous_grill_ms
    if (updated.grill_started_at) {
      const elapsed = Date.now() - new Date(updated.grill_started_at).getTime();
      updated.previous_grill_ms = (updated.previous_grill_ms || 0) + elapsed;
      // Keep grill_started_at for search modal display, just pause it
      updated.grill_accumulated_ms = 0;
      updated.grill_paused_at = updated.updated_at;
    }
  } else if (newStage === 'grill' && previousStage !== 'grill') {
    // Moving to grill: always start a fresh timer
    updated.grill_started_at = updated.updated_at;
    updated.grill_accumulated_ms = 0;
    updated.grill_paused_at = null;
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
