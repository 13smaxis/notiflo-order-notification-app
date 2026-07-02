import React from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/AppLayout';

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AppLayout />
      </ThemeProvider>
    </AppProvider>
  );
}