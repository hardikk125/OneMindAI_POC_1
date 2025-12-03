import React, { useState } from 'react';
import { Download, FileText, File } from 'lucide-react';
import { exportToWord, exportToPDF, ExportData } from '../lib/export-utils';

interface ExportButtonProps {
  data: ExportData;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export function ExportButton({ data, variant = 'default', className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'word' | 'pdf') => {
    setIsExporting(true);
    setError(null);
    setShowMenu(false);

    try {
      if (format === 'word') {
        await exportToWord(data);
      } else {
        await exportToPDF(data);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'icon-only') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isExporting}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
          title="Export response"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
              <button
                onClick={() => handleExport('word')}
                disabled={isExporting}
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Export as Word</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 disabled:opacity-50 border-t border-gray-100"
              >
                <File className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Export as PDF</span>
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="absolute right-0 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 z-20 whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isExporting}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
              <button
                onClick={() => handleExport('word')}
                disabled={isExporting}
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Export as Word</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 disabled:opacity-50 border-t border-gray-100"
              >
                <File className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Export as PDF</span>
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="absolute right-0 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 z-20">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={() => handleExport('word')}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isExporting ? 'Exporting...' : 'Export to Word'}
          </span>
        </button>

        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <File className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isExporting ? 'Exporting...' : 'Export to PDF'}
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Export dropdown menu component (similar to "Copy All" button style)
 */
export function ExportDropdown({ data, className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'word' | 'pdf') => {
    setIsExporting(true);
    setError(null);
    setShowMenu(false);

    try {
      if (format === 'word') {
        await exportToWord(data);
      } else {
        await exportToPDF(data);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[101] overflow-visible" style={{ minWidth: '220px' }}>
            <div className="p-2 space-y-1">
              <button
                onClick={() => handleExport('word')}
                disabled={isExporting}
                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 rounded-md transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Word Document</div>
                  <div className="text-xs text-gray-500">.docx format</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="w-full px-3 py-2.5 text-left hover:bg-red-50 rounded-md transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <File className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">PDF Document</div>
                  <div className="text-xs text-gray-500">.pdf format</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 z-20 shadow-lg max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
