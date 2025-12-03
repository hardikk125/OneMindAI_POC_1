/**
 * Lazy Loaded Components
 * 
 * Heavy components that are loaded on-demand to reduce initial bundle size.
 * Uses React.lazy() with Suspense fallbacks.
 */

import React, { Suspense } from 'react';

// =============================================================================
// LOADING FALLBACKS
// =============================================================================

export const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center p-8 bg-gray-800/50 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <span className="text-gray-400 text-sm">Loading chart...</span>
    </div>
  </div>
);

export const ExportLoadingFallback = () => (
  <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded animate-pulse">
    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-gray-400 text-sm">Preparing export...</span>
  </div>
);

export const DiagramLoadingFallback = () => (
  <div className="flex items-center justify-center p-12 bg-gray-800/50 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <span className="text-gray-400">Loading diagram...</span>
    </div>
  </div>
);

export const PanelLoadingFallback = () => (
  <div className="p-4 bg-gray-800/50 rounded-lg animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-700 rounded w-1/2" />
  </div>
);

// =============================================================================
// LAZY LOADED COMPONENTS
// =============================================================================

// Mermaid Chart - Heavy diagram library (~300KB)
const LazyMermaidChartComponent = React.lazy(() => import('../MermaidChart'));

// Super Debug Panel - Development tool
const LazySuperDebugPanelComponent = React.lazy(() => import('../SuperDebugPanel'));

// Balance Manager
const LazyBalanceManagerComponent = React.lazy(() => import('../BalanceManager'));

// =============================================================================
// WRAPPED EXPORTS WITH SUSPENSE
// =============================================================================

interface MermaidChartProps {
  chart: string;
  className?: string;
  chartNumber?: number;
}

export const LazyMermaidChart: React.FC<MermaidChartProps> = (props) => (
  <Suspense fallback={<DiagramLoadingFallback />}>
    <LazyMermaidChartComponent {...props} />
  </Suspense>
);

interface SuperDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDebug?: () => void;
}

export const LazySuperDebugPanel: React.FC<SuperDebugPanelProps> = (props) => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <LazySuperDebugPanelComponent {...props} />
  </Suspense>
);

interface BalanceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LazyBalanceManager: React.FC<BalanceManagerProps> = (props) => (
  <Suspense fallback={<PanelLoadingFallback />}>
    <LazyBalanceManagerComponent {...props} />
  </Suspense>
);

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

/**
 * Preload a component before it's needed (e.g., on hover)
 */
export const preloadMermaidChart = () => import('../MermaidChart');
export const preloadChartCodeRenderer = () => import('../ChartCodeRenderer');
export const preloadExportButton = () => import('../ExportButton');
export const preloadSuperDebugPanel = () => import('../SuperDebugPanel');
export const preloadErrorRecoveryPanel = () => import('../ErrorRecoveryPanel');

/**
 * Preload all heavy components (call after initial render)
 */
export const preloadAllHeavyComponents = () => {
  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));
  
  schedulePreload(() => {
    preloadMermaidChart();
    preloadChartCodeRenderer();
    preloadExportButton();
  });
};
