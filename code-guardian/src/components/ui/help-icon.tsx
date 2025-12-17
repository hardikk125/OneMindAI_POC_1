/**
 * HelpIcon Component (Code Guardian)
 * 
 * A reusable help icon that displays contextual help information in a modal.
 * Added: 2025-12-09
 * Purpose: Provide contextual help for each page/component
 */

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface HelpIconProps {
  title: string;
  description: string;
  features?: string[];
  tips?: string[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
};

const positionMap = {
  'top-right': 'fixed top-4 right-4 z-50',
  'top-left': 'fixed top-4 left-4 z-50',
  'bottom-right': 'fixed bottom-4 right-4 z-50',
  'bottom-left': 'fixed bottom-4 left-4 z-50',
  'inline': 'inline-flex',
};

export function HelpIcon({
  title,
  description,
  features = [],
  tips = [],
  position = 'top-right',
  size = 'md',
  className = '',
}: HelpIconProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${positionMap[position]} ${className} p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 group`}
        aria-label="Help"
        title="Click for help"
      >
        <HelpCircle 
          size={sizeMap[size]} 
          className="text-blue-400 group-hover:text-blue-300 transition-colors"
        />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <HelpCircle size={24} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">About</h3>
                <p className="text-gray-300 leading-relaxed">{description}</p>
              </div>

              {features.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Key Features</h3>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Tips</h3>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-yellow-400 mt-1">💡</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <p className="text-xs text-gray-500 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">ESC</kbd> or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HelpIcon;
