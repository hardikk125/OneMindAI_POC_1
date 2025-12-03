// =============================================================================
// Main App Router - Routes between OneMindAI and Admin Panel
// =============================================================================

import React, { useState } from 'react';
import OneMindAI from './OneMindAI';
import { AdminApp } from './admin';

export default function App() {
  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');

  if (currentView === 'admin') {
    return (
      <AdminApp onExit={() => setCurrentView('app')} />
    );
  }

  return (
    <OneMindAI onOpenAdmin={() => setCurrentView('admin')} />
  );
}
