import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/AppLayout';

const DashboardPage = lazy(() => import('@/pages/Dashboard'));

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />} />
            <Route
              path="/dashboard"
              element={(
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading dashboard…</div>}>
                  <DashboardPage />
                </Suspense>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AppProvider>
  );
}