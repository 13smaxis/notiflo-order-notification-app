import React, { useState } from 'react';
import { X, Search, Clock, Flame, CheckCircle, ShoppingBag, Phone, Calendar, Hash } from 'lucide-react';
import { Order, OrderStage, STAGES } from '@/types/order';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (orderNumber: string) => Promise<{ data: Order[] | null; error: string | null }>;
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

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    const { data, error: searchError } = await onSearch(searchQuery.trim());
    
    setLoading(false);
    if (searchError) {
      setError(searchError);
      setResults([]);
    } else {
      setResults(data || []);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const handleClose = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-6 h-6" />
              Search Orders
            </h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-6 border-b border-gray-100">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter order number..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-0 outline-none transition-colors text-lg font-mono"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            </div>
          )}

          {searched && !loading && results.length === 0 && !error && (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">No orders found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different order number</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-4 space-y-3">
              {results.map((order) => {
                const stageConfig = STAGES.find((s) => s.id === order.stage);
                return (
                  <div
                    key={order.id}
                    className={`bg-white border-2 ${stageConfig?.borderColor} rounded-xl p-4 shadow-sm`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xl font-bold text-gray-800 font-mono">
                          #{order.order_number}
                        </span>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${stageConfig?.bgColor} ${stageConfig?.color} ml-3`}>
                          <StageIcon stage={order.stage} className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {stageConfig?.title}
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-gray-800 font-mono">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{order.customer_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    {/* Timeline */}
                    {(order.grill_started_at || order.ready_at || order.collected_at) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline</p>
                        <div className="space-y-1 text-xs text-gray-500">
                          {order.grill_started_at && (
                            <div className="flex items-center gap-2">
                              <Flame className="w-3 h-3 text-orange-500" />
                              <span>Started grilling: {formatDate(order.grill_started_at)}</span>
                            </div>
                          )}
                          {order.ready_at && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>Ready: {formatDate(order.ready_at)}</span>
                            </div>
                          )}
                          {order.collected_at && (
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-3 h-3 text-blue-500" />
                              <span>Collected: {formatDate(order.collected_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
