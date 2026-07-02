
import { useAppContext } from '@/contexts/AppContext';
import { useOrders } from '@/hooks/useOrders';
import { Plus, Hash, DollarSign, X, Phone } from 'lucide-react';
import React from 'react';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({ isOpen, onClose }) => {
  const { storeId } = useAppContext();
  const { addOrder, loading } = useOrders(storeId);

  const [orderNumber, setOrderNumber] = React.useState('');
  const [totalAmount, setTotalAmount] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState(''); 
  const [customerName, setCustomerName] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!orderNumber.trim()) {
      setLocalError('Order number is required');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setLocalError('Please enter a valid amount');
      return;
    }

    if (!customerPhone.trim() || !/^0[0-9]{9}$/.test(customerPhone.replace(/\s/g, ''))) {
      setLocalError('Please enter a valid SA phone number (0XXXXXXXXX)');
      return;
    }

    const { data, error } = await addOrder({
      order_number: orderNumber.trim(),
      customer_phone: customerPhone.trim(),
      total_amount: parseFloat(totalAmount),
      customer_name: customerName.trim() || undefined
    });

    if (error) {
      setLocalError(error);
    } else if (data) {
      // Reset form and close
      setOrderNumber('');
      setTotalAmount('');
      setCustomerPhone('');
      setCustomerName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-6 h-6" />
              New Order
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {localError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {localError}
            </div>
          )}

          {/* Order Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Order Number</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., 001"
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors text-lg font-mono"
                autoFocus
              />
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount (ZAR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">R</span>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors text-lg font-mono"
              />
            </div>
          </div>

          {/* Customer Name (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (Optional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors"
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Cellphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g., 0821234567"
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors text-lg"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding Order...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Order to Queue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};