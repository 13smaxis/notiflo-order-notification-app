import React from 'react';
import { Store, Tag, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStoreModal: React.FC<AddStoreModalProps> = ({ isOpen, onClose }) => {
  const [storeName, setStoreName] = React.useState('');
  const [storeNumber, setStoreNumber] = React.useState('');
  const [storePhone, setStorePhone] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStoreName('');
    setStoreNumber('');
    setStorePhone('');
    setLocalError(null);
  }, [isOpen]);

  const normalizePhoneInput = (value: string) => value.replace(/[\s\-()]/g, '').trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!storeName.trim()) {
      setLocalError('Store name is required');
      return;
    }

    if (!/^[1-9]\d*$/.test(storeNumber.trim())) {
      setLocalError('Store number must be a positive integer');
      return;
    }

    const normalizedPhone = normalizePhoneInput(storePhone);
    if (normalizedPhone && !/^0\d{9}$/.test(normalizedPhone)) {
      setLocalError('Use a local phone number like 0627680710');
      return;
    }

    setLocalError('Supabase integration is not wired yet');
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
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {localError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {localError}
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Name</Label>
            <Input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="e.g. NotiFlo Central"
              autoFocus
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Number</Label>
              <Input
                value={storeNumber}
                onChange={(event) => setStoreNumber(event.target.value.replace(/\D/g, ''))}
                placeholder="1"
                inputMode="numeric"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-gray-700">Store Phone</Label>
              <Input
                value={storePhone}
                onChange={(event) => setStorePhone(normalizePhoneInput(event.target.value))}
                placeholder="0627680710"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Ready for Supabase wiring</p>
                <p className="mt-1 text-amber-800">This form is in place so you can connect the insert logic next without changing the layout again.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:from-amber-700 hover:to-orange-700 hover:shadow-xl"
          >
            Save Store
          </button>
        </form>
      </div>
    </div>
  );
};