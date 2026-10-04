import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Ban,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Store,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { apiUrl } from '@/lib/api';

type Period = 'today' | '7d' | 'month' | 'custom';

const dateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
}).format(value);

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(date);
};

const stageStyles: Record<string, string> = {
  queue: 'bg-slate-100 text-slate-700',
  preparing: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  collected: 'bg-sky-100 text-sky-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const chartColors = ['#158f78', '#d99024', '#3187a7', '#6c7b8d', '#c65353'];

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  surface,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  surface: string;
}) {
  return (
    <article className={`group min-w-0 rounded-lg border border-l-4 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:p-5 ${surface}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[1.7rem] font-semibold tabular-nums text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ring-black/5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function ChartPanel({ title, caption, accent, surface, children }: { title: string; caption: string; accent: string; surface: string; children: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-lg border p-4 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:p-5 ${surface}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${accent}`} />
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{caption}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, selectStore } = useAuth();
  const navigate = useNavigate();
  const today = dateInputValue(new Date());
  const [period, setPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [storeNameError, setStoreNameError] = useState<string | null>(null);
  const storeIdsKey = user?.availableStores.map((store) => store.store_id).filter(Boolean).join(',') ?? '';

  useEffect(() => {
    const storeIds = storeIdsKey ? storeIdsKey.split(',') : [];
    if (!storeIds.length || !user?.accessToken) {
      setStoreNames({});
      setStoreNameError(null);
      return;
    }

    let active = true;
    setStoreNames({});
    setStoreNameError(null);

    void (async () => {
      try {
        const response = await fetch(apiUrl('/api/dashboard/stores'), {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        const result = await response.json() as {
          stores?: Array<{ store_id: string; store_name: string }>;
          error?: string;
        };

        if (!response.ok) throw new Error(result.error || 'Unable to load store names.');
        if (!active) return;
        setStoreNames(Object.fromEntries((result.stores || []).map((store) => [store.store_id, store.store_name])));
      } catch (error) {
        if (!active) return;
        setStoreNameError(error instanceof Error ? error.message : 'Unable to load store names.');
      }
    })();

    return () => { active = false; };
  }, [storeIdsKey, user?.accessToken]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/', { replace: true });
    if (!authLoading && user && user.profile?.role?.toLowerCase() !== 'owner') {
      navigate('/', { replace: true });
    }
  }, [authLoading, navigate, user]);

  const storeId = user?.selectedStoreId ?? user?.profile?.store_id ?? null;
  const activeStore = user?.availableStores.find((store) => store.store_id === storeId);
  let startDate = today;
  let endDate = today;

  if (period === '7d') {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    startDate = dateInputValue(start);
  } else if (period === 'month') {
    const start = new Date();
    start.setDate(1);
    startDate = dateInputValue(start);
  } else if (period === 'custom') {
    startDate = customStart;
    endDate = customEnd;
  }

  const invalidRange = startDate > endDate;
  const { metrics, loading, error, warnings, refresh } = useDashboardData(storeId, startDate, endDate);
  const rangeLabel = startDate === endDate
    ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(`${startDate}T12:00:00`))
    : `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Checking access…</span>
      </div>
    );
  }

  if (user?.profile?.role?.toLowerCase() !== 'owner') return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f1f5f3] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(21,90,76,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(21,90,76,0.035)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <header className="relative border-b border-emerald-950/30 bg-[#173e38] text-white shadow-[0_4px_18px_rgba(12,43,38,0.16)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/5 text-emerald-50 transition hover:bg-white/10 hover:text-white"
              aria-label="Back to order board"
              title="Back to order board"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e8b653] text-[#173e38] shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/75">NotiFlo / Owner</p>
              <h1 className="truncate text-lg font-semibold text-white">Operations dashboard</h1>
            </div>
          </div>

          <label className="relative flex min-w-[210px] items-center gap-2">
            <Store className="pointer-events-none absolute left-3 h-4 w-4 text-emerald-100" />
            <select
              value={storeId ?? ''}
              onChange={(event) => selectStore(event.target.value)}
              className="h-10 w-full appearance-none rounded-md border border-white/20 bg-white/10 pl-9 pr-9 text-sm font-medium text-white outline-none transition focus:border-[#e8b653] focus:ring-2 focus:ring-[#e8b653]/30"
              aria-label="Select store"
            >
              <option value="" disabled>Select a store</option>
              {user?.availableStores.map((store) => (
                <option key={store.store_id} value={store.store_id} className="bg-white text-slate-900">
                  {storeNames[store.store_id] || store.store_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-emerald-100" />
          </label>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {storeNameError && (
          <div role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {storeNameError} Showing available profile names instead.
          </div>
        )}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              {activeStore ? storeNames[activeStore.store_id] || activeStore.store_name : 'Store overview'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Performance at a glance</h2>
            <p className="mt-1 text-sm text-slate-600">Orders and service outcomes for {rangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading || invalidRange || !storeId}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/" className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800">
              <PackageCheck className="h-4 w-4" />
              Open order board
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-[#e4eee9] p-3 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Reporting period">
            {([
              ['today', 'Today'],
              ['7d', 'Last 7 days'],
              ['month', 'This month'],
              ['custom', 'Custom'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                aria-pressed={period === value}
                className={`h-8 rounded-md px-3 text-sm font-medium transition ${period === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <label className="sr-only" htmlFor="dashboard-start-date">Start date</label>
            <input
              id="dashboard-start-date"
              type="date"
              value={period === 'custom' ? customStart : startDate}
              onChange={(event) => { setCustomStart(event.target.value); setPeriod('custom'); }}
              className="h-9 min-w-0 rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
            <span className="text-sm text-slate-400">to</span>
            <label className="sr-only" htmlFor="dashboard-end-date">End date</label>
            <input
              id="dashboard-end-date"
              type="date"
              value={period === 'custom' ? customEnd : endDate}
              onChange={(event) => { setCustomEnd(event.target.value); setPeriod('custom'); }}
              className="h-9 min-w-0 rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </section>

        {invalidRange && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            End date must be the same as or later than the start date.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Dashboard data could not be loaded: {error}
          </div>
        )}
        {warnings.map((warning) => (
          <div key={warning} role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </div>
        ))}

        {!storeId ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Store className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">Choose a store to view performance</h3>
            <p className="mt-1 text-sm text-slate-500">Select one of your stores above to load its orders and sales.</p>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
              <StatCard label="Orders" value={loading ? '—' : metrics.orderCount.toLocaleString('en-ZA')} detail={`${metrics.activeOrderCount} active · ${metrics.cancelledOrderCount} cancelled`} icon={PackageCheck} tone="bg-sky-200 text-sky-900" surface="border-sky-300 bg-[#e2eef2]" />
              <StatCard label="Net sales" value={loading ? '—' : formatCurrency(metrics.revenue)} detail="Excludes cancelled orders" icon={CircleDollarSign} tone="bg-emerald-200 text-emerald-900" surface="border-emerald-300 bg-[#dcece4]" />
              <StatCard label="Average order value" value={loading ? '—' : formatCurrency(metrics.averageOrderValue)} detail="Per non-cancelled order" icon={ChartNoAxesCombined} tone="bg-amber-200 text-amber-950" surface="border-amber-300 bg-[#f4edd9]" />
              <StatCard label="Cancelled" value={loading ? '—' : metrics.cancelledOrderCount.toLocaleString('en-ZA')} detail="Preserved for reporting" icon={Ban} tone="bg-rose-200 text-rose-900" surface="border-rose-300 bg-[#f2e4df]" />
            </section>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading reporting data…
              </div>
            ) : (
              <>
                <section className="overflow-hidden rounded-lg border border-emerald-200 bg-[#e7f0eb] shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-[#dce9e2] px-4 py-4 sm:px-5">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Recent orders</h2>
                      <p className="mt-1 text-xs text-slate-500">Latest orders created during this reporting period</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Activity className="h-3.5 w-3.5" /> {metrics.recentOrders.length} shown</span>
                  </div>
                  {metrics.recentOrders.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="bg-[#d2e2da] text-xs uppercase tracking-wide text-slate-700">
                          <tr>
                            <th className="px-5 py-3 font-medium">Order</th>
                            <th className="px-5 py-3 font-medium">Created</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100 bg-[#edf4f0]">
                          {metrics.recentOrders.map((order) => {
                            const stage = order.status?.status_code || 'queue';
                            return (
                              <tr key={order.order_id} className="text-slate-700 transition-colors odd:bg-white/35 hover:bg-emerald-100/70">
                                <td className="px-5 py-3.5 font-semibold text-slate-900">#{order.order_number}</td>
                                <td className="px-5 py-3.5 text-slate-500">{new Date(order.created_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageStyles[stage] || stageStyles.queue}`}>{order.status?.status_name || stage}</span></td>
                                <td className="px-5 py-3.5 text-right font-medium tabular-nums">{formatCurrency(Number(order.total_amount) || 0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">No orders in this date range.</p>
                  )}
                </section>

                <section className="grid min-w-0 gap-4 xl:grid-cols-[1.55fr_1fr]">
                  <ChartPanel title="Sales by day" caption="Net sales from orders created in the selected period" accent="bg-emerald-700" surface="border-emerald-200 bg-[#e1eee7]">
                    {metrics.dailySales.length ? (
                      <div className="h-[280px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.dailySales} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tickFormatter={formatDateLabel} tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tickFormatter={(value: number) => `R${Math.round(value)}`} tickLine={false} axisLine={false} width={58} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                              labelFormatter={(label) => formatDateLabel(String(label))}
                              formatter={(value: number) => [formatCurrency(Number(value)), 'Net sales']}
                              contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                            />
                            <Bar dataKey="revenue" fill="#158f78" radius={[4, 4, 0, 0]} maxBarSize={42} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <EmptyChart message="No orders were created during this period." />}
                  </ChartPanel>

                  <ChartPanel title="Order status mix" caption="Current status of orders created in the selected period" accent="bg-sky-700" surface="border-sky-200 bg-[#e4eef2]">
                    {metrics.stageCounts.length ? (
                      <div className="h-[280px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={metrics.stageCounts} dataKey="count" nameKey="name" innerRadius="57%" outerRadius="78%" paddingAngle={3} stroke="none">
                              {metrics.stageCounts.map((entry, index) => <Cell key={entry.code} fill={chartColors[index % chartColors.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                            <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <EmptyChart message="Status mix will appear when orders are created." />}
                  </ChartPanel>
                </section>

                <section className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <ChartPanel title="Sales by employee" caption="Order creator attribution; earlier unattributed orders appear as Unassigned" accent="bg-amber-600" surface="border-amber-200 bg-[#f4eedf]">
                    {metrics.employeeSales.length ? (
                      <div className="h-[280px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.employeeSales} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                            <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tickFormatter={(value: number) => `R${Math.round(value)}`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={108} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                            <Tooltip formatter={(value: number) => [formatCurrency(Number(value)), 'Sales']} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="revenue" fill="#d99024" radius={[0, 4, 4, 0]} maxBarSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <EmptyChart message="Employee sales will appear when orders are attributed to a store employee." />}
                  </ChartPanel>

                  <ChartPanel title="Notification outcomes" caption="SMS and WhatsApp deliveries created during the selected period" accent="bg-rose-600" surface="border-rose-200 bg-[#f2e8e4]">
                    {metrics.notificationOutcomes.length ? (
                      <div className="h-[280px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={metrics.notificationOutcomes.map((item) => ({ ...item, name: `${item.channel.toUpperCase()} · ${item.status}` }))}
                              dataKey="count"
                              nameKey="name"
                              innerRadius="55%"
                              outerRadius="77%"
                              paddingAngle={2}
                              stroke="none"
                            >
                              {metrics.notificationOutcomes.map((item, index) => (
                                <Cell key={`${item.channel}-${item.status}`} fill={item.status === 'sent' ? '#158f78' : item.status === 'failed' ? '#c65353' : item.status === 'pending' ? '#d99024' : chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <EmptyChart message="No notification delivery records for this period." />}
                  </ChartPanel>
                </section>

              </>
            )}
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span>{user?.display_name || user?.email || 'Owner'} · owner access</span>
          <span>Reporting period: {rangeLabel}</span>
        </footer>
      </div>
    </main>
  );
}