
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Flame, ShoppingBag } from 'lucide-react';
import { OrderCard } from './OrderCard';
import { Order, OrderStage, STAGES } from '@/types/order';

/*
 * These are the properties that the KanbanBoard component expects to receive from its parent component.
 * - orders: An array of Order objects representing the current orders in the system.
 * - onMoveOrder: A callback function that is called when an order is moved from one stage to another.
 * - loading: A boolean indicating whether the orders are currently being loaded.
 */
interface KanbanBoardProps 
{
  orders: Order[];
  onMoveOrder: (orderId: string, newStage: OrderStage) => void;
  loading: boolean;
}

const StageIconKB: React.FC<{ stage: OrderStage; className?: string }> = ({ stage, className }) => {
  const iconClass = className || 'w-5 h-5';
  switch (stage) 
  {
    case 'queue':
      return <Clock className={iconClass} />;
    case 'preparing':
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
 * StageColumn is a React functional component that represents a single column in the Kanban board.
 * It takes in a stage object, a boolean indicating if the column is active.
 * The component uses the useDroppable hook from @dnd-kit/core to make the column droppable for drag-and-drop functionality.
 */
const StageColumn: React.FC<{
  stage: typeof STAGES[0];
  isActive: boolean;
  children: React.ReactNode;
}> = ({ stage, isActive, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}                                                                                                            //- This line sets the reference for the droppable area, allowing the DnD library to track it.
      className={`
                  flex-1 flex flex-col 
                  min-h-0 
                  rounded-3xl 
                  border border-white/10
                  bg-slate-950/20
                  overflow-hidden
                  transition-all 
                  ${ isOver || isActive ? 'bg-slate-900/90 ring-2 ring-amber-400 shadow-lg' : '' }                                //- This line applies conditional styling based on whether the column is being hovered over or is active, changing its background and adding a ring and shadow for visual feedback.
                `}
    >
      <div className="z-20 mb-3 px-2 flex-shrink-0 pt-2">
        <div className="bg-slate-900/95 backdrop-blur-sm rounded-full p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg">
              <StageIconKB stage={stage.id} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-white">{stage.title}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className={`
                        flex-1 flex flex-col 
                        gap-2 px-2 pb-2 
                        min-h-0 overflow-y-auto 
                        hide-scrollbar 
                        ${isOver || isActive ? 'rounded-3xl p-2' : ''}
                    `}
      >
        {children}
      </div>
    </div>
  );
};


/*
 * DraggableOrderCard is a React functional component that represents a single order card that can be dragged and dropped.
 * It takes in an order object and a boolean indicating if the card is currently being dragged.
 * The component uses the useDraggable hook from @dnd-kit/core to make the card draggable.
 */
const DraggableOrderCard: React.FC<{ order: Order; isDragging: boolean }> = ({ order, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDragActive } = useDraggable({
    id: order.id,                                                                                                                 //-Using id alias (order_id)
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging || isDragActive ? 'opacity-0' : ''
      }`}
    >
      <OrderCard order={order} onMoveOrder={() => {}} isDragging={isDragging || isDragActive} />
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onMoveOrder, loading }) => {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStage, setActiveOrderStage] = useState<OrderStage | null>(null);
  const [overStageId, setOverStageId] = useState<OrderStage | null>(null);
  const [visibleCollectedOrders, setVisibleCollectedOrders] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 75, tolerance: 5 } })
  );

  // Hide collected orders after 5 minutes
  useEffect(() => {
    const checkCollectedOrders = () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      const visible = new Set<string>();
      orders.forEach((order) => {
        if (order.stage === 'collected' && order.collected_at) 
        {
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

  const getStageIdFromDragId = useCallback(
    (id: string | null): OrderStage | null => {
      if (!id) return null;
      if (STAGES.some((stage) => stage.id === id)) return id as OrderStage;
      const order = orders.find((o) => o.id === id);
      return order?.stage ?? null;
    },
    [orders]
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const orderId = active.id as string;
      setActiveOrderId(orderId);
      const order = orders.find((o) => o.id === orderId);
      setActiveOrderStage(order?.stage ?? null);
    },
    [orders]
  );

  const handleDragOver = useCallback(
    ({ over }: DragOverEvent) => {
      setOverStageId(getStageIdFromDragId(over?.id as string | null));
    },
    [getStageIdFromDragId]
  );

  const handleDragEnd = useCallback(
    ({ over }: DragEndEvent) => {
      const destinationStage = getStageIdFromDragId(over?.id as string | null);
      if (activeOrderId && destinationStage && activeOrderStage && destinationStage !== activeOrderStage) 
      {
        onMoveOrder(activeOrderId, destinationStage);
      }

      setActiveOrderId(null);
      setActiveOrderStage(null);
      setOverStageId(null);
    },
    [activeOrderId, activeOrderStage, getStageIdFromDragId, onMoveOrder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveOrderId(null);
    setActiveOrderStage(null);
    setOverStageId(null);
  }, []);

  const ordersByStage = STAGES.reduce((acc, stage) => {
    let stageOrders = orders.filter((order) => order.stage === stage.id);

    if (stage.id === 'collected') {
      stageOrders = stageOrders.filter((order) => visibleCollectedOrders.has(order.id));
    }

    stageOrders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    acc[stage.id] = stageOrders;
    return acc;
  }, {} as Record<OrderStage, Order[]>);

  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-200 rounded-full animate-pulse" />
            <div className="
                              absolute 
                              inset-0 
                              w-16 h-16 
                              border-4 border-amber-500 border-t-transparent 
                              rounded-full 
                              animate-spin
                            " 
            />
          </div>
          <p className="text-gray-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="
                      flex w-full 
                      items-stretch 
                      gap-2 p-2 md:p-3 
                      bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
                      h-full overflow-hidden 
                      rounded-3xl 
                      hide-scrollbar
                    "
      >
        {STAGES.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <StageColumn stage={stage} isActive={overStageId === stage.id}>
              {ordersByStage[stage.id].length === 0 ? (
                <div className="flex items-center justify-center py-8 text-white/40"></div>
              ) : (
                ordersByStage[stage.id].map((order) => (
                  <DraggableOrderCard
                    key={order.id}
                    order={order}
                    isDragging={activeOrderId === order.id}
                  />
                ))
              )}
            </StageColumn>
          </React.Fragment>
        ))}
      </div>

      <DragOverlay>
        {activeOrder ? <OrderCard order={activeOrder} onMoveOrder={() => {}} isDragging={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
}; 