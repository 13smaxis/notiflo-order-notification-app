import React from 'react';
import { LoaderCircle, MapPin, Store, X } from 'lucide-react';
import { apiUrl } from '@/lib/api';

type StoreListing = {
  store_id: string;
  store_name: string;
};

type DiscoveryDetails = {
  cuisine: string | null;
  estimated_delivery_minutes: number | null;
  latitude: number | null;
  longitude: number | null;
};

export function StoreDiscoveryModal({
  isOpen,
  store,
  accessToken,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  store: StoreListing | null;
  accessToken: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cuisine, setCuisine] = React.useState('');
  const [deliveryMinutes, setDeliveryMinutes] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !store || !accessToken) return;
    let active = true;
    setLoading(true);
    setError(null);
    void fetch(apiUrl(`/api/stores/${encodeURIComponent(store.store_id)}/discovery`), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load listing details.');
      if (!active) return;
      const details = payload.store as DiscoveryDetails;
      setCuisine(details.cuisine || '');
      setDeliveryMinutes(details.estimated_delivery_minutes?.toString() || '');
      setLatitude(details.latitude?.toString() || '');
      setLongitude(details.longitude?.toString() || '');
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load listing details.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, isOpen, store]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store || !accessToken) return;
    setSaving(true);
    setError(null);
    const optionalNumber = (value: string) => value.trim() ? Number(value) : null;
    try {
      const response = await fetch(apiUrl(`/api/stores/${encodeURIComponent(store.store_id)}/discovery`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuisine,
          estimatedDeliveryMinutes: optionalNumber(deliveryMinutes),
          latitude: optionalNumber(latitude),
          longitude: optionalNumber(longitude),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save listing details.');
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save listing details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" aria-label="Close listing editor" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="store-discovery-title" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700">Restaurant listing</p><h2 id="store-discovery-title" className="mt-1 text-xl font-bold text-slate-900">{store.store_name}</h2></div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {loading ? <div role="status" className="flex items-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading listing details…</div> : (
          <form onSubmit={save} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Cuisine<input value={cuisine} onChange={(event) => setCuisine(event.target.value)} maxLength={80} placeholder="e.g. Pizza, Burgers" className="mt-1.5 h-11 w-full rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" /></label>
            <label className="block text-sm font-semibold text-slate-700">Estimated delivery time (minutes)<input type="number" min="1" max="240" step="1" value={deliveryMinutes} onChange={(event) => setDeliveryMinutes(event.target.value)} placeholder="Leave blank if unknown" className="mt-1.5 h-11 w-full rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" /></label>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><MapPin className="h-4 w-4" />Restaurant coordinates</p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">Latitude<input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="-33.9" className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-700" /></label>
                <label className="text-xs text-slate-500">Longitude<input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="18.4" className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-700" /></label>
              </div>
            </div>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}Save listing</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}