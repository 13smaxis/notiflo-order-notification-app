import React, { useState } from 'react';
import { Phone, Store, Lock, X, AlertCircle, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Store {
  storeId: string;
  storeName: string;
  storeNumber: number;
  role: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  // State for multi-step flow
  const [step, setStep] = useState<'phone' | 'store' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  if (!isOpen) return null;

  const normalizePhoneInput = (value: string) => {
    const cleaned = value.replace(/[\s\-()]/g, '').trim();
    if (!cleaned) return '';
    if (cleaned.startsWith('+27')) return `0${cleaned.slice(3)}`;
    if (cleaned.startsWith('27') && cleaned.length === 11) return `0${cleaned.slice(2)}`;
    return cleaned;
  };

  const isValidPhone = (value: string) => /^0\d{9}$/.test(normalizePhoneInput(value));

  // STEP 1: Look up phone
  const handlePhoneLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneInput(phone);

      if (!normalizedPhone) {
        setError('Phone number is required');
        setLoading(false);
        return;
      }

      if (!isValidPhone(normalizedPhone)) {
        setError('Invalid phone number format');
        setLoading(false);
        return;
      }

      console.log('📱 Looking up phone:', normalizedPhone);

      const response = await fetch('http://localhost:3000/api/auth/lookup-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Phone not found');
        setLoading(false);
        return;
      }

      if (data.stores.length === 0) {
        setError('No stores found for this phone');
        setLoading(false);
        return;
      }

      console.log('✅ Found', data.stores.length, 'store(s)');

      setUserId(data.userId);
      setStores(data.stores);
      setStep('store');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Select store
  const handleStoreSelect = () => {
    if (!selectedStore) {
      setError('Please select a store');
      return;
    }

    setError(null);
    setStep('password');
  };

  // STEP 3: Verify password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!password) {
        setError('Password is required');
        setLoading(false);
        return;
      }

      const normalizedPhone = normalizePhoneInput(phone);

      console.log('🔐 Verifying password...');

      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          storeId: selectedStore,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      console.log('✅ Login successful!');

      // Store session in localStorage or context
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('selected_store', data.profile.storeId);

      // Close modal and trigger re-auth
      onClose();
      window.location.reload(); // Force app re-hydration
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Phone Number Entry
  if (step === 'phone') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="bg-gradient-to-r from-amber-700 to-red-700 px-6 py-8 text-center">
            <Phone className="w-12 h-12 text-white mx-auto mb-2" />
            <h2 className="text-white text-2xl font-bold">Sign In</h2>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>

          <form onSubmit={handlePhoneLookup} className="p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                  placeholder="0627680710"
                  className="pl-11"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Example: 0627680710</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Continue
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STEP 2: Store Selection
  if (step === 'store') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="bg-gradient-to-r from-amber-700 to-red-700 px-6 py-8 text-center">
            <Store className="w-12 h-12 text-white mx-auto mb-2" />
            <h2 className="text-white text-2xl font-bold">Select Store</h2>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              {stores.map((store) => (
                <button
                  key={store.storeId}
                  onClick={() => setSelectedStore(store.storeId)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedStore === store.storeId
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-400'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{store.storeName}</p>
                  <p className="text-sm text-gray-500">Store #{store.storeNumber}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{store.role}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleStoreSelect}
              disabled={!selectedStore}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              Continue
            </button>

            <button
              onClick={() => {
                setStep('phone');
                setError(null);
              }}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Password Entry
  if (step === 'password') {
    const selectedStoreName = stores.find((s) => s.storeId === selectedStore)?.storeName;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="bg-gradient-to-r from-amber-700 to-red-700 px-6 py-8 text-center">
            <Lock className="w-12 h-12 text-white mx-auto mb-2" />
            <h2 className="text-white text-2xl font-bold">Enter Password</h2>
            <p className="text-white/80 text-sm mt-2">{selectedStoreName}</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-11"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('store');
                setError(null);
                setPassword('');
              }}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};


/*import React, { useState } from 'react';
import { LogIn, Lock, Phone, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterModal } from './RegisterModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  mode = 'login',
}) => {
  if (mode === 'register') {
    return <RegisterModal isOpen={isOpen} onClose={onClose} />;
  }

  const { login, authenticating, error: authError } = useAuth();
  const [loginPhoneNumber, setLoginPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizePhoneInput = (value: string) => {
    const cleaned = value.replace(/[\s\-()]/g, '').trim();

    if (!cleaned) {
      return '';
    }

    if (cleaned.startsWith('+27')) {
      return `0${cleaned.slice(3)}`;
    }

    if (cleaned.startsWith('27') && cleaned.length === 11) {
      return `0${cleaned.slice(2)}`;
    }

    return cleaned;
  };

  const isValidLocalPhoneNumber = (value: string) => /^0\d{9}$/.test(normalizePhoneInput(value));

  const resetForm = () => {
    setLoginPhoneNumber('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const normalizedLoginPhone = normalizePhoneInput(loginPhoneNumber);

      if (!normalizedLoginPhone) {
        setError('Phone number is required');
        return;
      }

      if (!isValidLocalPhoneNumber(normalizedLoginPhone)) {
        setError('Use a South African phone number like 0XXXXXXXXX');
        return;
      }

      if (!password) {
        setError('Password is required');
        return;
      }

      const { user, error: loginError } = await login(normalizedLoginPhone, password);

      if (loginError) {
        setError(loginError);
        return;
      }

      if (user) {
        resetForm();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const displayError = error || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-amber-700 to-red-700 px-6 py-8 text-center">
          <div className="w-28 h-28 bg-gradient-to-r from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/logo.png" alt="NotiFlo logo" className="h-full w-full object-contain" />
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {displayError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={loginPhoneNumber}
                onChange={(e) => setLoginPhoneNumber(normalizePhoneInput(e.target.value))}
                placeholder="0123456789"
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-amber-500 focus:ring-0 outline-none transition-colors"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Example: 0 followed by 9 digits.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-amber-500 focus:ring-0 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || authenticating}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || authenticating ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};*/