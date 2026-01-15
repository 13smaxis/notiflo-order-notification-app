import { useOrders as useOrdersRemote } from '@/hooks/useOrders';
import { useOrdersLocal } from '@/hooks/useOrdersLocal';

function isLocalMode() {
  const flag = (import.meta as any).env?.VITE_USE_LOCAL_DB;
  if (typeof flag === 'string') {
    return flag.toLowerCase() === 'true';
  }
  // Default to local in development when not explicitly disabled
  const mode = (import.meta as any).env?.MODE || (import.meta as any).env?.DEV ? 'development' : 'production';
  return mode !== 'production';
}

export function useOrders() {
  return isLocalMode() ? useOrdersLocal() : useOrdersRemote();
}
