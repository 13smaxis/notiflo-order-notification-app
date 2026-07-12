import React, { useEffect, useState } from 'react';
import { LogIn, Lock, Mail, Phone, Store, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { login, register, authenticating, error: authError } = useAuth();
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [loginPhoneNumber, setLoginPhoneNumber] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhoneNumber, setRegisterPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [storeNumber, setStoreNumber] = useState('1');
  const [ownerName, setOwnerName] = useState('');
  const [ownerSurname, setOwnerSurname] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'supervisor' | 'staff'>('owner');
  const [officeUseEmployeeNumber, setOfficeUseEmployeeNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentMode(mode);
    setError(null);
  }, [isOpen, mode]);

  const resetForm = () => {
    setLoginPhoneNumber('');
    setRegisterEmail('');
    setRegisterPhoneNumber('');
    setPassword('');
    setConfirmPassword('');
    setShopName('');
    setStoreNumber('1');
    setOwnerName('');
    setOwnerSurname('');
    setRole('owner');
    setOfficeUseEmployeeNumber('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (currentMode === 'login') {
        if (!loginPhoneNumber.trim()) {
          setError('Phone number is required');
          return;
        }

        if (!/^\+\d{9}$/.test(loginPhoneNumber.trim())) {
          setError('Phone number must be + followed by nine digits');
          return;
        }

        if (!password) {
          setError('Password is required');
          return;
        }

        const { user, error: loginError } = await login(loginPhoneNumber, password);

        if (loginError) {
          setError(loginError);
          return;
        }

        if (user) {
          resetForm();
          onClose();
        }
        return;
      }

      if (!registerPhoneNumber.trim()) {
        setError('Phone number is required');
        return;
      }

      if (!/^\+\d{9}$/.test(registerPhoneNumber.trim())) {
        setError('Phone number must be + followed by nine digits');
        return;
      }

      if (!password) {
        setError('Password is required');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!shopName.trim()) {
        setError('Shop name is required');
        return;
      }

      if (!/^[1-9]\d*$/.test(storeNumber.trim())) {
        setError('Store number must be a positive integer');
        return;
      }

      if (!ownerName.trim() || !ownerSurname.trim()) {
        setError('Owner name and surname are required');
        return;
      }

      const { user, error: registerError } = await register({
        email: registerEmail.trim() || undefined,
        phoneNumber: registerPhoneNumber,
        password,
        role,
        storeName: shopName,
        storeNumber,
        ownerName,
        ownerSurname,
        employeeNumber: officeUseEmployeeNumber.trim() || undefined,
      });

      if (registerError) {
        setError(registerError);
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

  const isLoginMode = currentMode === 'login';
  const displayError = error || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200 ${!isLoginMode ? 'hide-scrollbar' : ''}`}>
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
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCurrentMode('login')}
              className={`rounded-xl px-4 py-2 font-semibold transition-colors ${isLoginMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode('register')}
              className={`rounded-xl px-4 py-2 font-semibold transition-colors ${!isLoginMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {displayError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isLoginMode ? 'Phone Number' : 'Email Address (optional)'}
            </label>
            <div className="relative">
              {isLoginMode ? (
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              ) : (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              )}
              <input
                type={isLoginMode ? 'text' : 'email'}
                value={isLoginMode ? loginPhoneNumber : registerEmail}
                onChange={(e) => (isLoginMode ? setLoginPhoneNumber(e.target.value) : setRegisterEmail(e.target.value))}
                placeholder={isLoginMode ? '+123456789' : 'you@example.com'}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-amber-500 focus:ring-0 outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {!isLoginMode && (
            <>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="tel"
                    pattern="^\\+\\d{9}$"
                    value={registerPhoneNumber}
                    onChange={(event) => setRegisterPhoneNumber(event.target.value)}
                    placeholder="+123456789"
                    className="pl-11"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Name</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input value={shopName} onChange={(event) => setShopName(event.target.value)} placeholder="Store name" className="pl-11" />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Number</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={storeNumber}
                    onChange={(event) => setStoreNumber(event.target.value.replace(/\D/g, ''))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Owner Name</Label>
                  <Input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Owner name" />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Owner Surname</Label>
                  <Input value={ownerSurname} onChange={(event) => setOwnerSurname(event.target.value)} placeholder="Owner surname" />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'owner' | 'manager' | 'supervisor' | 'staff')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
                <Label className="mb-2 block text-sm font-semibold text-yellow-900">For Office Use</Label>
                <Input
                  value={officeUseEmployeeNumber}
                  onChange={(event) => setOfficeUseEmployeeNumber(event.target.value)}
                  placeholder="Employee Number"
                />
              </div>
            </>
          )}

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

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-amber-500 focus:ring-0 outline-none transition-colors"
              />
            </div>
          )}

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
                {isLoginMode ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {isLoginMode ? 'Sign In' : 'Register'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};