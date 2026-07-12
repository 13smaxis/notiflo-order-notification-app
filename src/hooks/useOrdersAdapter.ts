import { useOrders as useOrdersRemote } from '@/hooks/useOrders';
import { useAppContext } from '@/contexts/AppContext';


/*function isLocalMode() 
{
  const flag = (import.meta as any).env?.VITE_USE_LOCAL_DB;
  if (typeof flag === 'string')                                                                                                   //- Check if the flag is a string (from .env file)
  {
    return flag.toLowerCase() === 'true';                                                                                         //- If the string is 'false', return false (not local mode), otherwise return true (local mode)
  }
  
  const mode = (import.meta as any).env?.MODE || (import.meta as any).env?.DEV ? 'development' : 'production';
  return mode !== 'production';
}*/

export function useOrders() 
{
  const { storeId } = useAppContext();
  return useOrdersRemote(storeId);
}
