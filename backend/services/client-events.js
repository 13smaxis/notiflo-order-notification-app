const allowedStages = new Set(['queue', 'preparing', 'ready', 'collected']);

const eventFields = {
  'auth.login.completed': ['storeId'],
  'order.created': ['orderId', 'orderNumber', 'storeId'],
  'kanban.order.drag_started': ['orderId', 'storeId', 'fromStage'],
  'kanban.order.dragged_over_stage': ['orderId', 'storeId', 'fromStage', 'toStage'],
  'kanban.order.drag_cancelled': ['orderId', 'storeId', 'fromStage', 'durationMs'],
  'kanban.order.drop_ignored': ['orderId', 'storeId', 'fromStage', 'toStage', 'durationMs'],
  'kanban.order.moved': ['orderId', 'storeId', 'fromStage', 'toStage', 'durationMs'],
};

export const normalizeClientEvent = ({ eventType, metadata, userId }) => {
  const allowed = Object.hasOwn(eventFields, eventType) ? eventFields[eventType] : null;
  if (!allowed || !userId) return null;

  const normalized = { userId };
  for (const field of allowed) {
    const value = metadata?.[field];

    if (field === 'fromStage' || field === 'toStage') {
      if (allowedStages.has(value)) normalized[field] = value;
      continue;
    }

    if (field === 'durationMs') {
      if (Number.isFinite(value) && value >= 0 && value <= 86_400_000) {
        normalized[field] = value;
      }
      continue;
    }

    if (typeof value === 'string' && value.length > 0 && value.length <= 128) {
      normalized[field] = value;
    }
  }

  return { eventType, ...normalized };
};