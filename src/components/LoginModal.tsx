
import React, { useState } from 'react';
import { X, LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loading, error: authError } = useAuth();
  const { setUser } = useAppContext();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    const { user, error: loginError } = await login(email, password);

    if (loginError) {
      setError(loginError);
    } else if (user) {
      setUser(user); // Store in global context
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = error || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-red-700 px-6 py-8 text-center">
          <div className="w-28 h-28 bg-gradient-to-r from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/logo.png" alt="NotiFlo logo" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">                                                                  {/* Form */}
          {displayError && (
            <div className="
                            bg-red-50 
                            border border-red-200 
                            text-red-700 
                            px-4 py-3 
                            rounded-lg 
                            text-sm
                          "
            >                                                                                                                     {/* Login Error message */}
              {displayError}
            </div>
          )}

          <div>
            <label className="
                                block 
                                text-sm font-semibold text-gray-700 
                                mb-2
                              "
            >
                Email Address
            </label>                                                                                                              {/* Email label */}
            <div className="relative">
              <Mail className="
                                absolute 
                                left-3 top-1/2 -translate-y-1/2 
                                w-5 h-5 
                                text-gray-400
                              " 
              />                                                                                                                  {/* Email icon */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="
                            w-full 
                            pl-11 pr-4 py-3 
                            border-2 border-gray-200 
                            rounded-xl 
                            text-gray-900
                            focus:border-amber-500 
                            focus:ring-0 
                            outline-none 
                            transition-colors
                          "
                autoFocus
              />                                                                                                                  {/* Email input */}
            </div>
          </div>

          
          <div>                                                                                                                   {/* Password */}
            <label className="
                                block 
                                text-sm font-semibold text-gray-700 
                                mb-2
                              "
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />                                 {/* Password icon */}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="
                            w-full pl-11 pr-4 py-3 
                            border-2 border-gray-200 
                            rounded-xl 
                            text-gray-900
                            focus:border-amber-500 
                            focus:ring-0 
                            outline-none 
                            transition-colors
                          "
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
                        w-full py-4 
                        bg-gradient-to-r from-amber-600 to-red-600 
                        hover:from-amber-700 hover:to-red-700 
                        text-white font-bold 
                        rounded-xl 
                        transition-all 
                        duration-200 
                        flex items-center 
                        justify-center 
                        gap-2 
                        shadow-lg 
                        hover:shadow-xl 
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
          >                                                                                                                       {/* Submit Button */}
            {loading ? (
              <>                                                                                                                  {/* Loading spinner */}
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                  />                                                                                                              {/* Spinner background */}
                  <path className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 
                           0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                  />                                                                                                              {/* Spinner foreground SVG */}
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
};