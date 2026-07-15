import React from 'react';
import { UserPlus, Phone, Tag, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { user, addEmployee } = useAuth();
  const [fullName, setFullName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [role, setRole] = React.useState<'owner' | 'manager' | 'supervisor' | 'staff'>('staff');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFullName('');
    setPhoneNumber('');
    setRole('staff');
    setLocalError(null);
  }, [isOpen]);

  const normalizePhoneInput = (value: string) => value.replace(/[\s\-()]/g, '').trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedName = fullName.trim();
    const normalizedPhone = normalizePhoneInput(phoneNumber);

    if (!trimmedName) {
      setLocalError('Employee name is required');
      return;
    }

    if (!normalizedPhone) {
      setLocalError('Employee cellphone is required');
      return;
    }

    if (!/^0\d{9}$/.test(normalizedPhone)) {
      setLocalError('Use a local phone number like 0627680710');
      return;
    }

    if (!user?.profile?.store_id) {
      setLocalError('Select a store before adding an employee');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await addEmployee({
        fullName: trimmedName,
        phoneNumber: normalizedPhone,
        role,
      });

      if (error) {
        setLocalError(error);
        return;
      }

      onClose();
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
              <UserPlus className="h-6 w-6" />
              Add Employee
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
            <Label className="mb-2 block text-sm font-semibold text-gray-700">Employee Name</Label>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-semibold text-gray-700">Employee Cellphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(normalizePhoneInput(event.target.value))}
                placeholder="0627680710"
                className="pl-11"
                inputMode="tel"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-semibold text-gray-700">Employee Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'owner' | 'manager' | 'supervisor' | 'staff')}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Saved to the current profile store</p>
                <p className="mt-1 text-amber-800">The employee will be linked to the active store profile already selected in your account.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:from-amber-700 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving Employee...' : 'Add Employee'}
          </button>
        </form>
      </div>
    </div>
  );
};