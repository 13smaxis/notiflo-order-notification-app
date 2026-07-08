
import 
{
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
  compact?: boolean;
}> = ({ stage, isActive, children, compact = false }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}                                                                                                            //- This line sets the reference for the droppable area, allowing the DnD library to track it.
      className={`
                  flex-1 flex flex-col 
                  min-h-0 h-full 
                  rounded-3xl 
                  border border-white/10
                  bg-slate-950/20
                  overflow-hidden
                  transition-all 
                  ${ isOver || isActive ? 'bg-slate-900/90 ring-2 ring-amber-400 shadow-lg' : '' }                                //- This line applies conditional styling based on whether the column is being hovered over or is active, changing its background and adding a ring and shadow for visual feedback.
                `}
    >
      <div className={
                        compact ? 
                  'z-20 mb-3 px-1 flex-shrink-0 pt-1' : 
                        'z-20 mb-2 px-1.5 flex-shrink-0 pt-1.5 md:mb-3 md:px-2 md:pt-2 flex justify-center'
                     }
      >
        <div className={
                          compact ? 
                          'bg-slate-900/95 backdrop-blur-sm rounded-full p-1.5' : 
                          'bg-slate-900/95 backdrop-blur-sm rounded-full p-2 md:p-3 w-fit max-w-full'
                       }
        >
          <div className={
                            compact ? 
                            'flex items-center gap-1' : 
                            'flex items-center justify-center gap-1 md:gap-2 min-w-0'
                         }
          >
            <div className={
                              compact ? 
                              'p-0.5 rounded-lg' : 
                              'p-1 rounded-lg md:p-1.5 shrink-0'
                           }
            >
              <StageIconKB stage={stage.id} 
                           className={
                                        compact ? 
                                        'w-3 h-3 text-white' : 
                                        'w-4 h-4 md:w-5 md:h-5 text-white'
                                     } 
              />
            </div>
            <div>
              <h3 className={
                              compact ? 
                              'font-bold text-[10px] text-white' : 
                              'font-bold text-[9px] leading-none tracking-tight text-center whitespace-nowrap text-white sm:text-[11px] md:text-lg'
                            }
              >
                {stage.title}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className={`
                        flex-1 flex flex-col 
                        gap-1 px-1 pb-1 md:gap-1.5 md:px-1.5 md:pb-1.5 
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
      <OrderCard order={order} onMoveOrder={() => {}} isDragging={isDragging || isDragActive} compact />
    </div>
  );
};

/*
 * KanbanBoard is a React functional component that represents the entire Kanban board.
 * It takes in an array of orders, a callback function for moving orders, and a loading state.
 * The component uses the DndContext from @dnd-kit/core to manage drag-and-drop functionality across the entire board.
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onMoveOrder, loading }) => {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStage, setActiveOrderStage] = useState<OrderStage | null>(null);
  const [overStageId, setOverStageId] = useState<OrderStage | null>(null);
  const [visibleCollectedOrders, setVisibleCollectedOrders] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 8 
      } 
    }),                                                                                                                           //- Sets up a pointer sensor for drag-and-drop interactions, with an activation constraint that requires the pointer to move at least 8 pixels before the drag action is recognized.
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 0, 
          tolerance: 0 
        } 
     })                                                                                                                           //- Sets up a touch sensor for drag-and-drop interactions on touch devices, with an activation constraint that requires no delay and a tolerance of 8 pixels before the drag action is recognized.
  );


  /*
   * This useEffect hook checks for orders that have been collected within the last 5 minutes.
   * It updates the visibleCollectedOrders state with the IDs of these orders
   * The check is performed every 10 seconds to ensure that the list of visible collected orders is up-to-date.
   */
  useEffect(() => {
    const checkCollectedOrders = () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; 

      const visible = new Set<string>();
      orders.forEach((order) => {
        if (order.stage === 'collected' && order.collected_at)                                                                    //- Checks if the order is in the 'collected' stage and has a collected_at timestamp.
        {
          const collectedTime = new Date(order.collected_at).getTime();
          if (now - collectedTime < fiveMinutes)                                                                                  //- Checks if the order was collected within the last 5 minutes
          {
            visible.add(order.id);
          }
        }
      });
      setVisibleCollectedOrders(visible);                                                                                         //- Updates the state with the IDs of orders that are still within the 5-minute visibility window.
    };

    checkCollectedOrders();
    const interval = setInterval(checkCollectedOrders, 10000);                                                                    //- Checks every 10 seconds to update the list of visible collected orders.
    return () => clearInterval(interval);                                                                                         //- Cleans up the interval when the component is unmounted to prevent memory leaks.
  }, [orders]);                                                                                                                   //- The effect runs whenever the orders array changes, ensuring that the visibility of collected orders is always accurate.

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
      if (activeOrderId && destinationStage && activeOrderStage && destinationStage !== activeOrderStage)                         //- Checks if the order is being moved to a different stage
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

    if (stage.id === 'collected')                                                                                                 //- Checks if the current stage is 'collected'. 
    {
    stageOrders = stageOrders.filter((order) => visibleCollectedOrders.has(order.id));                                            //- If it is, filter the orders to only include those that are still within the 5-minute.
    }

    /*
     * Sort the orders in each stage by their creation date.
     * This ensures that the orders are displayed in the order they were created, with the oldest orders appearing first.
     */
    stageOrders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();                                                                             //- Convert the created_at string of order 'a' to a Date object and get the time in milliseconds.
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });

    acc[stage.id] = stageOrders;                                                                                                  //- Assign the sorted orders for the current stage to the accumulator object, using the stage's id as the key.
    return acc;                                                                                                                   //- Return the accumulator for the next iteration of reduce.
  }, {} as Record<OrderStage, Order[]>);                                                                                          //- Initialize the accumulator as an object with keys of type OrderStage and values of type Order[].

  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null;                                                 //- Find the order that is currently being dragged by matching the activeOrderId with the order's id. If no matching order is found, return null.

  const renderStageColumn = (stage: typeof STAGES[0]) => (
    <StageColumn stage={stage} isActive={overStageId === stage.id}>
      {ordersByStage[stage.id].length === 0 ? (
        <div className="flex items-center justify-center py-8 text-white/40" />
      ) : (
        ordersByStage[stage.id].map((order) => (
          <DraggableOrderCard key={order.id} order={order} isDragging={activeOrderId === order.id} />
        ))
      )}
    </StageColumn>
  );

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
                        gap-1 p-1.5 md:gap-2 md:p-3 
                        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
                        h-full overflow-hidden 
                        rounded-3xl 
                        hide-scrollbar
                      "
      >
        {STAGES.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-1 min-w-0">
              {renderStageColumn(stage)}
            </div>
          </React.Fragment>
        ))}
      </div>

      <DragOverlay>
        {activeOrder ? <OrderCard order={activeOrder} onMoveOrder={() => {}} isDragging={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
}; 