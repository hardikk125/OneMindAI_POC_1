import React, { useState, useEffect } from 'react';
import {
  loadBalancesAsync,
  setBalanceAsync,
  exportToCSV,
  importFromCSVAsync,
  BalanceRecord
} from '../lib/balance-tracker';

interface BalanceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BalanceManager({ isOpen, onClose }: BalanceManagerProps) {
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const refreshBalances = async () => {
    const data = await loadBalancesAsync();
    setBalances(data);
  };

  useEffect(() => {
    if (isOpen) {
      refreshBalances();
    }
  }, [isOpen]);

  const handleSetBalance = async (provider: string, engine: string) => {
    const newBalance = parseFloat(editValue);
    if (!isNaN(newBalance) && newBalance >= 0) {
      await setBalanceAsync(provider, newBalance, engine);
      await refreshBalances();
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleExport = () => {
    // This opens a new tab to download the CSV from the API
    exportToCSV();
  };

  const handleImport = async () => {
    if (importText.trim()) {
      await importFromCSVAsync(importText);
      await refreshBalances();
      setShowImport(false);
      setImportText('');
    }
  };

  const getStatusColor = (balance: BalanceRecord) => {
    if (balance.initial_balance === 0) return 'bg-blue-100 text-blue-700'; // Free tier
    if (balance.current_balance <= 0) return 'bg-red-100 text-red-700'; // Empty
    if (balance.current_balance < balance.initial_balance * 0.2) return 'bg-amber-100 text-amber-700'; // Low
    return 'bg-emerald-100 text-emerald-700'; // Good
  };

  const getStatusLabel = (balance: BalanceRecord) => {
    if (balance.initial_balance === 0) return 'Free';
    if (balance.current_balance <= 0) return 'Empty';
    if (balance.current_balance < balance.initial_balance * 0.2) return 'Low';
    return 'Good';
  };

  const walletSize = balances.reduce((sum, b) => sum + b.initial_balance, 0);
  const balanceLeft = balances.reduce((sum, b) => sum + b.current_balance, 0);
  const totalSpent = balances.reduce((sum, b) => sum + b.total_spent, 0);
  const totalTokensIn = balances.reduce((sum, b) => sum + (b.tokens_in || 0), 0);
  const totalTokensOut = balances.reduce((sum, b) => sum + (b.tokens_out || 0), 0);
  const totalEngineCalls = balances.filter(b => b.total_spent > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">API Balance Manager</h2>
              <p className="text-purple-100 text-sm mt-1">Track and manage your API credits</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-purple-100 text-xs uppercase tracking-wide">Wallet Size</p>
              <p className="text-xl font-bold">${walletSize.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-purple-100 text-xs uppercase tracking-wide">Balance Left</p>
              <p className="text-xl font-bold">${balanceLeft.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-purple-100 text-xs uppercase tracking-wide">Current Answer Spent</p>
              <p className="text-xl font-bold">${totalSpent.toFixed(4)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-purple-100 text-xs uppercase tracking-wide">Total AI Engines Called</p>
              <p className="text-xl font-bold">{totalEngineCalls}</p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="border-b px-6 py-3 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 transition-colors"
            >
              📤 Import CSV
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Last updated: {balances[0]?.last_updated ? new Date(balances[0].last_updated).toLocaleString() : 'Never'}
          </p>
        </div>

        {/* Import Section */}
        {showImport && (
          <div className="border-b px-6 py-4 bg-blue-50">
            <p className="text-sm font-medium text-blue-800 mb-2">Paste CSV content:</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-24 p-2 text-xs font-mono border rounded-lg"
              placeholder="provider,engine,initial_balance,current_balance,total_spent,last_updated,currency,notes"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import
              </button>
              <button
                onClick={() => { setShowImport(false); setImportText(''); }}
                className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Balance Table */}
        <div className="overflow-auto max-h-[50vh]">
          <table className="w-full">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Engine</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Initial</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Current</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Spent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tokens In</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tokens Out</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {balances.map((balance) => {
                const id = `${balance.provider}-${balance.engine}`;
                const isEditing = editingId === id;
                
                return (
                  <tr key={id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800 capitalize">{balance.provider}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{balance.engine}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-slate-500">${balance.initial_balance.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSetBalance(balance.provider, balance.engine);
                            if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                          }}
                          className="w-24 px-2 py-1 text-right border rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-slate-800">${balance.current_balance.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-red-600">${balance.total_spent.toFixed(4)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-slate-600">{(balance.tokens_in || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-slate-600">{(balance.tokens_out || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(balance)}`}>
                        {getStatusLabel(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSetBalance(balance.provider, balance.engine)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditValue(''); }}
                            className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(id);
                            setEditValue(balance.current_balance.toString());
                          }}
                          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            💡 Tip: Update your balance after checking your provider's dashboard
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default BalanceManager;
