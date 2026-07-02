
import { Order, OrderStage, STAGES } from '@/types/order';
import { Clock, Flame, CheckCircle, ShoppingBag, Phone, Calendar, Timer } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onMoveOrder: (orderId: string, newStage: OrderStage) => void;
  isDragging?: boolean;
}

const StageIcon: React.FC<{ stage: OrderStage; className?: string }> = ({ stage, className }) => {
  const iconClass = className || 'w-4 h-4';
  switch (stage) {
    case 'queue':
      return <Clock className={iconClass} />;
    case 'grill':
      return <Flame className={iconClass} />;
    case 'ready':
      return <CheckCircle className={iconClass} />;
    case 'collected':
      return <ShoppingBag className={iconClass} />;
    default:
      return null;
  }
};

const GrillTimer: React.FC<{ 
  accumulatedMs: number; 
  previousMs: number; 
  isRunning: boolean;
}> = ({ accumulatedMs, previousMs, isRunning }) => {
  const totalMs = accumulatedMs + previousMs;
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const getTimerColor = () => {
    if (minutes >= 15) return 'text-red-700 bg-red-100 border border-red-300';
    if (minutes >= 10) return 'text-orange-700 bg-orange-100 border border-orange-300';
    return 'text-amber-700 bg-amber-100 border border-amber-300';
  };

  return (
    <div className={`flex items-center gap-0.5 ${getTimerColor()} px-1 py-0.5 rounded-lg font-mono text-[8px] font-bold`}>
      <Timer className={`w-2 h-2 ${isRunning ? 'animate-pulse' : ''}`} />
      <span className="tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onMoveOrder, isDragging }) => {
  const stageConfig = STAGES.find((s) => s.id === order.stage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div
      className={`
        bg-white rounded-lg overflow-hidden cursor-grab active:cursor-grabbing
        transition-all duration-300 select-none touch-none shadow-md hover:shadow-lg
        hover:-translate-y-0.5 ${isDragging ? 'shadow-lg scale-105 rotate-1 opacity-95 z-50' : ''}
      `}
    >
      <div className="p-1.5 sm:p-2">
        {/* Header with order number and stage */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs sm:text-sm font-black text-gray-800 font-mono tracking-tight">
            #{order.order_number}
          </span>
          <div
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${stageConfig?.bgColor} ${stageConfig?.color}`}
          >
            <StageIcon stage={order.stage} className="w-2 h-2" />
            <span className="hidden sm:inline">{stageConfig?.title}</span>
          </div>
        </div>

        {/* Order details */}
        <div className="space-y-0.25 mb-1">
          <div className="flex items-center gap-1 text-gray-600 text-[10px]">
            <Calendar className="w-2 h-2 flex-shrink-0" />
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 text-[10px]">
            <Phone className="w-2 h-2 flex-shrink-0" />
            <span className="font-medium truncate text-[9px]">{order.customer_phone}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg px-1.5 py-1 mb-1 border border-amber-100">
          <span className="text-xs font-black text-amber-800 font-mono tracking-tight">
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {/* Grill timer (only show if in grill stage) */}
        {order.stage === 'grill' && (
          <GrillTimer
            accumulatedMs={order.grill_accumulated_ms}
            previousMs={order.previous_grill_ms}
            isRunning={!order.grill_paused_at}
          />
        )}
      </div>
    </div>
  );
};
