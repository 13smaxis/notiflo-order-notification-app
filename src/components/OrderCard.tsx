import React, { useState, useEffect } from 'react';
import { Order, OrderStage, STAGES } from '@/types/order';
import { Clock, Flame, CheckCircle, ShoppingBag, Phone, Calendar, Timer } from 'lucide-react';

interface OrderCardProps 
{
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

const GrillTimer: React.FC<{ startTime: string; pausedTime?: string; accumulatedMs?: number; isOnGrill?: boolean }> 
                  = ({ startTime, pausedTime, accumulatedMs = 0, isOnGrill = false }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      let totalMs: number;
      if (pausedTime) {
        // Timer is paused - show accumulated time
        totalMs = accumulatedMs;
      } else if (isOnGrill) {
        // Timer is running preparing - calculate from start time
        const start = new Date(startTime).getTime();
        const now = Date.now();
        totalMs = now - start;
      } else {
        // Not preparing and not paused - shouldn't happen but show accumulated
        totalMs = accumulatedMs;
      }
      setElapsed(Math.floor(totalMs / 1000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, pausedTime, accumulatedMs, isOnGrill]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  // Color changes based on time
  const getTimerColor = () => {
    if (minutes >= 15) return 'text-red-700 bg-red-100 border border-red-300';
    if (minutes >= 10) return 'text-orange-700 bg-orange-100 border border-orange-300';
    return 'text-amber-700 bg-amber-100 border border-amber-300';
  };

  return (
    <div className={`
                      flex items-center 
                      gap-0.5 
                      ${getTimerColor()} px-1 py-0.5 rounded-lg font-mono text-[8px] font-bold
                    `}
    >
      <Timer className={`w-2 h-2 ${pausedTime ? '' : 'animate-pulse'}`} />
      <span className="tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {pausedTime && <span className="text-[7px] ml-0.5">⏸</span>}
    </div>
  );
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onMoveOrder, isDragging }) => {
  const stageConfig = STAGES.find((s) => s.id === order.stage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit'
      });
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
        bg-white rounded-lg
        overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300
        select-none touch-none
        shadow-md hover:shadow-lg hover:-translate-y-0.5
        ${isDragging ? 'shadow-lg scale-105 rotate-1 opacity-95 z-50' : ''}
      `}
    >

      <div className="p-1.5 sm:p-2">
        <div className="flex items-center justify-between mb-1">                                                {/* Header with order number */}
          <span className="
                            text-xs 
                            sm:text-sm 
                            font-black 
                            text-gray-800 font-mono 
                            tracking-tight
                          "
          >
              #{order.order_number}
          </span>
          <div className={`
                            flex items-center 
                            gap-0.5 
                            px-1 py-0.5 
                            rounded-full 
                            text-[9px] 
                            sm:text-[10px] font-bold uppercase 
                            tracking-wider 
                            ${stageConfig?.bgColor} ${stageConfig?.color}
                          `}
          >
            <StageIcon stage={order.stage} className="w-2 h-2" />
              <span className="hidden sm:inline">
                {stageConfig?.title}
              </span>
          </div>
        </div>

        <div className="space-y-0.25 mb-1">                                                                     {/* Order details */}
          <div className="flex items-center gap-1 text-gray-600 text-[10px]">
            <Calendar className="w-2 h-2 flex-shrink-0" />
              <span>
                {formatDate(order.created_at)}
              </span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 text-[10px]">
            <Phone className="w-2 h-2 flex-shrink-0" />
              <span className="font-medium truncate text-[9px]">
                {order.customer_phone}
              </span>
          </div>
        </div>

        <div className="
                        bg-gradient-to-br 
                        from-amber-50 to-orange-50 
                        rounded-lg 
                        px-1.5 py-1 
                        mb-1 
                        border border-amber-100
                      "
        >                                                                                                       {/* Amount */}
          <span className="text-xs font-black text-amber-800 font-mono tracking-tight">
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        
        <div className="space-y-0.5 mb-0.5">                                                                    {/* Timers */}
          {/* Previous preparing time (paused) */}
          {order.previous_grill_ms > 0 && (
            <div className="
                            flex items-center 
                            gap-0.5 
                            text-gray-600 
                            bg-gray-100 
                            border border-gray-300 
                            px-1 py-0.5 
                            rounded-lg 
                            font-mono 
                            text-[8px]
                          "
            >
              <Timer className="w-2 h-2" />
                <span className="text-[8px] opacity-60">Prev:</span>
                  <span className="font-bold tabular-nums">
                      {String(Math.floor(order.previous_grill_ms / 60000)).padStart(2, '0')}:
                      {String(Math.floor((order.previous_grill_ms % 60000) / 1000)).padStart(2, '0')}
                  </span>
              <span className="text-[8px]">⏸</span>
            </div>
          )}
          {/* Current grill timer */}
          {order.grill_started_at && order.stage === 'grill' && (
            <GrillTimer 
              startTime={order.grill_started_at}
              pausedTime={null}
              accumulatedMs={0}
              isOnGrill={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
