import React from 'react';
import { Store, Tag, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreAdded?: () => void;
}

export const AddStoreModal: React.FC<AddStoreModalProps> = ({ 
  isOpen, 
  onClose,
  onStoreAdded 
}) => {
  const { user, refreshProfiles } = useAuth();
  const [storeName, setStoreName] = React.useState('');
  const [storeNumber, setStoreNumber] = React.useState('');
  const [storePhone, setStorePhone] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStoreName('');
    setStoreNumber('');
    setStorePhone('');
    setLocalError(null);
  }, [isOpen]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    try {
      // Validation
      if (!storeName.trim()) {
        setLocalError('Store name is required');
        setSubmitting(false);
        return;
      }

      if (!storeNumber.trim()) {
        setLocalError('Store number is required');
        setSubmitting(false);
        return;
      }

      if (!/^[1-9]\d*$/.test(storeNumber.trim())) {
        setLocalError('Store number must be a positive integer');
        setSubmitting(false);
        return;
      }

      if (!storePhone.trim()) {
        setLocalError('Store phone is required');
        setSubmitting(false);
        return;
      }

      const normalizedPhone = normalizePhoneInput(storePhone);
      if (!isValidLocalPhoneNumber(normalizedPhone)) {
        setLocalError('Use a local phone number like 0627680710');
        setSubmitting(false);
        return;
      }

      // Check if user is authenticated
      if (!user || !user.accessToken) {
        setLocalError('You must be logged in to add a store');
        setSubmitting(false);
        return;
      }

      // Call backend add-store endpoint
      const response = await fetch('http://localhost:3000/api/add-store', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeNumber: storeNumber.trim(),
          storeName: storeName.trim(),
          storePhone: normalizedPhone,
          role: 'owner',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLocalError(result.error || 'Failed to add store');
        setSubmitting(false);
        return;
      }

      // Success! 
      console.log('✅ Store added:', result.storeId);

      // Refresh user's profiles to show new store
      await refreshProfiles();

      // Reset form
      setStoreName('');
      setStoreNumber('');
      setStorePhone('');
      setLocalError(null);

      // Callback
      onStoreAdded?.();

      // Close modal
      onClose();
    } catch (err) {
      console.error('Add store error:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to add store');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Store className="h-6 w-6" />
              Add Store
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              disabled={submitting}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {localError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Name *</Label>
            <Input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="e.g. NotiFlo Central"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Number *</Label>
              <Input
                value={storeNumber}
                onChange={(event) => setStoreNumber(event.target.value.replace(/\D/g, ''))}
                placeholder="2"
                inputMode="numeric"
                disabled={submitting}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Phone *</Label>
              <Input
                value={storePhone}
                onChange={(event) => setStorePhone(normalizePhoneInput(event.target.value))}
                placeholder="0627680710"
                inputMode="tel"
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:from-amber-700 hover:to-orange-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding Store...
              </>
            ) : (
              <>
                <Store className="h-5 w-5" />
                Save Store
              </>
            )}
          </button>


          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-gray-100 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};