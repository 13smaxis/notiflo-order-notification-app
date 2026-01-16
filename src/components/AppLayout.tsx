import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrders } from '@/hooks/useOrdersAdapter';
import { useAuth } from '@/hooks/useAuth';
import { OrderStage, STAGES } from '@/types/order';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import AddOrderModal from './AddOrderModal';
import SearchModal from './SearchModal';
import LoginModal from './LoginModal';
import { Plus, AlertCircle, RefreshCw, CheckCircle, X } from 'lucide-react';

// Toast notification component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  
  // State
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Hooks
  const { orders, loading, error, addOrder, updateOrderStage, searchOrder, refetch } = useOrders();
  const { user, login, logout, isAuthenticated, loading: authLoading } = useAuth();

  // Show login prompt if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const timer = setTimeout(() => setShowLoginPrompt(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowLoginPrompt(false);
    }
  }, [authLoading, isAuthenticated]);

  // Handle order stage change
  const handleMoveOrder = async (orderId: string, newStage: OrderStage) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    
    const order = orders.find(o => o.id === orderId);
    const result = await updateOrderStage(orderId, newStage);
    
    if (!result.error && order) {
      const stageName = STAGES.find(s => s.id === newStage)?.title || newStage;
      setToast({
        message: `Order #${order.order_number} moved to ${stageName}`,
        type: 'success'
      });
    }
  };

  // Handle add order
  const handleAddOrder = async (orderData: {
    order_number: string;
    total_amount: number;
    customer_phone: string;
  }) => {
    const result = await addOrder(orderData);
    if (!result.error) {
      setToast({
        message: `Order #${orderData.order_number} added to Queue`,
        type: 'success'
      });
    }
    return result;
  };

  // Handle open add order modal
  const handleOpenAddOrder = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setAddOrderModalOpen(true);
  };

  // Count active orders (not collected)
  const activeOrderCount = orders.filter(
    (order) => order.stage !== 'collected'
  ).length;

  // Stage counts for stats
  const stageCounts = {
    queue: orders.filter(o => o.stage === 'queue').length,
    grill: orders.filter(o => o.stage === 'grill').length,
    ready: orders.filter(o => o.stage === 'ready').length,
    collected: orders.filter(o => o.stage === 'collected').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50">
      {/* Header */}
      <Header
        user={user}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenAddOrder={handleOpenAddOrder}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={logout}
        orderCount={activeOrderCount}
      />

      {/* Quick Stats Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-sm text-gray-600">Queue: <strong className="text-gray-800">{stageCounts.queue}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm text-gray-600">Grill: <strong className="text-gray-800">{stageCounts.grill}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Ready: <strong className="text-gray-800">{stageCounts.ready}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">Collected: <strong className="text-gray-800">{stageCounts.collected}</strong></span>
              </div>
            </div>
            <div className="text-xs text-gray-400 hidden md:block">
              Drag cards to move between stages
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-24">
        {/* Error State */}
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error loading orders</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Login Prompt Banner */}
        {showLoginPrompt && !isAuthenticated && (
          <div className="m-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-amber-800 font-semibold">Sign in to manage orders</p>
              <p className="text-amber-700 text-sm">
                You can view orders, but you need to sign in to add or update them.
              </p>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Kanban Board */}
        <KanbanBoard
          orders={orders}
          onMoveOrder={handleMoveOrder}
          loading={loading}
        />

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-28 h-28 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-14 h-14 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">No orders yet</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start by adding your first order. Orders will appear on the board and can be moved through each stage as they progress.
            </p>
            {isAuthenticated ? (
              <button
                onClick={() => setAddOrderModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Add First Order
              </button>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
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
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center justify-center z-30 active:scale-95"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-slate-400 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Chamdor Meat Supply</p>
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
