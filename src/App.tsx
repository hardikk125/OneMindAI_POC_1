// =============================================================================
// Main App Router - Routes between OneMindAI and Admin Panel
// =============================================================================

import React, { useState, useEffect } from 'react';
import OneMindAI from './OneMindAI';
import { AdminApp } from './admin';

export default function App() {
  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');

  // Check URL on mount and when it changes
  useEffect(() => {
    const checkUrl = () => {
      const path = window.location.pathname;
      if (path.includes('/admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('app');
      }
    };

    // Check on mount
    checkUrl();

    // Listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', checkUrl);
    return () => window.removeEventListener('popstate', checkUrl);
  }, []);

  // Update URL when view changes
  const handleSetView = (view: 'app' | 'admin') => {
    setCurrentView(view);
    if (view === 'admin') {
      window.history.pushState({}, '', '/admin/config');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  if (currentView === 'admin') {
    return (
      <AdminApp onExit={() => handleSetView('app')} />
    );
  }

  return (
    <OneMindAI onOpenAdmin={() => handleSetView('admin')} />
  );
}
