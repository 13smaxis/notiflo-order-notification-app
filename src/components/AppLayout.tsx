
import React, { useState, useEffect } from 'react';                                                             //-useState = remember something, run code on component load
import { useAppContext } from '@/contexts/AppContext';                                                          //-Custom hook to access app context
import { useIsMobile } from '@/hooks/use-mobile';                                                               //-Custom hook to detect mobile devices
import { useOrders } from '@/hooks/useOrdersAdapter';                                                           //-Custom hook to manage orders data and actions
import { useAuth } from '@/hooks/useAuth';                                                                      //-Custom hook to manage authentication
import { OrderStage, STAGES } from '@/types/order';                                                             //-Order stages and metadata
import Header from './Header';
import KanbanBoard from './KanbanBoard';                                                                        //-Kanban board component to display orders in stages
import AddOrderModal from './AddOrderModal';
import SearchModal from './SearchModal';
import LoginModal from './LoginModal';
import { Plus, AlertCircle, RefreshCw, CheckCircle, X } from 'lucide-react';                                    //-Icons from lucide-react
import { join } from 'path';                                                                                    //-Node.js path module for handling file paths

/**
 * Defines the component's props/properties.
 * Used for type checking and IntelliSense support.
 */
interface ToastProps                                                                                          
{
  message: string;                                                                                              //-Data type for the message to display in the toast
  type: 'success' | 'error' | 'info';                                                                           //-Determines color
  onClose: () => void;                                                                                          //-Called when toast is dismissed
}

/**
 * Defines the Toast notification component.
 * React.FC = React Functional Component (Gives typescript info about the component like props)
 */
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {                                                                                             //-Auto close with useEffect hook
    const timer = setTimeout(onClose, 3000);                                                                    //-Sets a timer to automatically close the toast after 3 seconds
    return () => clearTimeout(timer);                                                                           //-Cleans up the timer if the component unmounts early
  }, [onClose]);                                                                                                //-Dependency array to avoid re-running effect unnecessarily

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';        //-Custom background color based on type

  
  return (
    <div className={`
                      fixed bottom-20 left-1/2 -translate-x-1/2 ${bgColor} 
                      text-white 
                      px-6 py-3 
                      rounded-xl 
                      shadow-xl flex 
                      items-center 
                      gap-3 z-50
                      animate-in fade-in slide-in-from-bottom-4 
                      duration-300
                   `}
    >                                                                                                           {/* Sets background color based on toast type */ }
      <CheckCircle className="w-5 h-5" /> 
      <span className="font-medium">{message}</span>
      <button onClick={onClose} 
              className="ml-2 hover:bg-white/20 rounded-full p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * AppLayout is a functional React component that serves as the main layout for the application.
 * It includes the header, kanban board, modals for adding and searching orders, login modal, toast notifications and footer.
 * The function returns JSX that defines the structure and behavior of the layout.
 */
const AppLayout: React.FC = () => {
  //Contexts
  const { sidebarOpen, toggleSidebar } = useAppContext();                                                       //-Pulls sidebar state and toggle function from app context
  const isMobile = useIsMobile();                                                                               //-Custom hook to detect if the device is mobile

  //Local state to control modals, login, prompts, and toasts notifications
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false);                                            //-Starts the add order modal as closed and memorises its state
  const [searchModalOpen, setSearchModalOpen] = useState(false);                                                //-Starts the search modal as closed and memorises its state
  const [loginModalOpen, setLoginModalOpen] = useState(false);                                                  //-Starts the login modal as closed and memorises its state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);                                                //-Controls visibility of login prompt banner
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);     //-Controls data passed to toast notifications
  
  //Custom Hooks for Data & Auth
  const { orders, loading, error, addOrder, updateOrderStage, searchOrder, refetch } = useOrders();             //-Custom hook for fetching and updating orders(encaspulates order logic)
  const { user, login, logout, isAuthenticated, loading: authLoading } = useAuth();                             //-Custom hook for authentication

/**
 * Login Prompt  
 * Effect hook to show login prompt banner if user is not authenticated. 
 */
  useEffect(() => {                                                                                   
    if (!authLoading && !isAuthenticated)                                                                       //-If not loading and user is not authenticated
    {
      const timer = setTimeout(() => setShowLoginPrompt(true), 2000);                                           //-Waits 2 seconds before showing prompt
      return () => clearTimeout(timer);                                                                         //-Cleans up timer if component unmounts
    } else {
      setShowLoginPrompt(false);                                                                                //-Hides prompt if authenticated
    }
  }, [authLoading, isAuthenticated]);                                                                           //-Runs effect when auth loading or authentication status changes

  /**
   * Order Movement Handler
   * Handles moving an order to a new stage.
   * If user is not authenticated, opens login modal instead.
   */
  const handleMoveOrder = async (orderId: string, newStage: OrderStage) => { 
    if (!isAuthenticated) 
    {
      setLoginModalOpen(true);
      return;                                                                                                   //-Exits function if not authenticated
    }

    const order = orders.find(o => o.id === orderId);                                                           //-Finds the order being moved
    const result = await updateOrderStage(orderId, newStage);                                                   //-Pause while updates the order's stage using the custom hook
    if (!result.error && order)                                                                                 //-If update successful and order found
    {
      const stageName = STAGES.find(s => s.id === newStage)?.title || newStage;                                 //-Gets the human-readable stage name
      setToast({                                                                                                //-Displays success toast notification
        message: `Order #${order.order_number} moved to ${stageName}`,
        type: 'success'
      });
    }
  };

  /** 
   * Add Order Handler
   * Handles adding a new order.
   * Displays a success toast notification upon successful addition.
   */
  const handleAddOrder = async (orderData: {                                                                    //-oderData is an object with the following properties
          order_number: string; 
          total_amount: number;
          customer_phone: string;
    }) => {
    const result = await addOrder(orderData);                                                                   //-Pause and add a new order using the custom hook
    if (!result.error)                                                                                          //-If addition successful
    {
      setToast({
        message: `Order #${orderData.order_number} has been recieved`,
        type: 'success'
      });
    }
    return result;                                                                                              //-Returns the result of the add order operation
  };

  /** 
   * Open Add Order Modal Handler
   * Handles opening the add order modal.
   * If user is not authenticated, opens login modal instead.
   */
  const handleOpenAddOrder = () => {
    if (!isAuthenticated)                                                                                       //-If user is not authenticated
    {
      setLoginModalOpen(true);                                                                                  //-Open login modal
      return;                                                                                                   //-Exit function
    }
    setAddOrderModalOpen(true);                                                                                 //-Open add order modal
  };

 
  const activeOrderCount = orders.filter((order) => order.stage !== 'collected').length;                        //-Counts active orders (not collected)

  /**
   * Counts number of orders in each stage for quick stats bar
   * Used to display the number of orders in each stage at the top of the layout
   */
  const stageCounts = {
    queue: orders.filter(o => o.stage === 'queue').length,
    grill: orders.filter(o => o.stage === 'grill').length,
    ready: orders.filter(o => o.stage === 'ready').length,
    collected: orders.filter(o => o.stage === 'collected').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50">             {/* Main container with gradient background */}
      <Header
        user={user}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenAddOrder={handleOpenAddOrder}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={logout}
        orderCount={activeOrderCount}
      />                                                                                                        {/* Header Component */}

      <div className="
                    bg-gray-300
                    border-b border-gray-100 
                    rounded-2xl 
                    mx-0 md:mx-4 my-2 md:my-2
                  "
      >                                                                                                         {/* Quick Stats Bar */}
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"> 
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-sm text-gray-600">
                          Queue: <strong className="text-gray-800">
                                    {stageCounts.queue}
                                  </strong>
                  </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm text-gray-600">
                          Preparing: <strong className="text-gray-800">
                                      {stageCounts.grill}
                                    </strong>
                  </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">
                          Ready: <strong className="text-gray-800">
                                      {stageCounts.ready}
                                 </strong>
                  </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">
                          Collected: <strong className="text-gray-800">
                                        {stageCounts.collected}
                                     </strong>
                  </span>
              </div>
            </div>
            <div className="text-xs text-gray-400 hidden md:block">
              Drag cards to move between stages
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto pb-24">                                                                {/* Main Content */}
        {error && (
          <div className="
                          m-4 
                          bg-red-50 
                          border border-red-200 
                          rounded-xl p-4 
                          flex 
                          items-center gap-3
                          "
            >                                                                                                   {/* Error State */}
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error loading orders</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="
                          px-4 py-2 
                          bg-red-100 
                          hover:bg-red-200 
                          text-red-700 
                          rounded-lg 
                          transition-colors 
                          flex items-center 
                          gap-2
                        "
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Login Prompt Banner */}
        {showLoginPrompt && !isAuthenticated && (
          <div className="
                            m-4 bg-gradient-to-r from-amber-50 to-orange-50 
                            border border-amber-200 
                            rounded-xl 
                            p-4 flex flex-col 
                            sm:flex-row 
                            items-start 
                            sm:items-center 
                            gap-3
                          "
          >
            <div className="flex-1">
              <p className="text-amber-800 font-semibold">Sign in to manage orders</p>
              <p className="text-amber-700 text-sm">
                You can view orders, but you need to sign in to add or update them.
              </p>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="
                          px-5 py-2.5 
                          bg-gradient-to-r from-amber-500 to-orange-500 
                          hover:from-amber-600 hover:to-orange-600 
                          text-white 
                          rounded-lg 
                          transition-colors 
                          font-semibold 
                          shadow-md 
                          hover:shadow-lg
                        "
            >
              Sign In
            </button>
          </div>
        )}

        <KanbanBoard
          orders={orders}
          onMoveOrder={handleMoveOrder}
          loading={loading}
        />                                                                                                      {/* Kanban Board */}

        {/* If we are not loading AND there are zero orders, then show this UI */}
        {/* true && true && JSX, if any condition is false, react renders nothing */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-16 px-4">                                                              {/* Centered container for empty state */}
            <div className="
                              w-28 h-28 
                              bg-gradient-to-br from-amber-100 to-orange-100 
                              rounded-full 
                              flex items-center 
                              justify-center 
                              mx-auto 
                              mb-6 
                              shadow-lg
                              "
            >
              <svg className="
                                w-14 h-14 
                                text-amber-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24
                              "
              >
                <path strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">No orders yet</h2> //-Main heading for empty state
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start by adding your first order. 
              Orders will appear on the board and can be moved through each stage as they progress.
            </p>
            {isAuthenticated ? 
            (
              <button
                onClick={() => setAddOrderModalOpen(true)}
                className="
                            inline-flex 
                            items-center gap-2 
                            px-6 py-3 
                            bg-gradient-to-r from-amber-500 to-orange-500 
                            hover:from-amber-600 hover:to-orange-600 
                            text-white 
                            font-semibold 
                            rounded-xl 
                            transition-all 
                            shadow-lg 
                            hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Add First Order
              </button>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="
                            inline-flex 
                            items-center 
                            gap-2 px-6 py-3 
                            bg-slate-700 
                            hover:bg-slate-800 
                            text-white 
                            font-semibold 
                            rounded-xl 
                            transition-all 
                            shadow-lg 
                            hover:shadow-xl
                          "
              >
                Sign In to Add Orders
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (Mobile) */}
      {isMobile && isAuthenticated && orders.length > 0 && (
        <button
          onClick={() => setAddOrderModalOpen(true)}
          className="
                      fixed bottom-6 right-6 
                      w-16 h-16 
                      bg-gradient-to-r from-amber-500 to-orange-500 
                      hover:from-amber-600 hover:to-orange-600 
                      text-white 
                      rounded-full 
                      shadow-2xl 
                      hover:shadow-3xl 
                      transition-all 
                      flex items-center 
                      justify-center 
                      z-30 
                      active:scale-95
                    "
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-slate-400 py-8 mt-auto">       {/* Footer */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="
                              w-10 h-10 
                              bg-gradient-to-br from-amber-500 to-red-600 
                              rounded-xl 
                              flex 
                              items-center 
                              justify-center
                            "
              >
                <svg className="w-6 h-6 text-white" 
                     fill="currentColor" 
                     viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">NotiFlo</p>
                <p className="text-xs text-slate-500">Order Tracing System</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm">Designed for efficient order management</p>
              <p className="text-xs text-slate-500 mt-1">Real-time tracking from queue to collection</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddOrderModal
        isOpen={addOrderModalOpen}
        onClose={() => setAddOrderModalOpen(false)}
        onAddOrder={handleAddOrder}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSearch={searchOrder}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={login}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AppLayout;
