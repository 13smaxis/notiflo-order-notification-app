import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { LayoutDashboard, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
  const { userRole, user } = useAppContext();
  const navigate = useNavigate();
  const isOwner = userRole === 'owner';

  useEffect(() => {
    if (user && !isOwner) {
      navigate('/', { replace: true });
    }
  }, [isOwner, navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white p-6">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to board
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-amber-200 text-sm mb-4">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Owner dashboard</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                {isOwner
                  ? 'This page is reserved for owner-level reporting, employee management, and operational controls.'
                  : 'You do not have access to this dashboard.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Signed in as</p>
              <p className="mt-2 font-semibold">{user?.display_name || user?.phone || user?.email || 'Guest'}</p>
              <p className="text-sm text-slate-300">Role: {userRole || 'unknown'}</p>
            </div>
          </div>

          {!isOwner && (
            <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-center gap-3 text-amber-100">
              <ShieldAlert className="w-5 h-5" />
              <span>Only owner accounts can use the dashboard button.</span>
            </div>
          )}

          {isOwner && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
                <p className="text-sm text-slate-400">Employees</p>
                <p className="mt-2 text-2xl font-bold">Coming soon</p>
              </div>
              <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
                <p className="text-sm text-slate-400">Sales</p>
                <p className="mt-2 text-2xl font-bold">Coming soon</p>
              </div>
              <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
                <p className="text-sm text-slate-400">Activity</p>
                <p className="mt-2 text-2xl font-bold">Coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}