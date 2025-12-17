import React, { useState, useEffect } from 'react';
import { trackApiCall, trackError, trackComponent, trackStateChange } from '../lib/change-tracker';

// Generic HubSpot object interface
interface HubSpotObject {
  id: string;
  properties: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Specific types for backwards compatibility
interface HubSpotContact extends HubSpotObject {
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    [key: string]: any;
  };
}

interface HubSpotCompany extends HubSpotObject {
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    [key: string]: any;
  };
}

interface HubSpotDeal extends HubSpotObject {
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
    [key: string]: any;
  };
}

// Dynamic data structure
interface HubSpotData {
  objects?: Record<string, HubSpotObject[]>;  // New dynamic format
  summary?: Record<string, any>;               // Dynamic summary
  metadata?: {
    availableObjects?: string[];
    requestedObjects?: string[];
    fetchedAt?: string;
  };
  // Legacy format support
  contacts?: HubSpotContact[];
  companies?: HubSpotCompany[];
  deals?: HubSpotDeal[];
}

interface HubSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: HubSpotContact) => void;
  onSelectDeal?: (deal: HubSpotDeal) => void;
  onSelectCompany?: (company: HubSpotCompany) => void;
}

export function HubSpotModal({ isOpen, onClose, onSelectContact, onSelectDeal, onSelectCompany }: HubSpotModalProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('deals');
  const [availableTabs, setAvailableTabs] = useState<string[]>(['deals', 'contacts', 'companies']);
  const [data, setData] = useState<HubSpotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (isOpen) {
      trackComponent('HubSpotModal', 'mount');
      // Reset states when modal opens to ensure loading state shows first
      setIsLoading(true);
      setIsConnected(null);
      setError(null);
      checkConnectionAndFetchData();
    } else {
      // Reset connecting state when modal closes
      setIsConnecting(false);
      setPopupWindow(null);
      trackComponent('HubSpotModal', 'unmount');
    }
  }, [isOpen]);

  // No longer needed - OAuth callback now shows success page and auto-closes

  // Poll to check if popup closed
  useEffect(() => {
    if (!isConnecting || !popupWindow) return;

    const pollInterval = setInterval(() => {
      if (popupWindow.closed) {
        console.log('OAuth popup closed, checking connection...');
        clearInterval(pollInterval);
        setPopupWindow(null);
        // Keep isConnecting true - it will show loading state
        // Set isLoading true immediately so UI shows loading
        setIsLoading(true);
        // Small delay then check status (isConnecting will be set false after fetch)
        setTimeout(async () => {
          await checkConnectionAndFetchData();
          setIsConnecting(false);
        }, 300);
      }
    }, 300);

    return () => clearInterval(pollInterval);
  }, [isConnecting, popupWindow]);

  const checkConnectionAndFetchData = async () => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Check connection status
      const statusRes = await fetch('http://localhost:3002/api/hubspot/status');
      const statusData = await statusRes.json();
      
      trackApiCall('/api/hubspot/status', 'GET', {
        responseStatus: statusRes.status,
        responseData: { connected: statusData.connected },
        duration: Date.now() - startTime
      });

      if (!statusData.connected) {
        setIsConnected(false);
        setError(statusData.error || 'HubSpot not connected');
        setIsLoading(false);
        trackStateChange('HubSpotModal', 'isConnected', null, false);
        return;
      }

      setIsConnected(true);
      trackStateChange('HubSpotModal', 'isConnected', null, true);

      // Fetch all data
      const dataStartTime = Date.now();
      const dataRes = await fetch('http://localhost:3002/api/hubspot/all?limit=20');
      const hubspotData = await dataRes.json();
      
      trackApiCall('/api/hubspot/all', 'GET', {
        responseStatus: dataRes.status,
        responseData: { 
          objectTypes: hubspotData.objects ? Object.keys(hubspotData.objects) : ['contacts', 'companies', 'deals'],
          totalRecords: hubspotData.summary?.total || 'unknown'
        },
        duration: Date.now() - dataStartTime
      });

      if (hubspotData.error) {
        setError(hubspotData.error);
        trackError('HubSpotModal.tsx', hubspotData.error, { action: 'fetchData' });
      } else {
        // Normalize data format - handle both new (objects) and legacy format
        let normalizedData = hubspotData;
        
        if (hubspotData.objects) {
          // New dynamic format - flatten objects to top level for compatibility
          normalizedData = {
            ...hubspotData,
            contacts: hubspotData.objects.contacts || [],
            companies: hubspotData.objects.companies || [],
            deals: hubspotData.objects.deals || [],
          };
          
          const tabs = Object.keys(hubspotData.objects);
          setAvailableTabs(tabs);
          if (!tabs.includes(activeTab) && tabs.length > 0) {
            setActiveTab(tabs[0]);
          }
        } else if (hubspotData.contacts || hubspotData.companies || hubspotData.deals) {
          // Legacy format - already in correct structure
          const tabs = [];
          if (hubspotData.deals) tabs.push('deals');
          if (hubspotData.contacts) tabs.push('contacts');
          if (hubspotData.companies) tabs.push('companies');
          setAvailableTabs(tabs);
        }
        
        setData(normalizedData);
      }
    } catch (err) {
      const errorMsg = 'Failed to connect to server. Make sure the server is running.';
      setError(errorMsg);
      setIsConnected(false);
      trackError('HubSpotModal.tsx', err instanceof Error ? err : errorMsg, { action: 'checkConnection' });
    } finally {
      setIsLoading(false);
    }
  };

  // Start OAuth flow
  const handleConnectHubSpot = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      'http://localhost:3002/api/hubspot/auth/start',
      'HubSpot OAuth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    
    if (popup) {
      setPopupWindow(popup);
      setIsConnecting(true);
    } else {
      setError('Popup blocked. Please allow popups for this site.');
    }
  };

  // Disconnect from HubSpot
  const handleDisconnect = async () => {
    try {
      await fetch('http://localhost:3002/api/hubspot/disconnect', { method: 'POST' });
      setIsConnected(false);
      setData(null);
      setError('Disconnected from HubSpot');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return '$0';
    const num = parseFloat(amount);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDealStageColor = (stage: string | undefined) => {
    const stageColors: Record<string, string> = {
      'appointmentscheduled': 'bg-blue-100 text-blue-800',
      'qualifiedtobuy': 'bg-purple-100 text-purple-800',
      'presentationscheduled': 'bg-indigo-100 text-indigo-800',
      'decisionmakerboughtin': 'bg-cyan-100 text-cyan-800',
      'contractsent': 'bg-amber-100 text-amber-800',
      'closedwon': 'bg-green-100 text-green-800',
      'closedlost': 'bg-red-100 text-red-800',
    };
    return stageColors[stage || ''] || 'bg-gray-100 text-gray-800';
  };

  const formatStageName = (stage: string | undefined) => {
    if (!stage) return 'Unknown';
    const stageNames: Record<string, string> = {
      'appointmentscheduled': 'Appointment Scheduled',
      'qualifiedtobuy': 'Qualified to Buy',
      'presentationscheduled': 'Presentation Scheduled',
      'decisionmakerboughtin': 'Decision Maker Bought-In',
      'contractsent': 'Contract Sent',
      'closedwon': 'Closed Won',
      'closedlost': 'Closed Lost',
    };
    return stageNames[stage] || stage.replace(/([A-Z])/g, ' $1').trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.233.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.229 1.967v2.862a5.908 5.908 0 0 0-2.687 1.218L6.963 4.26a2.676 2.676 0 1 0-1.31 1.673l6.4 4.793a5.885 5.885 0 0 0 .007 6.066l-1.965 1.965a2.2 2.2 0 1 0 1.31 1.311l1.96-1.96a5.91 5.91 0 1 0 4.8-10.178zm-.964 8.378a2.682 2.682 0 1 1 0-5.364 2.682 2.682 0 0 1 0 5.364z"/>
            </svg>
            <div>
              <h2 className="text-xl font-bold text-white">HubSpot CRM</h2>
              <p className="text-orange-100 text-sm">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show these buttons when connected */}
            {isConnected && (
              <>
                {/* Refresh Button */}
                <button
                  onClick={checkConnectionAndFetchData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                {/* Open in HubSpot Button - use anchor tag for reliable new tab */}
                <a
                  href="https://app.hubspot.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  title="Open HubSpot in new tab"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-sm font-medium">Open HubSpot</span>
                </a>
                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Disconnect from HubSpot"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors ml-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {isLoading || isConnecting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">
                {isConnecting && !isLoading 
                  ? 'Waiting for HubSpot authorization...' 
                  : isConnecting && isLoading 
                    ? 'Loading your HubSpot data...'
                    : 'Connecting to HubSpot...'}
              </p>
              {isConnecting && !isLoading && (
                <p className="mt-2 text-sm text-gray-400">Complete the login in the popup window</p>
              )}
            </div>
          ) : isConnected === false ? (
            /* Explicitly not connected - Show Connect Button */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.233.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.229 1.967v2.862a5.908 5.908 0 0 0-2.687 1.218L6.963 4.26a2.676 2.676 0 1 0-1.31 1.673l6.4 4.793a5.885 5.885 0 0 0 .007 6.066l-1.965 1.965a2.2 2.2 0 1 0 1.31 1.311l1.96-1.96a5.91 5.91 0 1 0 4.8-10.178zm-.964 8.378a2.682 2.682 0 1 1 0-5.364 2.682 2.682 0 0 1 0 5.364z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your HubSpot CRM</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your HubSpot account to access your contacts, companies, and deals directly in OneMindAI.
              </p>
              <button
                onClick={handleConnectHubSpot}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.233.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.229 1.967v2.862a5.908 5.908 0 0 0-2.687 1.218L6.963 4.26a2.676 2.676 0 1 0-1.31 1.673l6.4 4.793a5.885 5.885 0 0 0 .007 6.066l-1.965 1.965a2.2 2.2 0 1 0 1.31 1.311l1.96-1.96a5.91 5.91 0 1 0 4.8-10.178zm-.964 8.378a2.682 2.682 0 1 1 0-5.364 2.682 2.682 0 0 1 0 5.364z"/>
                </svg>
                Connect with HubSpot
              </button>
              <p className="mt-4 text-xs text-gray-400">
                You'll be redirected to HubSpot to authorize access
              </p>
              {error && error !== 'Not connected' && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}
            </div>
          ) : data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-blue-600 text-xs font-medium uppercase">Contacts</p>
                  <p className="text-2xl font-bold text-blue-900">{data.summary?.totalContacts ?? data.contacts?.length ?? 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <p className="text-purple-600 text-xs font-medium uppercase">Companies</p>
                  <p className="text-2xl font-bold text-purple-900">{data.summary?.totalCompanies ?? data.companies?.length ?? 0}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <p className="text-green-600 text-xs font-medium uppercase">Deals</p>
                  <p className="text-2xl font-bold text-green-900">{data.summary?.totalDeals ?? data.deals?.length ?? 0}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <p className="text-amber-600 text-xs font-medium uppercase">Pipeline Value</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency((data.summary?.totalDealValue ?? data.summary?.totalDealsValue ?? 0).toString())}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                {(['deals', 'contacts', 'companies'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {tab === 'deals' ? (data.deals?.length ?? 0) : tab === 'contacts' ? (data.contacts?.length ?? 0) : (data.companies?.length ?? 0)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Deals Tab */}
              {activeTab === 'deals' && (
                <div className="space-y-3">
                  {(data.deals?.length ?? 0) === 0 ? (
                    <p className="text-center text-gray-500 py-8">No deals found</p>
                  ) : (
                    (data.deals ?? []).map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => onSelectDeal?.(deal)}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{deal.properties.dealname || 'Unnamed Deal'}</h4>
                            <p className="text-sm text-gray-500">Close: {formatDate(deal.properties.closedate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">{formatCurrency(deal.properties.amount)}</p>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getDealStageColor(deal.properties.dealstage)}`}>
                              {formatStageName(deal.properties.dealstage)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div className="space-y-3">
                  {(data.contacts?.length ?? 0) === 0 ? (
                    <p className="text-center text-gray-500 py-8">No contacts found</p>
                  ) : (
                    (data.contacts ?? []).map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => onSelectContact?.(contact)}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(contact.properties.firstname?.[0] || contact.properties.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {contact.properties.firstname} {contact.properties.lastname}
                            </h4>
                            <p className="text-sm text-gray-500">{contact.properties.email}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {contact.properties.jobtitle && <p>{contact.properties.jobtitle}</p>}
                            {contact.properties.company && <p className="text-gray-400">{contact.properties.company}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Companies Tab */}
              {activeTab === 'companies' && (
                <div className="space-y-3">
                  {(data.companies?.length ?? 0) === 0 ? (
                    <p className="text-center text-gray-500 py-8">No companies found</p>
                  ) : (
                    (data.companies ?? []).map((company) => (
                      <div
                        key={company.id}
                        onClick={() => onSelectCompany?.(company)}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {(company.properties.name?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{company.properties.name || 'Unnamed Company'}</h4>
                            <p className="text-sm text-gray-500">{company.properties.domain}</p>
                          </div>
                          <div className="text-right text-sm">
                            {company.properties.industry && (
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {company.properties.industry}
                              </span>
                            )}
                            {company.properties.annualrevenue && (
                              <p className="text-green-600 font-medium mt-1">{formatCurrency(company.properties.annualrevenue)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
