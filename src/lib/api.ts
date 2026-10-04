const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'https://notiflo-order-notification-app.onrender.com'
);

export type ServerEventName =
  | 'auth.login.completed'
  | 'order.created'
  | 'kanban.order.drag_started'
  | 'kanban.order.dragged_over_stage'
  | 'kanban.order.drag_cancelled'
  | 'kanban.order.drop_ignored'
  | 'kanban.order.moved';

export interface ServerEventMetadata {
  orderId?: string;
  orderNumber?: string;
  storeId?: string;
  fromStage?: string;
  toStage?: string;
  durationMs?: number;
}

export const apiUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export const sendServerEvent = async (
  accessToken: string | null | undefined,
  eventType: ServerEventName,
  metadata: ServerEventMetadata = {}
) => {
  if (!accessToken) return;

  try {
    await fetch(apiUrl('/api/events'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventType, metadata }),
    });
  } catch {
    return;
  }
};