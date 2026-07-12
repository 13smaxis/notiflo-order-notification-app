
import React from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { AppLayout } from '@/components/AppLayout';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default Index;
