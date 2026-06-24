import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Order, OrderStage, STAGES } from '@/types/order';
import OrderCard from './OrderCard';
import { Clock, Flame, CheckCircle, ShoppingBag } from 'lucide-react';                                          //-Icons for stages

interface KanbanBoardProps 
{
  orders: Order[];
  onMoveOrder: (orderId: string, newStage: OrderStage) => void;
  loading: boolean;
}

/*
 * StageIcon component renders the appropriate icon for each order stage.
 * It uses the lucide-react icons for visual representation.
 * The icon size can be customized via the className prop.
 */
const StageIcon: React.FC<{ stage: OrderStage; className?: string }> = ({ stage, className }) => {
  const iconClass = className || 'w-5 h-5';
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

/*
 * KanbanBoard component renders the entire Kanban board with all stages and their respective orders.
 * It handles drag-and-drop functionality for moving orders between stages.
 * Manages the visibility of collected orders, ensuring they are only displayed for 5 minutes after collection.
 */
const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onMoveOrder, loading }) => {
  const [dragTargetStage, setDragTargetStage] = useState<OrderStage | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [visibleCollectedOrders, setVisibleCollectedOrders] = useState<Set<string>>(new Set());

  
  useEffect(() => {                                                                                             //-Filter collected orders that should still be visible (within 5 minutes)
    const checkCollectedOrders = () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      const visible = new Set<string>();
      orders.forEach((order) => {
        if (order.stage === 'collected' && order.collected_at) {
          const collectedTime = new Date(order.collected_at).getTime();
          if (now - collectedTime < fiveMinutes) {
            visible.add(order.id);
          }
        }
      });
      setVisibleCollectedOrders(visible);
    };

    checkCollectedOrders();
    const interval = setInterval(checkCollectedOrders, 10000);
    return () => clearInterval(interval);
  }, [orders]);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: OrderStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragTargetStage(stageId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, stageId: OrderStage) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) {
      onMoveOrder(orderId, stageId);
    }
    setDragTargetStage(null);
    setDraggedOrderId(null);
  }, [onMoveOrder]);

  const handleDragEnd = useCallback(() => {
    setDragTargetStage(null);
    setDraggedOrderId(null);
  }, []);

  // Group orders by stage
  const ordersByStage = STAGES.reduce((acc, stage) => {
    let stageOrders = orders.filter((order) => order.stage === stage.id);
    
    /*
     * Filter out collected orders that are no longer visible (older than 5 minutes)
     * This ensures that only recent collected orders are displayed in the Kanban board.
     * The visibleCollectedOrders set is updated every 10 seconds to reflect the current state.
     */
    if (stage.id === 'collected') 
    {
      stageOrders = stageOrders.filter((order) => visibleCollectedOrders.has(order.id));
    }
    
    stageOrders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Newest first for all stages
    });
    
    acc[stage.id] = stageOrders;
    return acc;
  }, {} as Record<OrderStage, Order[]>);

  if (loading)                                                                                                  //- Show loading state if orders are being fetched
  {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="
                            w-16 h-16 
                            border-4 border-amber-200 
                            rounded-full 
                            animate-pulse
                           " 
            />                                                                                                  //- Outer pulsing circle
            <div className="
                            absolute 
                            inset-0 w-16 h-16 
                            border-4 border-amber-500 border-t-transparent 
                            rounded-full 
                            animate-spin
                          " 
            />                                                                                                  //- Inner spinning circle
          </div>
          <p className="text-gray-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
                  flex w-full 
                  items-stretch
                  gap-0 p-2 
                  md:p-3 
                  bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
                  h-full 
                  overflow-y-auto 
                  rounded-3xl
                  hide-scrollbar
                "
      onDragEnd={handleDragEnd}
      onDragLeave={() => setDragTargetStage(null)}
    >                                                                                                           {/* Kanban Board Container */}
      {STAGES.map((stage, idx) => (
        <React.Fragment key={stage.id}>
          <div className="flex-1 flex flex-col min-h-0">
            <div
              className="sticky top-0 z-20 mb-3 px-2 flex-shrink-0"
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >                                                                                                   {/* Stage Heading */}
              <div className="bg-slate-900/95 backdrop-blur-sm rounded-full p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg">
                    <StageIcon stage={stage.id} className="w-5 h-5 text-white" />                             {/* Stage Icon */}
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-white">
                        {stage.title}
                    </h3>
                    {/* <p className="text-xs text-white/70">
                        {ordersByStage[stage.id].length} orders
                    </p> */}                                                                                      {/* Optional: Display order count per stage */}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="flex-1 flex flex-col gap-2 px-2 min-h-0"
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >                                                                                                   {/* Cards Container */}
              {ordersByStage[stage.id].length === 0 ? (
                <div className="flex items-center justify-center py-8 text-white/40">
                </div>
              ) : (
                ordersByStage[stage.id].map((order) => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('orderId', order.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`
                                transition-all 
                                duration-200 
                                cursor-grab 
                                active:cursor-grabbing 
                                ${draggedOrderId === order.id ? 'opacity-40 scale-95' : ''}
                              `}
                  >                                                                                             {/* Order Card */}
                    <OrderCard 
                      order={order} 
                      onMoveOrder={onMoveOrder}
                      isDragging={draggedOrderId === order.id}
                    />                                                                                          {/* Pass isDragging prop to OrderCard */}
                  </div>
                ))
              )}
            </div>
          </div>

          {idx < STAGES.length - 1 && (
            <div className="
                              w-1 
                              self-stretch 
                              min-h-full 
                              bg-gradient-to-b from-white/10 via-white/20 to-white/10 
                              mx-1 
                              flex-shrink-0
                            " 
            /> 
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default KanbanBoard;
