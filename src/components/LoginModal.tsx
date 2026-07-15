import React, { useEffect, useState } from 'react';
import { LogIn, Lock, Mail, Phone, Store, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

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
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);                                                     //- State to track the current mode of the modal (login or register)
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


  /*
   * Handle form submission for both login and registration modes. 
   * Validates input fields and calls the appropriate authentication functions.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();                                                                                                           //- Prevent the default form submission behavior
    setError(null);                                                                                                               //- Clear any existing error messages
    setSubmitting(true);                                                                                                          //- Set the submitting state to true to indicate that the form is being processed

    try {
      if (currentMode === 'login')                                                                                                //- (1) Check if the current mode is login
      {
        const normalizedLoginPhone = normalizePhoneInput(loginPhoneNumber);                                                       

        if (!normalizedLoginPhone)                                                                                                //- Check if the normalized phone number is empty
        {
          setError('Phone number is required');
          return;
        }

        if (!isValidLocalPhoneNumber(normalizedLoginPhone))                                                                       //- Check if the normalized phone number is not a valid SA phone number
        {
          setError('Use a South African phone number like 0XXXXXXXXX');
          return;
        }

        if (!password)                                                                                                            //- Check if the password field is empty
        {
          setError('Password is required');
          return;
        }

        const { user, error: loginError } = await login(normalizedLoginPhone, password);                                          //- Call the login function with the normalized phone number and password

        if (loginError)                                                                                                           //- Check if there was an error during login
        {
          setError(loginError);
          return;
        }

        if (user)                                                                                                                 //- Check if the user object is returned after successful login
        {
          resetForm();                                                                                                            //- Reset the form fields to their initial state
          onClose();                                                                                                              //- Close the modal after successful login
        }
        return;
      }


      const normalizedRegisterPhone = normalizePhoneInput(registerPhoneNumber);                                                   //- Normalize the phone number input for registration

      if (!normalizedRegisterPhone)                                                                                               //- Check if the normalized phone number is empty
      {
        setError('Phone number is required');
        return;
      }

      if (!isValidLocalPhoneNumber(normalizedRegisterPhone))                                                                      //- Check if the normalized phone number is not a valid SA phone number
      {
        setError('Use a South African phone number like 0XXXXXXXXX');
        return;
      }

      if (!password)                                                                                                              //- Check if the password field is empty
      {
        setError('Password is required');
        return;
      }

      if (password !== confirmPassword)                                                                                           //- Check if the password and confirm password fields do not match
      {
        setError('Passwords do not match');
        return;
      }

      if (!shopName.trim())                                                                                                       //- Check if the shop name field is empty or contains only whitespace
      {
        setError('Shop name is required');
        return;
      }

      if (!/^[1-9]\d*$/.test(storeNumber.trim()))                                                                                 //- Check if the store number is not a negative integer
      {
        setError('Store number must be a positive integer');
        return;
      }

      if (!ownerName.trim() || !ownerSurname.trim())                                                                              //- Check if the owner name or surname fields are empty or contain only whitespace
      {
        setError('Owner name and surname are required');
        return;
      }


      /*
       * Try to register first
       * Call the register function with the provided registration details.
       * If the user already exists, attempt to log in and add the store instead.
       */
      const { user, error: registerError } = await register({
        email: registerEmail.trim() || undefined,
        phoneNumber: normalizedRegisterPhone,
        password,
        role,
        storeName: shopName,
        storeNumber,
        ownerName,
        ownerSurname,
        employeeNumber: officeUseEmployeeNumber.trim() || undefined,
      });

      if (registerError)                                                                                                          //- Check if there was an error during registration
      {
        if (registerError.includes('already') || registerError.includes('exists'))                                                //- Check if the error message indicates that the user already exists
        {
          try {                                                                                                                   //- If is, attempt to log in and add the store for existing users
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: registerEmail.trim() || `${normalizedRegisterPhone}@phone.notiflo.local`,
              password,
            });

            if (loginError || !loginData?.session) {
              setError('Phone/email or password is incorrect');
              return;
            }

            // Call backend add-store endpoint
            const addStoreResponse = await fetch('/api/add-store', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${loginData.session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                storeNumber: storeNumber.trim(),
                storeName: shopName.trim(),
                storePhone: normalizedRegisterPhone,
                role,
              }),
            });

            const addStoreResult = await addStoreResponse.json();

            if (!addStoreResponse.ok) {
              setError(addStoreResult.error || 'Failed to add store');
              return;
            }

            // Success! Store added
            resetForm();
            onClose();
            return;
          } catch (addStoreError) {
            console.error('Add store error:', addStoreError);
            setError('Failed to add store to existing account');
            return;
          }
        }

        // Other registration errors
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">                                                                  {/* Form for both login and registration */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCurrentMode('login')}
              className={`
                          rounded-xl 
                          px-4 py-2 
                          font-semibold 
                          transition-colors 
                          border 
                          ${isLoginMode ?
                  'bg-amber-600 text-white border-amber-600 shadow-sm' :
                  'bg-white/70 text-slate-600 border-slate-200'}
                        `}
            >                                                                                                                     {/* Toggle button for login mode */}
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode('register')}
              className={`
                          rounded-xl 
                          px-4 py-2 
                          font-semibold 
                          transition-colors 
                          border 
                          ${!isLoginMode ?
                  'bg-amber-600 text-white border-amber-600 shadow-sm' :
                  'bg-white/70 text-slate-600 border-slate-200'}
                        `}
            >                                                                                                                     {/* Toggle button for registration mode */}
              Register
            </button>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {displayError}                                                                                                      {/* Calls the error message from the authentication hook or local state */}
            </div>
          )}                                                                                                                      {/* Display error message if any */}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">                                                    {/* Label for the input field */}
              {isLoginMode ? 'Phone Number' : 'Email Address (optional)'}
            </label>

            <div className="relative">                                                                                            {/* Container for the input field and icon */}
              {isLoginMode ? (
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              ) : (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              )}

              <input
                type={isLoginMode ? 'text' : 'email'}
                value={isLoginMode ? loginPhoneNumber : registerEmail}
                onChange={(e) => {
                  if (isLoginMode) {
                    setLoginPhoneNumber(normalizePhoneInput(e.target.value));
                    return;
                  }

                  setRegisterEmail(e.target.value);
                }}
                placeholder={isLoginMode ? '0123456789' : 'you@example.com'}
                className="
                            w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-amber-500 focus:ring-0 outline-none transition-colors"
                autoFocus
              />
            </div>
            {isLoginMode && (
              <p className="mt-2 text-xs text-gray-500">Example: 0627680710 or +27 62 768 0710. Spaces, brackets, and hyphens are removed automatically.</p>
            )}
          </div>

          {!isLoginMode && (
            <>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Cellphone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="tel"
                    value={registerPhoneNumber}
                    onChange={(event) => setRegisterPhoneNumber(normalizePhoneInput(event.target.value))}
                    placeholder="0123456789"
                    className="pl-11"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Example: 0627680710 or +27 62 768 0710. Spaces, brackets, and hyphens are removed automatically.</p>
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

              <div className="rounded-2xl bg-yellow-100 border border-yellow-200 p-4">
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