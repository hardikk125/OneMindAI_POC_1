import React, { useState } from 'react';
import { trackApiCall, trackError, trackChange } from '../lib/change-tracker';

interface HubSpotSendButtonProps {
  componentContent: string;
  componentType: string;
  onSendStart?: () => void;
  onSendComplete?: (success: boolean, message: string) => void;
}

export function HubSpotSendButton({ 
  componentContent, 
  componentType,
  onSendStart,
  onSendComplete 
}: HubSpotSendButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  const sendToHubspot = async () => {
    setIsSending(true);
    setResult(null);
    onSendStart?.();
    
    const startTime = Date.now();
    
    try {
      // Extract company name from content (first line or heading)
      const lines = componentContent.split('\n').filter(l => l.trim());
      const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').trim() || 'Unknown Company';
      const companyName = firstLine.replace(/^\d+\.\s*\*?\*?/, '').replace(/\*?\*?$/, '').trim();
      
      // Extract domain from company name (simple heuristic)
      const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      
      const requestBody = {
        name: companyName,
        domain: domain,
        industry: 'Technology',
        description: componentContent.substring(0, 500)
      };
      
      const res = await fetch('http://localhost:3002/api/hubspot/companies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      const duration = Date.now() - startTime;
      
      // Track API call
      trackApiCall('/api/hubspot/companies/create', 'POST', {
        requestBody,
        responseStatus: res.status,
        responseData: data,
        duration
      });
      
      if (data.success) {
        const message = data.exists 
          ? `"${companyName}" already exists in HubSpot` 
          : `"${companyName}" added to HubSpot!`;
        setResult({ success: true, message });
        onSendComplete?.(true, message);
        
        trackChange('HubSpotSendButton.tsx', `Company sent to HubSpot: ${companyName}`, {
          changeType: 'api',
          metadata: { companyName, exists: data.exists }
        });
      } else {
        const message = data.error || 'Failed to send to HubSpot';
        setResult({ success: false, message });
        onSendComplete?.(false, message);
        
        trackError('HubSpotSendButton.tsx', message, { companyName, response: data });
      }
    } catch (error) {
      const message = 'Connection error. Is HubSpot connected?';
      setResult({ success: false, message });
      onSendComplete?.(false, message);
      
      trackError('HubSpotSendButton.tsx', error instanceof Error ? error : message, {
        action: 'sendToHubspot'
      });
    } finally {
      setIsSending(false);
      // Clear result after 3 seconds
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={sendToHubspot}
        disabled={isSending}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded transition disabled:opacity-50"
        title="Send to HubSpot CRM"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.233.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.229 1.967v2.862a5.908 5.908 0 0 0-2.687 1.218L6.963 4.26a2.676 2.676 0 1 0-1.31 1.673l6.4 4.793a5.885 5.885 0 0 0 .007 6.066l-1.965 1.965a2.2 2.2 0 1 0 1.31 1.311l1.96-1.96a5.91 5.91 0 1 0 4.8-10.178zm-.964 8.378a2.682 2.682 0 1 1 0-5.364 2.682 2.682 0 0 1 0 5.364z"/>
        </svg>
        {isSending ? 'Sending...' : 'HubSpot'}
      </button>

      {/* Result Toast */}
      {result && (
        <div className={`absolute top-full mt-2 right-0 px-3 py-2 rounded-lg text-xs font-medium shadow-lg z-10 whitespace-nowrap ${
          result.success 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {result.success ? '✓' : '✕'} {result.message}
        </div>
      )}
    </div>
  );
}
