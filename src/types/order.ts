export type OrderStage = 'queue' | 'grill' | 'ready' | 'collected';

export interface Order 
{
  id: string;
  order_number: string;
  total_amount: number;
  customer_phone: string;
  stage: OrderStage;
  created_at: string;
  updated_at: string;
  grill_started_at: string | null;
  grill_paused_at: string | null;
  grill_accumulated_ms: number;
  previous_grill_ms: number;                                                                                    //-Total time from previous grill sessions
  ready_at: string | null;
  collected_at: string | null;
  created_by: string | null;
}

export interface Staff 
{
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login: string | null;
}

export interface StageConfig 
{
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
    id: 'grill',
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
