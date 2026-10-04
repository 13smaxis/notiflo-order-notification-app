const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'https://notiflo-order-notification-app.onrender.com'
);

export const apiUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;