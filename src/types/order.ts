import { ReactNode } from "react";

export type OrderStage = 'queue' | 'preparing' | 'ready' | 'collected';

// ============= DATABASE TYPES (from Supabase) =============

export interface OrderStatus {
  status_id: string;
  status_code: string;                                                                                                            //- 'queue', 'preparing', 'ready', 'collected'
  status_name: string;
  sequence_order?: number;
  created_at: string;
}

export interface Customer {
  customer_id: string;
  customer_phone: string;                                                                                                         //- Mandatory SA phone number format: 0XXXXXXXXX
  name?: string;                                                                                                                  //- Optional field for customer name
  email?: string;                                                                                                                 //- Optional field for customer email
  created_at: string;
}

export interface StatusHistory {
  history_id: string;
  order_id: string;
  status_id: string;
  changed_at: string;
  status?: OrderStatus;                                                                                                           //-Optional join
}

export interface DatabaseOrder {
  order_id?: string;
  store_id?: string;
  customer_id?: string;
  status_id?: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  ready_at?: string | null;
  collected_at?: string | null;
  // Joins
  customer?: Customer;
  status?: OrderStatus;
}

// ============= UI-FRIENDLY TYPE (calculated fields) =============

export interface Order extends DatabaseOrder {
  // Mapped from database
  id: string;                                                                                                                     //-Alias for order_id
  stage: OrderStage;                                                                                                              //-Mapped: 'preparing' → 'preparing', others stay same
  customer_phone: string;                                                                                                         //-From customer join
  
  // Calculated from status_history
  preparing_started_at: string | null;                                                                                            //-When status changed to 'preparing'
  preparing_paused_at: string | null;                                                                                             //-When status changed FROM 'preparing'
  preparing_accumulated_ms: number;                                                                                               //-Current preparing session duration (ms)
  previous_preparing_ms: number;                                                                                                  //-Total from previous preparing sessions (ms)
  created_by?: string | null;
  
  // Timestamps for UI (calculated or from status_history)
  ready_at: string | null;                                                                                                        //-When status changed to 'ready'
  collected_at: string | null;                                                                                                    //-When status changed to 'collected'
}

// ============= HELPER TYPES =============

export interface Staff {
  role: ReactNode;
  full_name: string;
  auth_user_id: string;
  email: string;
  profile: Profile;
}

export interface Profile {
  auth_user_id: string;
  store_id?: string;
  role?: string;
  full_name?: string;
  store_name?: string;
  store_number?: number;
  store_phone?: string;
  shop_name?: string;
  shop_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  store_id: string;
  store_number: number;
  store_name: string;
  store_phone?: string;
  created_at: string;
  updated_at: string;
}

// ============= UI CONFIGURATION (unchanged) =============

export interface StageConfig {
  id: OrderStage;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const STAGES: StageConfig[] = [
  {
    id: 'queue',
    title: 'Queue',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    icon: 'clock'
  },
  {
    id: 'preparing',                                                                                                          
    title: 'Preparing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: 'flame'
  },
  {
    id: 'ready',
    title: 'Ready',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: 'check'
  },
  {
    id: 'collected',
    title: 'Collected',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'bag'
  }
];

// ============= MAPPING UTILITIES =============

/**
 * Map database status_code to UI OrderStage
 * 'preparing' → 'preparing', others stay same
 */
export function mapStatusCodeToStage(statusCode: string): OrderStage {
  switch (statusCode) {
    case 'preparing':
      return 'preparing';
    case 'queue':
    case 'ready':
    case 'collected':
      return statusCode as OrderStage;
    default:
      return 'queue';
  }
}

/**
 * Map UI OrderStage to database status_code
 * 'preparing' → 'preparing', others stay same
 */
export function mapStageToStatusCode(stage: OrderStage): string {
  switch (stage) {
    case 'preparing':
      return 'preparing';
    default:
      return stage;
  }
}
