import React, { useState, useEffect } from 'react';
import { UploadedFile, processFilesWithValidation, FILE_LIMITS } from '../lib/file-utils';
import { BarChart } from './BarChart';
import { GlowEffect } from './ui/glow-effect';
import { TextMorph } from './ui/text-morph';
import { HubSpotModal } from './HubSpotModal';

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  defaultTab?: 'perspective' | string;
  perspectiveOnly?: boolean;
  integrationsOnly?: boolean; // Show only integration buttons (for Actions tab on page 4)
}

export function FileUploadZone({ files, onFilesChange, disabled = false, defaultTab, perspectiveOnly = false, integrationsOnly = false }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<'crm' | 'sharepoint' | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [showPerspective, setShowPerspective] = useState(defaultTab === 'perspective' || perspectiveOnly);
  const [perspectiveTab, setPerspectiveTab] = useState<'persona' | 'business' | 'competitors' | 'market-trends'>('persona');
  const [showCrmPopup, setShowCrmPopup] = useState(false);
  const [showSharepointPopup, setShowSharepointPopup] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showStrategicActions, setShowStrategicActions] = useState(false);
  const [strategicActionsTab, setStrategicActionsTab] = useState<'recommendations' | 'custom'>('recommendations');
  const [echoIntelligenceAvailable, setEchoIntelligenceAvailable] = useState<boolean | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<{ [key: string]: boolean }>({});
  const [showHubSpotModal, setShowHubSpotModal] = useState(false);

  // CRM Integration options with SVG logos
  const crmIntegrations = [
    { id: 'salesforce', name: 'Salesforce', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.16 5.22c-.45 0-.884-.06-1.305-.165a3.91 3.91 0 0 1-3.39 1.98c-.57 0-1.11-.12-1.605-.345a4.668 4.668 0 0 1-4.2 2.655 4.665 4.665 0 0 1-4.17-2.595 3.51 3.51 0 0 1-.63.06C1.575 17.894 0 16.29 0 14.324c0-1.38.78-2.565 1.92-3.15a4.375 4.375 0 0 1-.345-1.71c0-2.43 1.965-4.395 4.395-4.395 1.44 0 2.715.69 3.516 1.755l.52-.409z" fill="#00A1E0"/>
      </svg>
    )},
    { id: 'hubspot', name: 'HubSpot', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.233.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.229 1.967v2.862a5.908 5.908 0 0 0-2.687 1.218L6.963 4.26a2.676 2.676 0 1 0-1.31 1.673l6.4 4.793a5.885 5.885 0 0 0 .007 6.066l-1.965 1.965a2.2 2.2 0 1 0 1.31 1.311l1.96-1.96a5.91 5.91 0 1 0 4.8-10.178zm-.964 8.378a2.682 2.682 0 1 1 0-5.364 2.682 2.682 0 0 1 0 5.364z" fill="#FF7A59"/>
      </svg>
    )},
    { id: 'dynamics', name: 'MS Dynamics', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" fill="#00BCF2"/>
      </svg>
    )},
    { id: 'zoho', name: 'Zoho CRM', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#E42527"/>
      </svg>
    )},
    { id: 'pipedrive', name: 'Pipedrive', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm4-8a4 4 0 1 1-4-4 4 4 0 0 1 4 4z" fill="#017737"/>
      </svg>
    )},
  ];

  // SharePoint/Collaboration Integration options with SVG logos
  const collaborationIntegrations = [
    { id: 'sharepoint', name: 'SharePoint', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M11.5 21a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" fill="#036C70"/>
        <path d="M18.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" fill="#1A9BA1"/>
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="#37C6D0"/>
      </svg>
    )},
    { id: 'slack', name: 'Slack', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.522 2.521 2.528 2.528 0 0 1-2.52-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.522 2.527 2.527 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z" fill="#ECB22E"/>
      </svg>
    )},
    { id: 'jira', name: 'Jira', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005z" fill="#2684FF"/>
        <path d="M17.11 5.953H5.538a5.218 5.218 0 0 0 5.233 5.214h2.129v2.058a5.218 5.218 0 0 0 5.214 5.233V6.958a1.005 1.005 0 0 0-1.005-1.005z" fill="url(#jira-gradient-1)"/>
        <path d="M22.647.393H11.075a5.217 5.217 0 0 0 5.233 5.214h2.129v2.058A5.218 5.218 0 0 0 23.65 12.88V1.398a1.005 1.005 0 0 0-1.004-1.005z" fill="url(#jira-gradient-2)"/>
        <defs>
          <linearGradient id="jira-gradient-1" x1="12.132" y1="5.953" x2="5.538" y2="18.458" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0052CC"/>
            <stop offset="1" stopColor="#2684FF"/>
          </linearGradient>
          <linearGradient id="jira-gradient-2" x1="17.67" y1=".393" x2="11.076" y2="12.898" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0052CC"/>
            <stop offset="1" stopColor="#2684FF"/>
          </linearGradient>
        </defs>
      </svg>
    )},
    { id: 'teams', name: 'MS', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M20.625 8.5h-5.25a.875.875 0 0 0-.875.875v5.25c0 .483.392.875.875.875h5.25a.875.875 0 0 0 .875-.875v-5.25a.875.875 0 0 0-.875-.875z" fill="#5059C9"/>
        <circle cx="18" cy="5.5" r="2.5" fill="#5059C9"/>
        <path d="M13.5 8H5.25A1.25 1.25 0 0 0 4 9.25v7.5A1.25 1.25 0 0 0 5.25 18h8.25a1.25 1.25 0 0 0 1.25-1.25v-7.5A1.25 1.25 0 0 0 13.5 8z" fill="#7B83EB"/>
        <circle cx="9.5" cy="5" r="3" fill="#7B83EB"/>
      </svg>
    )},
    { id: 'notion', name: 'Notion', logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.02c-.42-.326-.98-.7-2.055-.607L3.01 2.72c-.466.046-.56.28-.374.466l1.823 1.022zm.793 3.172v13.851c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.354c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.886zm14.337.7c.093.42 0 .84-.42.886l-.7.14v10.264c-.606.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.933l-4.571-7.186v6.953l1.446.327s0 .84-1.166.84l-3.219.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.093-.42.14-1.026.793-1.073l3.452-.233 4.758 7.279v-6.44l-1.213-.14c-.093-.513.28-.886.746-.933l3.219-.186z" fill="#000"/>
      </svg>
    )},
  ];

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const { files: newFiles, errors } = await processFilesWithValidation(droppedFiles, files);
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      setTimeout(() => setUploadErrors([]), 5000); // Clear after 5s
    }
    
    onFilesChange([...files, ...newFiles]);
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const selectedFiles = Array.from(e.target.files || []);
    const { files: newFiles, errors } = await processFilesWithValidation(selectedFiles, files);
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      setTimeout(() => setUploadErrors([]), 5000); // Clear after 5s
    }
    
    onFilesChange([...files, ...newFiles]);
  };

  // Remove file
  const removeFile = (index: number) => {
    if (disabled) return;
    onFilesChange(files.filter((_, i) => i !== index));
  };

  // Toggle company expansion
  const toggleCompany = (companyName: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  // Check if Echo Intelligence server is available
  useEffect(() => {
    if (perspectiveTab === 'persona') {
      const checkEchoIntelligence = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch('http://localhost:3005', {
            method: 'HEAD',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          setEchoIntelligenceAvailable(response.ok);
        } catch (error) {
          setEchoIntelligenceAvailable(false);
        }
      };
      
      checkEchoIntelligence();
    }
  }, [perspectiveTab]);

  return (
    <div className="space-y-3">
      {/* File Upload & Integration Buttons - Hidden in perspectiveOnly mode */}
      {!perspectiveOnly && (
        <div className="flex flex-col gap-2">
          {/* Attach Files Button Row - At Top (hidden in integrationsOnly mode) */}
          {!integrationsOnly && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="*"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white w-[160px]"
              >
                <span className="font-medium">Attach Files</span>
              </button>
              {/* Tips - Next to Attach Files */}
              <div className="text-xs text-gray-500 flex items-center gap-3">
                <span>💡 Paste with <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl/Cmd+V</kbd></span>
                <span>📁 All file types supported</span>
              </div>
            </div>
          )}
          

          {/* Integration Buttons - Stacked Vertically */}
          <div className="flex flex-col gap-2">
            {/* CRM Button with Moving Logos on Right */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white w-[160px]"
              >
                <span className="font-medium">CRM</span>
              </button>
              {/* CRM Logos - Static Dock with Names */}
              <div className="flex items-center gap-2">
                {crmIntegrations.map((crm) => (
                  <div key={crm.id} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        if (crm.id === 'hubspot') {
                          setShowHubSpotModal(true);
                        } else {
                          alert(`${crm.name} Integration coming soon!\n\nConnect to ${crm.name} to sync your customer data.`);
                        }
                      }}
                      disabled={disabled}
                      className={`w-7 h-7 flex-shrink-0 rounded-full bg-white border flex items-center justify-center transition-all disabled:opacity-50 ${
                        crm.id === 'hubspot' 
                          ? 'border-orange-300 hover:border-orange-500 hover:bg-orange-50 ring-2 ring-orange-200' 
                          : 'border-slate-200 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                      title={crm.id === 'hubspot' ? 'HubSpot (Connected)' : crm.name}
                    >
                      {crm.logo}
                    </button>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${crm.id === 'hubspot' ? 'text-orange-600' : 'text-gray-600'}`}>
                      {crm.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Collaboration Tools Button with Moving Logos on Right - Below CRM */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white w-[160px]"
              >
                <span className="font-medium">Collaboration Tools</span>
              </button>
              {/* Collaboration Logos - Static Dock with Names */}
              <div className="flex items-center gap-2">
                {collaborationIntegrations.map((tool) => (
                  <div key={tool.id} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        alert(`${tool.name} Integration coming soon!\n\nConnect to ${tool.name} for seamless collaboration.`);
                      }}
                      disabled={disabled}
                      className="w-7 h-7 flex-shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50"
                      title={tool.name}
                    >
                      {tool.logo}
                    </button>
                    <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategic Actions Panel (only in integrationsOnly mode) */}
          {integrationsOnly && showStrategicActions && (
            <div className="mt-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setShowStrategicActions(false)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Integrations
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-2">
                    Strategic Actions for Your Growth
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Curated recommendations based on your unique profile, or generate custom actions aligned to your specific goals.
                  </p>
                </div>
                
                {/* Tab Buttons */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setStrategicActionsTab('recommendations')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      strategicActionsTab === 'recommendations'
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      Echo-Intelligence Recommends
                    </span>
                  </button>
                  <button
                    onClick={() => setStrategicActionsTab('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      strategicActionsTab === 'custom'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">⊕</span>
                      What Would You Want to Do?
                    </span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[400px] overflow-y-auto">
                {strategicActionsTab === 'recommendations' && (
                  <div className="space-y-4">
                    {/* Curated Header */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          W
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">Curated for WESCO International</h4>
                          <p className="text-slate-400 text-xs">Based on your unique profile, scores, and strategic positioning</p>
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        These recommendations are not generic advice. They are specifically crafted from your market position, competitive landscape analysis, and growth trajectory. Each action is designed to leverage your unique strengths and address your specific growth opportunities.
                      </p>
                    </div>

                    {/* Recommendation Cards */}
                    <div className="space-y-3">
                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-purple-500/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-purple-400">●</span>
                              <h5 className="text-white font-semibold text-sm">Build National Data Center & AI Infrastructure Unit</h5>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              Hyperscale + enterprise AI is the #1 structural growth engine through 2035. Create dedicated DC network hubs, specialized BOM teams, vendor alliances, and pre-staging centers.
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">2 recommendations</span>
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">Impact: Revolutionary</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">12-18 months</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-green-500/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-green-400">●</span>
                              <h5 className="text-white font-semibold text-sm">Accelerate Utility/T&D Expansion</h5>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              Utility spend is the most recession-proof vertical. Expand utility yards, build OEM partnerships, acquire regional utility specialists for high-stability revenue.
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">Impact: Very High</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">18-24 months</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-400">●</span>
                              <h5 className="text-white font-semibold text-sm">Launch AI-Powered Pricing Platform</h5>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              Digital sophistication is becoming a hard moat in distribution. Integrate AI for dynamic pricing, procurement APIs, predictive lead-time visibility for 100-200 bps margin lift.
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">Impact: High</span>
                            <span className="px-2 py-1 bg-slate-500/20 text-slate-300 text-xs rounded-full">6-12 months</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-cyan-500/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-cyan-400">●</span>
                              <h5 className="text-white font-semibold text-sm">Strengthen Contractor Channel via Branch Strategy 2.0</h5>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              Contractor market remains margin-rich and brand-defining. Selective branch densification, enhanced counter experience, fast-lane fulfillment.
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">Impact: Medium-High</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">12-24 months</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {strategicActionsTab === 'custom' && (
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-white font-semibold mb-2">What would you like to achieve?</h4>
                      <p className="text-slate-400 text-xs mb-4">
                        Describe your specific goals or challenges, and we'll generate tailored strategic actions.
                      </p>
                      <textarea
                        placeholder="E.g., 'I want to expand into the European market' or 'How can I improve margins in the contractor segment?'"
                        className="w-full h-24 bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white text-sm placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                      />
                      <button className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                        Generate Custom Actions
                      </button>
                    </div>

                    <div className="text-center text-slate-500 text-xs py-4">
                      Custom actions will appear here based on your input
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Other Integrations Button (hidden in integrationsOnly mode) */}
          {!integrationsOnly && (
            <button
              type="button"
              onClick={() => {
                alert('Other Integrations\n\nMore integration options coming soon:\n• Google Drive\n• Dropbox\n• OneDrive\n• Slack\n• And more...');
              }}
              disabled={disabled}
              className="px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border-gray-300 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-center gap-1.5 w-[160px] h-10"
            >
              <span className="text-xl font-bold leading-none">+</span>
              <span className="font-medium whitespace-nowrap">Other Integrations</span>
            </button>
          )}
          
          {/* Outside-in Perspective Button - Hidden */}
        </div>
      )}
      
      {/* Outside-in Perspective Tab Panel (Inline, not popup) */}
      {(showPerspective || perspectiveOnly) && (
        <div className={`bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in ${!perspectiveOnly ? 'mt-4' : ''}`}>
          {/* Tab Header - Similar to Engine Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0 border-b-2 border-slate-200 bg-slate-50 px-4 pt-3">
            <button
              onClick={() => setPerspectiveTab('persona')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap ${
                perspectiveTab === 'persona'
                  ? 'bg-white text-purple-700 shadow-md border-2 border-b-0 border-purple-300 -mb-[2px]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${perspectiveTab === 'persona' ? 'bg-purple-600' : 'bg-slate-400'}`}></div>
              <span>Persona</span>
              {perspectiveTab === 'persona' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t"></div>
              )}
            </button>
            <button
              onClick={() => setPerspectiveTab('business')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap ${
                perspectiveTab === 'business'
                  ? 'bg-white text-purple-700 shadow-md border-2 border-b-0 border-purple-300 -mb-[2px]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${perspectiveTab === 'business' ? 'bg-blue-600' : 'bg-slate-400'}`}></div>
              <span>Business</span>
              {perspectiveTab === 'business' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-teal-600 rounded-t"></div>
              )}
            </button>
            <button
              onClick={() => setPerspectiveTab('competitors')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap ${
                perspectiveTab === 'competitors'
                  ? 'bg-white text-purple-700 shadow-md border-2 border-b-0 border-purple-300 -mb-[2px]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${perspectiveTab === 'competitors' ? 'bg-orange-600' : 'bg-slate-400'}`}></div>
              <span>Competitors</span>
              {perspectiveTab === 'competitors' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-t"></div>
              )}
            </button>
            <button
              onClick={() => setPerspectiveTab('market-trends')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap ${
                perspectiveTab === 'market-trends'
                  ? 'bg-white text-purple-700 shadow-md border-2 border-b-0 border-purple-300 -mb-[2px]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${perspectiveTab === 'market-trends' ? 'bg-green-600' : 'bg-slate-400'}`}></div>
              <span>Market Trends</span>
              {perspectiveTab === 'market-trends' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-t"></div>
              )}
            </button>
            
            {/* Close button on the right - Hidden in perspectiveOnly mode */}
            {!perspectiveOnly && (
              <button
                onClick={() => setShowPerspective(false)}
                className="ml-auto text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full p-1.5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className={`p-6 overflow-y-auto ${perspectiveTab === 'persona' ? 'max-h-[700px]' : 'max-h-[500px]'}`}>
            {perspectiveTab === 'persona' && (
              <div>
                {/* Add as Prompt Checkbox - At Start */}
                <label className="flex items-center gap-2 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-purple-600 transition-colors">
                    Add this perspective as a prompt
                  </span>
                </label>
                <div className="w-full h-[650px] rounded-lg overflow-hidden relative bg-slate-900">
                  {echoIntelligenceAvailable === null ? (
                    // Loading state
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                      <div className="text-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="text-slate-300">Checking Echo Intelligence availability...</p>
                      </div>
                    </div>
                  ) : false ? (
                    // Echo Intelligence is available - show iframe (temporarily disabled for testing)
                    <iframe
                      src="http://localhost:3005"
                      className="w-full h-full border-0"
                      title="Echo Intelligence - Executive Persona"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      style={{ minHeight: '650px' }}
                    />
                  ) : (
                    // Fallback: Complete Echo Intelligence Landing Page Replica
                    <div className="w-full h-full bg-gradient-to-br from-[#0a0f1e] via-[#0c1328] to-[#0a0f1e] flex items-start justify-start p-4 sm:p-6 relative overflow-auto">
                      {/* Animated Background Elements */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
                      </div>

                      <div className="w-full max-w-4xl relative z-10">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
                          <div className="space-y-8">
                            {/* Header */}
                            <div className="text-center space-y-4">
                              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </div>
                              
                              <div className="space-y-2">
                                <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-tight pb-2">
                                  Echo Intelligence
                                </h1>
                                <p className="text-sm text-white/50 font-light tracking-wide">
                                  From Formula2GX Digital Innovation Accelerator Labs
                                </p>
                              </div>
                              
                              <p className="text-2xl sm:text-3xl font-semibold text-white/90 max-w-2xl mx-auto leading-relaxed bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                Be the future you, NOW.
                              </p>
                            </div>

                            {/* Trust Badges */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
                              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform cursor-pointer">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <div>
                                  <div className="text-sm font-semibold text-white">GDPR Compliant</div>
                                  <div className="text-xs text-white/60">Fully secure</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform cursor-pointer">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <div>
                                  <div className="text-sm font-semibold text-white">Private Data</div>
                                  <div className="text-xs text-white/60">Never shared</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:scale-105 transition-transform cursor-pointer">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <div>
                                  <div className="text-sm font-semibold text-white">AI-Powered</div>
                                  <div className="text-xs text-white/60">Deep insights</div>
                                </div>
                              </div>
                            </div>

                            {/* Privacy Notice */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm text-white/80 leading-relaxed">
                                By entering your details, you explicitly give us permission to source data from your public profile and activities. 
                                Your data will <strong>never be shared</strong> with anyone, even anonymously. All processing adheres to GDPR compliance: 
                                lawful purpose, data minimisation, strict security, and right to withdraw consent at any time.
                              </p>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="block text-white font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  LinkedIn Profile URL
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://www.linkedin.com/in/your-profile"
                                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all"
                                  disabled
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-white font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  X / Twitter Handle
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://twitter.com/yourhandle"
                                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none transition-all"
                                  disabled
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <label className="block text-white/70 text-sm font-medium">Source 1 (Optional)</label>
                                  <input
                                    type="text"
                                    placeholder="Any public URL"
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all text-sm"
                                    disabled
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-white/70 text-sm font-medium">Source 2 (Optional)</label>
                                  <input
                                    type="text"
                                    placeholder="Another platform"
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all text-sm"
                                    disabled
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-white/70 text-sm font-medium">Source 3 (Optional)</label>
                                  <input
                                    type="text"
                                    placeholder="Additional source"
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all text-sm"
                                    disabled
                                  />
                                </div>
                              </div>
                            </div>

                            
                            {/* Divider */}
                            <div className="relative py-6">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                              </div>
                              <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-[#0c1328] text-white/60">Or explore executive profiles</span>
                              </div>
                            </div>

                            {/* Companies and Executives */}
                            <div className="space-y-4">
                              {/* WESCO */}
                              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                                {/* Company Header - Clickable */}
                                <button
                                  onClick={() => toggleCompany('WESCO')}
                                  className="w-full flex items-center justify-between p-5 transition-all duration-300 group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                    <div className="text-left">
                                      <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                        WESCO
                                      </h2>
                                      <p className="text-xs text-white/60 mt-0.5">
                                        4 Executives
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className={`w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-cyan-400/30 transition-all ${expandedCompanies['WESCO'] ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>

                                {/* Executive Badges - Collapsible */}
                                {expandedCompanies['WESCO'] && (
                                  <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div className="relative p-5 rounded-xl border-2 bg-gradient-to-br from-orange-500 to-red-500 border-white/20 cursor-pointer shadow-lg hover:shadow-xl">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h3 className="text-base font-bold text-white">
                                            Akash Khurana
                                          </h3>
                                          <p className="text-xs text-white/70 mt-1">
                                            EVP, Chief Information & Digital Officer
                                          </p>
                                        </div>
                                        <svg className="w-4 h-4 text-white/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative p-5 rounded-xl border-2 bg-gradient-to-br from-indigo-500 to-blue-500 border-white/20 cursor-pointer shadow-lg hover:shadow-xl">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h3 className="text-base font-bold text-white">
                                            Hemant Porwal
                                          </h3>
                                          <p className="text-xs text-white/70 mt-1">
                                            EVP Supply Chain & Operations
                                          </p>
                                        </div>
                                        <svg className="w-4 h-4 text-white/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative p-5 rounded-xl border-2 bg-gradient-to-br from-amber-500 to-orange-500 border-white/20 cursor-pointer shadow-lg hover:shadow-xl">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h3 className="text-base font-bold text-white">
                                            Ralph Elder
                                          </h3>
                                          <p className="text-xs text-white/70 mt-1">
                                            VP Sales - Construction Northeast
                                          </p>
                                        </div>
                                        <svg className="w-4 h-4 text-white/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative p-5 rounded-xl border-2 bg-white/5 border-white/10 opacity-50 cursor-not-allowed">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h3 className="text-base font-bold text-white/70">
                                            Maricel Cerruti
                                          </h3>
                                          <p className="text-xs text-white/50 mt-1">
                                            Director GTM
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-2 text-xs text-white/50 bg-white/10 rounded-lg px-2 py-1 inline-block">
                                        Coming Soon
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {false && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-2">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Executive Persona Intelligence
                  </h2>
                  <p className="text-slate-600 text-sm">
                    AI-powered insights into key decision makers
                  </p>
                </div>

                {/* Company Sections */}
                <div className="space-y-4">
                  {/* HCLTech */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">H</span>
                      HCLTech
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { name: "Ashish Kumar Gupta", role: "President - Digital Business", color: "from-blue-500 to-cyan-500" },
                        { name: "Vineet Nayar", role: "Former CEO & Vice Chairman", color: "from-purple-500 to-pink-500" },
                        { name: "Stuart Drew", role: "EVP - Europe & UKI", color: "from-amber-500 to-orange-500" },
                        { name: "C. Vijayakumar", role: "CEO & Managing Director", color: "from-green-500 to-emerald-500" },
                        { name: "Roshni Nadar Malhotra", role: "Chairperson", color: "from-rose-500 to-pink-500" }
                      ].map((exec, i) => (
                        <button key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all text-left">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${exec.color} flex items-center justify-center text-white text-xs font-bold`}>
                            {exec.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{exec.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{exec.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WESCO */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
                    <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">W</span>
                      WESCO
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { name: "Akash Khurana", role: "Executive", color: "from-orange-500 to-red-500" },
                        { name: "Hemant Porwal", role: "EVP Supply Chain", color: "from-indigo-500 to-blue-500" },
                        { name: "Ralph Elder", role: "VP Sales - Northeast", color: "from-amber-500 to-orange-500" },
                        { name: "Maricel Cerruti", role: "Director GTM", color: "from-violet-500 to-purple-500" }
                      ].map((exec, i) => (
                        <button key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-400 hover:shadow-md transition-all text-left">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${exec.color} flex items-center justify-center text-white text-xs font-bold`}>
                            {exec.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{exec.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{exec.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 mx-auto mb-1 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-medium text-slate-700">Verified Data</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 mx-auto mb-1 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-medium text-slate-700">AI Analysis</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 mx-auto mb-1 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-medium text-slate-700">Deep Insights</p>
                  </div>
                </div>
              </div>
            )}
            
            {perspectiveTab === 'business' && (
              <div className="space-y-4 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {/* Add as Prompt Checkbox - At Start */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 group-hover:text-purple-600 transition-colors">
                  Add this perspective as a prompt
                </span>
              </label>
              {/* Company & Focus Area Input Fields */}
              <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 border-2 border-blue-600 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">Company Analysis Configuration</h3>
                <p className="text-sm text-blue-100 mb-4">Enter company details to generate customized business insights (Future: API-powered real-time data)</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., WESCO International" 
                      defaultValue="WESCO International"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Industry/Sector</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Industrial Distribution" 
                      defaultValue="B2B Distribution & Supply Chain Solutions"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-100 mb-2">Focus Areas (comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Electrical, Data Centers, Utilities" 
                      defaultValue="Electrical & Electronic Solutions, Communications & Security, Utility & Broadband"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-100 mb-2">Geographic Focus</label>
                    <input 
                      type="text" 
                      placeholder="e.g., North America, Global" 
                      defaultValue="North America, Global (50+ countries)"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      setIsFetching(true);
                      setTimeout(() => setIsFetching(false), 3000);
                    }}
                    disabled={isFetching}
                    className="flex-1 relative px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-90 overflow-hidden"
                  >
                    {isFetching && (
                      <div className="absolute inset-0">
                        <GlowEffect
                          colors={['#3b82f6', '#06b6d4', '#10b981']}
                          mode="flowHorizontal"
                          blur="medium"
                          duration={2}
                          scale={1.2}
                        />
                      </div>
                    )}
                    <span className="relative z-10 tracking-wide">
                      <TextMorph>{isFetching ? 'Fetching Data...' : 'Fetch Company Data'}</TextMorph>
                    </span>
                  </button>
                  <button className="flex-1 px-4 py-2.5 bg-white/20 text-white font-semibold rounded-lg border border-blue-400 hover:bg-white/30 transition-all">
                    Reset
                  </button>
                </div>
                <div className="mt-3 p-3 bg-blue-950/50 border border-blue-500 rounded-lg">
                  <p className="text-xs text-blue-200"><strong>Note:</strong> Currently showing pre-filled data for WESCO International. Future versions will support API integration to fetch real-time company data based on your inputs.</p>
                </div>
              </div>
              {/* Section 1: 2025 Executive Narrative */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  1. 2025 Executive Narrative (Global Supply Chain Leader)
                </h2>
                
                <p className="text-slate-800">
                  WESCO International enters 2025 as a <strong>$22 billion FORTUNE 500® company</strong> and a leading provider of business-to-business distribution, logistics services and supply chain solutions globally.
                </p>
                
                <p className="text-slate-800">
                  <strong>Headquartered in Pittsburgh, Pennsylvania</strong>, WESCO builds, connects, powers and protects the world through its three strategic business units. Here's the growth trajectory from Formula2GX Digital's OneMindAI Analysis.
                </p>

                <h3 className="text-lg font-semibold text-slate-900 mt-4">Three Strategic Business Units</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Electrical & Electronic Solutions (EES)</h4>
                    <p className="text-slate-700 mt-1">
                      Core electrical distribution serving commercial, industrial, and institutional customers with renewed positive sales momentum in 2024:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>Electrical infrastructure and automation products</li>
                      <li>Industrial MRO and safety supplies</li>
                      <li>Lighting and sustainability solutions</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Communications & Security Solutions (CSS)</h4>
                    <p className="text-slate-700 mt-1">
                      The growth engine of WESCO with <strong>70%+ YoY growth in Global Data Center business</strong> and 20% growth in Broadband Solutions:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>Data center infrastructure and connectivity</li>
                      <li>Network infrastructure and wireless solutions</li>
                      <li>Security and fire/life safety systems</li>
                      <li>Audio-visual and professional AV solutions</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Utility & Broadband Solutions (UBS)</h4>
                    <p className="text-slate-700 mt-1">
                      Serving electric utilities, telecommunications providers, and broadband operators with grid modernization and infrastructure solutions:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>Transmission and distribution equipment</li>
                      <li>Grid modernization and smart grid solutions</li>
                      <li>Broadband and fiber optic infrastructure</li>
                      <li>Renewable energy and sustainability products</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mt-4">Key Growth Drivers for 2025</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">AI-Driven Data Centers</h4>
                    <p className="text-slate-700 mt-1">
                      Secular trend driving unprecedented demand for data center infrastructure, with WESCO's CSS segment positioned as a primary beneficiary of AI infrastructure buildout.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Electrification & Power Generation</h4>
                    <p className="text-slate-700 mt-1">
                      Increased power generation needs, grid modernization, and electrification trends creating sustained demand across EES and UBS segments.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Reshoring & Automation</h4>
                    <p className="text-slate-700 mt-1">
                      Manufacturing reshoring and automation investments driving industrial demand for electrical and automation solutions.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-4">
                  <p className="text-slate-800 font-semibold">2025 Outlook Highlights:</p>
                  <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                    <li><strong>Organic sales growth:</strong> 2.5% to 6.5% expected</li>
                    <li><strong>Operating margin expansion:</strong> All three business units expected to deliver profitable growth</li>
                    <li><strong>Free cash flow:</strong> $600 to $800 million expected</li>
                    <li><strong>Dividend increase:</strong> 10% increase to $1.82 per share</li>
                    <li><strong>January 2025 momentum:</strong> Preliminary sales per workday up 5% vs prior year</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-300 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-blue-900">OneMindAI Recommendation:</p>
                  <p className="text-slate-800 mt-2">
                    WESCO is uniquely positioned to capitalize on secular trends including AI-driven data centers, increased power generation, electrification, automation, and reshoring. The company's vision to become <strong>"the best tech-enabled supply chain solutions provider in the world"</strong> aligns perfectly with digital transformation opportunities across all customer segments.
                  </p>
                </div>
              </section>

              {/* Section 2: Three-Year Performance Arc */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  2. 2022–2024: Three-Year Performance Arc (Numbers + Narrative)
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">FY22 – "Post-Anixter Integration & Scale"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial Metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $21.4B, strong growth from Anixter integration</li>
                      <li>Gross profit margin: ~21%</li>
                      <li>Operating profit: $1.3B+</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Strategic Highlights</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Completed Anixter integration, creating industry-leading scale</li>
                      <li>Expanded data center and communications capabilities</li>
                      <li>Launched digital transformation initiatives</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">FY23 – "Peak Revenue & Cash Generation"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial Metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $22.4B (peak revenue year)</li>
                      <li>Operating profit: $1.4B</li>
                      <li>Operating cash flow: $493 million</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Strategic Highlights</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Strong performance across all three business segments</li>
                      <li>Continued digital transformation investments</li>
                      <li>Expanded global footprint to 50+ countries</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">FY24 – "Record Cash Flow & Strategic Repositioning"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial Metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $21.8B (down 2.5% YoY; organic down 0.6%)</li>
                      <li>Operating profit: $1.2B; Operating margin: 5.6%</li>
                      <li>Adjusted EBITDA margin: 6.9%</li>
                      <li><strong>Record operating cash flow: $1.1B</strong> (up from $493M in 2023)</li>
                      <li><strong>Record free cash flow: $1.05B</strong> (154% of adjusted net income)</li>
                      <li>Diluted EPS: $13.05; Adjusted EPS: $12.23</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Q4 2024 Highlights</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Net sales: $5.5B (up 0.5% YoY; organic up 2.4%)</li>
                      <li>Data Center business: <strong>70%+ YoY growth</strong></li>
                      <li>Broadband Solutions: <strong>20% YoY growth</strong></li>
                      <li>Adjusted diluted EPS: $3.16 (up 19% YoY)</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Strategic Actions in 2024</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Divested Wesco Integrated Supply (WIS) business for $122M gain</li>
                      <li>Acquired Ascent and two other services-based businesses</li>
                      <li>Reduced net debt by $431 million</li>
                      <li>Repurchased $425 million of shares</li>
                      <li>More than halfway complete on enterprise-wide digital transformation</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Competitive Landscape */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  3. Competitive Landscape & Market Position
                </h2>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Key Competitors</h3>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-semibold text-slate-900">Grainger (W.W.)</h4>
                        <p className="text-slate-700 text-xs mt-1">$16.5B revenue. Broad-line MRO distributor with strong e-commerce platform and brand recognition.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-semibold text-slate-900">Fastenal</h4>
                        <p className="text-slate-700 text-xs mt-1">$7.3B revenue. Vending machine distribution model with strong local presence in fasteners and industrial supplies.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-semibold text-slate-900">HD Supply</h4>
                        <p className="text-slate-700 text-xs mt-1">$6.8B revenue. Strong in facilities maintenance and MRO for multi-family and hospitality sectors.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-semibold text-slate-900">Graybar Electric</h4>
                        <p className="text-slate-700 text-xs mt-1">$10.2B revenue. Employee-owned electrical distributor with strong contractor relationships.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">WESCO's Competitive Advantages</h3>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li><strong>Scale & Breadth:</strong> $22B revenue with broadest product portfolio in the industry</li>
                      <li><strong>Three-Segment Model:</strong> Unique combination of EES, CSS, and UBS creates cross-sell opportunities</li>
                      <li><strong>Data Center Leadership:</strong> 70%+ growth demonstrates dominance in high-growth segment</li>
                      <li><strong>Global Reach:</strong> 700+ locations in 50+ countries vs. competitors' primarily North American focus</li>
                      <li><strong>Digital Transformation:</strong> Enterprise-wide technology investment creating competitive moat</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">Market Position by Segment</h3>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li><strong>Electrical Distribution:</strong> #2 in North America behind Graybar, but with broader product range</li>
                      <li><strong>Communications & Security:</strong> Market leader in data center infrastructure distribution</li>
                      <li><strong>Utility & Broadband:</strong> Top 3 position with strong utility relationships</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4: SWOT Analysis */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  4. Strategic SWOT Analysis (2024-2025)
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                    <h3 className="font-bold text-green-900 mb-2">Strengths</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Industry-leading scale: $22B revenue, 20,000 employees, 700+ locations globally</li>
                      <li>Record free cash flow generation: $1.05B in 2024 (154% of adjusted net income)</li>
                      <li>Data center leadership with 70%+ YoY growth in high-demand segment</li>
                      <li>Diversified three-segment model (EES, CSS, UBS) enabling cross-sell</li>
                      <li>Strong supplier relationships with industry-leading manufacturers</li>
                      <li>Digital transformation creating tech-enabled competitive moat</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                    <h3 className="font-bold text-red-900 mb-2">Weaknesses</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Revenue decline in 2024 (-2.5% YoY) amid industrial customer slowdown</li>
                      <li>Utility segment weakness expected to continue near-term</li>
                      <li>Margin pressure in CSS segment during project deployments</li>
                      <li>Financial leverage at 2.9x trailing EBITDA</li>
                      <li>Integration complexity from multiple acquisitions</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                    <h3 className="font-bold text-blue-900 mb-2">Opportunities</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>AI-driven data center infrastructure boom creating sustained demand</li>
                      <li>Grid modernization and electrification investments</li>
                      <li>Manufacturing reshoring driving industrial demand</li>
                      <li>Services-based acquisitions expanding value-added offerings</li>
                      <li>Digital transformation completion accelerating cross-sell and margins</li>
                      <li>Broadband infrastructure expansion (20% growth in 2024)</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                    <h3 className="font-bold text-yellow-900 mb-2">Threats</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Economic slowdown impacting industrial and construction spending</li>
                      <li>Competition from Grainger, Fastenal, and regional distributors</li>
                      <li>Amazon Business disruption in MRO distribution</li>
                      <li>Interest rate environment affecting customer capital investments</li>
                      <li>Supply chain disruptions and commodity price volatility</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5: Executive Story */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  5. Executive Story for 2025
                </h2>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Three-Year Performance Arc:</h3>
                    <p className="text-slate-700">
                      "From 2022 to 2024, WESCO maintained its position as a $22B industry leader while generating record free cash flow of over $1 billion. Despite macro headwinds, the company returned to organic growth in Q4 2024 with 70%+ growth in data centers and 20% in broadband – positioning us perfectly for the AI infrastructure boom."
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">Segment Growth Playbooks:</h3>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li><strong>Data Centers (CSS):</strong> 70%+ growth → blueprint for hyperscaler and enterprise AI infrastructure</li>
                      <li><strong>Broadband (UBS):</strong> 20% growth → blueprint for fiber and 5G infrastructure rollouts</li>
                      <li><strong>Electrical (EES):</strong> Renewed momentum → blueprint for industrial automation and electrification</li>
                      <li><strong>Services:</strong> Ascent acquisition → blueprint for value-added supply chain services</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">Differentiation vs Peers:</h3>
                    <p className="text-slate-700">
                      WESCO combines unmatched scale ($22B), global reach (50+ countries), and a unique three-segment model that no competitor can match. The digital transformation investment creates a tech-enabled competitive moat.
                    </p>
                    <p className="text-slate-700 mt-2">
                      The vision: become <strong>"the best tech-enabled supply chain solutions provider in the world"</strong> – not just a distributor, but a strategic partner for customers' digital and infrastructure transformation.
                    </p>
                  </div>
                </div>
              </section>

              {/* Competitive Analysis */}
              <section>
                <h3 className="text-base font-bold text-slate-900 mb-2">Competitive Position</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border p-1.5 text-left">Company</th>
                        <th className="border p-1.5 text-right">Revenue</th>
                        <th className="border p-1.5 text-right">Gross Margin</th>
                        <th className="border p-1.5 text-right">Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-50">
                        <td className="border p-1.5 font-bold">WESCO</td>
                        <td className="border p-1.5 text-right font-bold">$21.8B</td>
                        <td className="border p-1.5 text-right font-bold">21.6%</td>
                        <td className="border p-1.5 text-right font-bold">EES/CSS/UBS</td>
                      </tr>
                      <tr>
                        <td className="border p-1.5 font-medium">Grainger</td>
                        <td className="border p-1.5 text-right">$16.5B</td>
                        <td className="border p-1.5 text-right">39.2%</td>
                        <td className="border p-1.5 text-right">MRO</td>
                      </tr>
                      <tr>
                        <td className="border p-1.5 font-medium">Graybar</td>
                        <td className="border p-1.5 text-right">$10.2B</td>
                        <td className="border p-1.5 text-right">~18%</td>
                        <td className="border p-1.5 text-right">Electrical</td>
                      </tr>
                      <tr>
                        <td className="border p-1.5 font-medium">Fastenal</td>
                        <td className="border p-1.5 text-right">$7.3B</td>
                        <td className="border p-1.5 text-right">45.7%</td>
                        <td className="border p-1.5 text-right">Fasteners/MRO</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Chart 1: Revenue Comparison */}
              <BarChart
                title="Industrial Distribution Leaders - Annual Revenue"
                data={[
                  { label: 'WESCO', value: 21.8, displayValue: '$21.8B' },
                  { label: 'Grainger', value: 16.5, displayValue: '$16.5B' },
                  { label: 'Graybar', value: 10.2, displayValue: '$10.2B' },
                  { label: 'Fastenal', value: 7.3, displayValue: '$7.3B' }
                ]}
                height="h-48"
                color="#3B82F6"
                highlightIndex={0}
              />

              {/* Chart 2: Segment Growth */}
              <BarChart
                title="WESCO Q4 2024 Segment Growth (YoY)"
                data={[
                  { label: 'Data Centers', value: 70, displayValue: '70%+' },
                  { label: 'Broadband', value: 20, displayValue: '20%' },
                  { label: 'Organic Sales', value: 2.4, displayValue: '2.4%' },
                  { label: 'EPS Growth', value: 19, displayValue: '19%' }
                ]}
                height="h-32"
                color="#10B981"
                highlightIndex={0}
              />

              {/* Chart 3: Cash Flow */}
              <BarChart
                title="Free Cash Flow Generation ($ Millions)"
                data={[
                  { label: 'FY22', value: 350, displayValue: '$350M' },
                  { label: 'FY23', value: 493, displayValue: '$493M' },
                  { label: 'FY24', value: 1045, displayValue: '$1,045M' },
                  { label: 'FY25E', value: 700, displayValue: '$600-800M' }
                ]}
                height="h-32"
                color="#F59E0B"
                highlightIndex={2}
              />

              {/* Summary SWOT */}
              <section>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Strategic Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Key Strengths</h4>
                    <ul className="text-xs text-green-800 space-y-1 list-disc ml-4">
                      <li>$22B scale with global reach</li>
                      <li>Record $1B+ free cash flow</li>
                      <li>70%+ data center growth</li>
                      <li>Digital transformation leadership</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Growth Catalysts</h4>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc ml-4">
                      <li>AI infrastructure demand</li>
                      <li>Grid modernization</li>
                      <li>Manufacturing reshoring</li>
                      <li>Services expansion via M&A</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">2025 Outlook</h4>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc ml-4">
                      <li>Organic growth: 2.5-6.5%</li>
                      <li>Margin expansion expected</li>
                      <li>10% dividend increase</li>
                      <li>Continued share buybacks</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Strategic Priorities</h4>
                    <ul className="text-xs text-purple-800 space-y-1 list-disc ml-4">
                      <li>Complete digital transformation</li>
                      <li>Expand services offerings</li>
                      <li>Accelerate cross-sell</li>
                      <li>Strategic M&A pipeline</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Key Recommendation */}
              <section className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">OneMindAI Recommendation</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  WESCO is positioned at the intersection of multiple secular growth trends: AI-driven data centers, electrification, grid modernization, and manufacturing reshoring. The company's vision to become "the best tech-enabled supply chain solutions provider in the world" is supported by record cash generation, strategic acquisitions, and a digital transformation that's more than halfway complete. 2025 is the year to accelerate from "leading distributor" to "indispensable supply chain partner" for customers navigating infrastructure transformation.
                </p>
              </section>
              </div>
            )}
            
            {perspectiveTab === 'competitors' && (
              <div className="p-6 overflow-y-auto max-h-[500px]">
                {/* Add as Prompt Checkbox - At Start */}
                <label className="flex items-center gap-2 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-purple-600 transition-colors">
                    Add this perspective as a prompt
                  </span>
                </label>
                <div className="space-y-4 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  
                  {/* Executive Summary */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-orange-900 mb-2">Executive Summary</h3>
                    <ul className="list-disc ml-4 text-slate-700 space-y-2 text-xs">
                      <li><strong>Structural Positioning:</strong> A Wesco-type distributor sits in the top tier globally, with scale advantages across procurement, logistics, utility supply, and integrated supply programs unmatched by most regionals—but less concentrated than Sonepar or Graybar in specific verticals.</li>
                      <li><strong>Portfolio Breadth:</strong> Unique combination of EES + NSS + Utility + Data Center gives above-average portfolio breadth and deeper penetration in programmatic accounts, but may dilute focus in high-growth segments if not intentionally managed.</li>
                      <li><strong>Defensible:</strong> Global supplier relationships, supply-chain depth, project management capability, strong presence in utility and industrial verticals.</li>
                      <li><strong>Vulnerable:</strong> Branch density weaker than CED/Graybar; NSS and low-voltage share threatened by IT distributors (Ingram, TD Synnex) and specialists. Digital maturity still uneven vs peers like Sonepar and Graybar.</li>
                      <li><strong>Key Industry Forces:</strong> Scale, availability, and logistics ability increasingly determine competitive advantage. Rapidly rising importance of digital/AI-driven pricing, forecasting, availability visibility, and procurement automation.</li>
                    </ul>
                  </div>

                  {/* Future Growth Drivers */}
                  <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2">Future Growth Drivers (2025–2035)</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                      <li>AI data center builds, grid modernization, building electrification</li>
                      <li>EV infrastructure, undergrounding, campus networking, security modernization</li>
                      <li>Large programmatic accounts and integrated supply solutions will drive steady margin but require higher digital IQ</li>
                    </ul>
                  </div>

                  {/* Risks & Disruptors */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-red-900 mb-2">Risks & Disruptors</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                      <li>Narrower specialists taking share in high-performing verticals (security, hyper-scale racks/power)</li>
                      <li>Contractor disintermediation through manufacturer-direct digital channels</li>
                      <li>IT distribution encroachment in low-voltage and cyber-physical products</li>
                      <li>Labor shortages and supply-chain resiliency requirements requiring automation investment</li>
                    </ul>
                  </div>

                  {/* Industry Structure */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">Industry Structure & Competitive Forces</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-2">Scale Advantages</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Scale drives purchasing leverage with top OEMs (Eaton, Schneider, CommScope, Panduit, Belden, ABB)</li>
                        <li>Larger distributors benefit from cross-category bundling (elec + LV + utility + data center)</li>
                        <li>Structural scale is vital in data center and utility where long lead times, staging, and kitting matter</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-2">Branch Network Economics</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>High branch density (CED, Graybar) wins in contractor-driven markets requiring immediate availability</li>
                        <li>Lower density but larger regional hubs (Wesco) excel in national accounts, large industrials, and utilities</li>
                        <li>Utility yards and project staging facilities are emerging as competitive moats</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-2">Digital Maturity</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Digital pricing, AI-assisted forecasting, and ecommerce conversion materially impact margins (1–2 points)</li>
                        <li>Sonepar and Graybar have most consistent digital investments</li>
                        <li>NSS increasingly requires data-driven quoting workflows and better BOM intelligence</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-2">Utility & Data Center Exposure</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Distributors with strong utility presence (Wesco, Border States) have counter-cyclical stability</li>
                        <li>Data center and hyperscale capabilities are the #1 differentiator for 2025–2035</li>
                        <li>Programmatic accounts produce stickier revenue, but margins compress</li>
                      </ul>
                    </div>
                  </div>

                  {/* Competitive Matrices */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">Competitive Matrices</h3>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-blue-900 mb-2 text-xs">Scale vs Portfolio Breadth</h4>
                      <ul className="text-slate-600 space-y-1 text-xs">
                        <li><strong>High Scale / Broad:</strong> Wesco, Sonepar, Rexel</li>
                        <li><strong>High Scale / Narrow:</strong> Graybar</li>
                        <li><strong>Regional / Narrow:</strong> CED, Border States</li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-purple-900 mb-2 text-xs">Data Center vs Utility Strength</h4>
                      <ul className="text-slate-600 space-y-1 text-xs">
                        <li><strong>Strong Both:</strong> Wesco (post-Anixter)</li>
                        <li><strong>Strong Utility:</strong> Border States</li>
                        <li><strong>Strong Data Center:</strong> Sonepar, Graybar</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-green-900 mb-2 text-xs">Digital Maturity vs Branch Density</h4>
                      <ul className="text-slate-600 space-y-1 text-xs">
                        <li><strong>High Digital / High Density:</strong> Sonepar, Graybar</li>
                        <li><strong>High Digital / Low Density:</strong> Rexel</li>
                        <li><strong>Mid Digital / Mid Density:</strong> Wesco (opportunity)</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-amber-900 mb-2 text-xs">AI/Data Center vs Electrification Readiness</h4>
                      <ul className="text-slate-600 space-y-1 text-xs">
                        <li><strong>Strong Both:</strong> Wesco, Sonepar</li>
                        <li><strong>Data center-heavy:</strong> Graybar</li>
                        <li><strong>Electrification-focused:</strong> Rexel (Europe DNA)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Deep Competitor Analysis */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">Deep Competitive Analysis</h3>
                  
                  <div className="space-y-3">
                    {/* Wesco */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-blue-900 mb-2">Wesco (Benchmark Company)</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Scale, integrated supply, utility + datacenter capability, global reach, breadth across EES + NSS + utility</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> Branch density; digital pricing maturity; complex portfolio coordination; slow org agility</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> Utility expansion, data center mega-hub strategy, deeper supplier alignment, AI pricing/forecasting adoption</p>
                    </div>

                    {/* Sonepar */}
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-orange-900 mb-2">Sonepar <span className="text-red-600 text-xs ml-2">[HIGH THREAT]</span></h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Digitally advanced, strong contractor network, dense branches, strong global procurement</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> Weaker utility presence; slower in hyperscale; sometimes fragmented regionally</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> AI investments, acquisitions in low-voltage and specialty segments, expansion of supply-chain hubs</p>
                    </div>

                    {/* Graybar */}
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-2">Graybar <span className="text-amber-600 text-xs ml-2">[MEDIUM THREAT]</span></h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Extremely strong contractor channel, deep relationships, consistent execution, good digital adoption</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> Lacks global scale; narrow portfolio; limited utility presence; slower on data center specialization</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> Branch expansion, deeper LV/security push, selective M&A</p>
                    </div>

                    {/* Rexel */}
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-2">Rexel <span className="text-amber-600 text-xs ml-2">[MEDIUM THREAT]</span></h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Strong digital globally, strong electrification exposure, industrial/energy focus</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> NA scale smaller; limited utility share; moderate data center penetration</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> Electrification-led offerings, digital procurement expansion, targeted NA acquisitions</p>
                    </div>

                    {/* CED */}
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-2">CED <span className="text-red-600 text-xs ml-2">[HIGH THREAT - Contractor]</span></h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Enormous branch density; extremely strong contractor liquidity; decentralized/entrepreneurial model</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> Weak in utility, data center, enterprise/networking; no global scale; inconsistent digital tools</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> Maintaining local dominance, selective tech investments, expansion into LV/security</p>
                    </div>

                    {/* Border States */}
                    <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-2">Border States <span className="text-amber-600 text-xs ml-2">[MEDIUM THREAT - Utility]</span></h4>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-green-700"><strong>Strengths:</strong> Strongest utility player besides Wesco; cooperative model; stability with utilities</p>
                        </div>
                        <div>
                          <p className="text-red-700"><strong>Weaknesses:</strong> Limited data center strength; smaller scale; less digital advancement</p>
                        </div>
                      </div>
                      <p className="text-slate-600 mt-2 text-xs"><strong>Likely Moves:</strong> Double down on utilities, expand wildfire-mitigation supply, improve digital procurement tools</p>
                    </div>
                  </div>

                  {/* Future Outlook */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">Future Outlook (2025–2035)</h3>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-purple-900 mb-2 text-xs">AI Data Centers</h4>
                      <p className="text-slate-600 text-xs">Growth 10–15% CAGR through 2030 due to compute-heavy architectures.</p>
                      <p className="text-green-700 text-xs mt-1"><strong>Best positioned:</strong> Wesco, Sonepar, Graybar</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-yellow-900 mb-2 text-xs">Grid Modernization</h4>
                      <p className="text-slate-600 text-xs">$300–500B U.S. decade spend on T&D hardening, wildfire mitigation, undergrounding.</p>
                      <p className="text-green-700 text-xs mt-1"><strong>Best positioned:</strong> Wesco, Border States</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-green-900 mb-2 text-xs">Electrification</h4>
                      <p className="text-slate-600 text-xs">Increases mix of switchgear, panelboards, cable, transformers, LV power.</p>
                      <p className="text-green-700 text-xs mt-1"><strong>Best positioned:</strong> Rexel (Europe DNA), Sonepar, Wesco</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-blue-900 mb-2 text-xs">Digital Procurement & AI</h4>
                      <p className="text-slate-600 text-xs">Will compress margins for non-digital players; shift spend to distributors with APIs, punchouts, and intelligent pricing.</p>
                      <p className="text-green-700 text-xs mt-1"><strong>Best positioned:</strong> Sonepar, Rexel, Graybar</p>
                    </div>
                  </div>

                  {/* SWOT */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">SWOT Analysis (Target Company)</h3>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-green-900 mb-2 text-xs">Strengths</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Scale + breadth unmatched in NA</li>
                        <li>Utility + data center exposure (structural growth)</li>
                        <li>Strong global supply chain, project logistics</li>
                        <li>Extensive supplier relationships</li>
                      </ul>
                    </div>
                    
                    <div className="bg-red-50 border border-red-300 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-red-900 mb-2 text-xs">Weaknesses</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Branch density disadvantage vs CED/Graybar</li>
                        <li>Digital maturity inconsistent; pricing engines lag</li>
                        <li>Cultural complexity from diverse legacy businesses</li>
                        <li>Slower to commercialize cyber-physical/security portfolio</li>
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-blue-900 mb-2 text-xs">Opportunities</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Hyperscale AI data centers, microgrids, resiliency hubs</li>
                        <li>Undergrounding/wildfire utility programs</li>
                        <li>LV/security modernization; convergence with OT cybersecurity</li>
                        <li>Data-driven pricing and supply chain optimization</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-amber-900 mb-2 text-xs">Threats</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Contractor share capture by CED/Graybar</li>
                        <li>IT distributors entering physical infrastructure</li>
                        <li>OEM direct-to-customer digital channels expanding</li>
                        <li>Margin compression driven by AI-enabled procurement bidders</li>
                      </ul>
                    </div>
                  </div>

                  {/* Strategic Recommendations */}
                  <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2 mt-6">Strategic Recommendations (Operator-Grade)</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-indigo-900 text-xs">1. Build a National Data Center & AI Infrastructure Business Unit</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Hyperscale + enterprise AI is the #1 structural growth engine through 2035.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> +$1–2B revenue in 5 years; mix improvement.</p>
                      <p className="text-red-600 text-xs"><strong>Risk if ignored:</strong> Lose share to Sonepar/Graybar and specialists.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-yellow-900 text-xs">2. Accelerate Utility/T&D Expansion and Wildfire/Undergrounding Programs</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Utility spend is the most recession-proof vertical.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> High-stability revenue; multi-year locked contracts.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-blue-900 text-xs">3. Launch AI-Powered Pricing, Availability & Forecasting Platform</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Digital sophistication is becoming a hard moat in distribution.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> 100–200 bps margin lift, reduced working capital.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-green-900 text-xs">4. Strengthen Contractor Channel via Branch Strategy 2.0</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Contractor market remains margin-rich and brand-defining.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> Stronger local relevance and protected margins.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-l-4 border-pink-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-pink-900 text-xs">5. Invest in Cyber-Physical Security & OT Networking Integration</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Security, LV, networking, and OT systems are converging rapidly.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> Higher pull-through of cabling, connectivity, racks, power.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-l-4 border-slate-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-slate-900 text-xs">6. Supply Chain & Logistics Reinvention</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Customers value availability and reliability over all else.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> Higher availability NPS, lower cost-to-serve, more project wins.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-orange-900 text-xs">7. Margin-Mix Optimization via Portfolio Rationalization</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Large distributors often carry tail SKUs dragging working capital.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> 50–100 bps margin improvement, lower inventory.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-teal-900 text-xs">8. Targeted M&A in Utility, LV/Security & Regional Contractors</h4>
                      <p className="text-slate-600 text-xs mt-1"><strong>Logic:</strong> Accelerates share in high-growth verticals and solves branch density gaps.</p>
                      <p className="text-slate-600 text-xs"><strong>Impact:</strong> Capability lift + growth acceleration.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}
            
            {perspectiveTab === 'market-trends' && (
              <div className="p-6 overflow-y-auto max-h-[500px]">
                {/* Add as Prompt Checkbox - At Start */}
                <label className="flex items-center gap-2 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-purple-600 transition-colors">
                    Add this perspective as a prompt
                  </span>
                </label>
                <div className="space-y-4 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-green-900 mb-2">Holistic Market Trends Analysis</h3>
                    <p className="text-slate-700 text-xs">
                      Optimized for a Wesco-like diversified distributor: EES + NSS + UPS
                    </p>
                  </div>

                  {/* 1. Core Business Model Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">1. Core Business Model Trends</h3>
                    <p className="text-slate-700 text-xs">
                      The distribution industry is transitioning from a <strong>product resale model</strong> to an <strong>infrastructure enablement ecosystem</strong>. Customers no longer evaluate distributors only on pricing and availability; they expect design-assist, project orchestration, configuration services, and digital transparency that integrate directly into their build cycles.
                    </p>
                    <p className="text-slate-700 text-xs">This shift is driven by three structural forces:</p>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                      <li><strong>Supply chain volatility</strong>, which rewards distributors with scale and inventory depth</li>
                      <li><strong>Digital procurement adoption</strong>, which increases transparency and compresses margins for laggards</li>
                      <li><strong>Complexity of modern infrastructure</strong>, where electrical, networking, utility, and security layers converge in every project</li>
                    </ul>
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                      <h4 className="font-bold text-green-900 text-xs mb-2">Key Implications</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Distributors must operate more like <strong>platforms, not warehouses</strong></li>
                        <li>AI-driven pricing, predictive forecasting, and inventory intelligence become essential for margin protection</li>
                        <li>Logistics precision becomes a strategic differentiator in data center, utility, and industrial projects</li>
                        <li><strong>Complexity = opportunity</strong> for players with deep technical capabilities</li>
                      </ul>
                    </div>
                  </section>

                  {/* 2. Customer Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">2. Customer Trends</h3>
                    <p className="text-slate-700 text-xs">
                      Customer expectations across infrastructure markets have evolved into more demanding, risk-driven behaviors.
                    </p>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Contractors</h4>
                        <p className="text-slate-600 text-xs mb-2">Face severe labor shortages and compressed timelines. They increasingly expect distributors to shoulder complexity:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Prefab assemblies</li>
                          <li>Staged deliveries</li>
                          <li>Quick-turn availability</li>
                          <li>Project kitting and sequencing</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Contractors reward consistency, speed, and frictionless workflows — even over price.</strong></p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Utilities & Public Power</h4>
                        <p className="text-slate-600 text-xs mb-2">In a 20-year investment supercycle driven by grid modernization, wildfire mitigation, EV-related load, and aging infrastructure. They require:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Multi-year supply agreements</li>
                          <li>Compliance-ready processes</li>
                          <li>Storm response capabilities</li>
                          <li>Specialized MV/HV product expertise</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Utilities want embedded supply chain allies, not transactional partners.</strong></p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Industrial & OEM</h4>
                        <p className="text-slate-600 text-xs mb-2">Manufacturers want to standardize components, reduce downtime, and modernize older assets. They value:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Engineering support</li>
                          <li>Automation solutions</li>
                          <li>Redundant sourcing strategies</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Hyperscale Data Centers</h4>
                        <p className="text-slate-600 text-xs mb-2">The fastest-growing customer segment expects:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Multi-region orchestration</li>
                          <li>99%+ schedule reliability</li>
                          <li>Integrated electrical + fiber + security bundles</li>
                          <li>Lead-time risk mitigation</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Wesco's unique multi-segment structure positions it ahead of every competitor in this vertical.</strong></p>
                      </div>
                    </div>
                  </section>

                  {/* 3. Sales Leadership & GTM Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">3. Sales Leadership & GTM Trends</h3>
                    <p className="text-slate-700 text-xs">
                      Sales teams in infrastructure distribution are shifting from <strong>transactional sellers</strong> to <strong>technical advisors and project managers</strong>.
                    </p>
                    
                    <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                      <h4 className="font-semibold text-slate-900 mb-2 text-xs">Modern Distributor GTM Requirements</h4>
                      <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                        <li>Vertical-specialized overlays (Utility, Data Center, Security, Automation)</li>
                        <li>Integrated opportunity management across EES + NSS + UPS</li>
                        <li>AI-enabled pricing and quoting systems</li>
                        <li>Deep CRM discipline</li>
                        <li>Customer portals with visibility and self-service capabilities</li>
                      </ul>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-blue-900 mb-2 text-xs">Local Contractor-Driven Business</h4>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Branch intimacy</li>
                          <li>Speed</li>
                          <li>Inventory depth</li>
                        </ul>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-purple-900 mb-2 text-xs">Centralized Enterprise & Hyperscale</h4>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Governance</li>
                          <li>Engineering</li>
                          <li>Data & Logistics</li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-green-700 text-xs"><strong>Top performers build organizations where technical specialists, solution engineers, and project coordinators support frontline sellers in winning high-value projects.</strong></p>
                  </section>

                  {/* 4. Industry Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">4. Industry Trends (Segment-by-Segment)</h3>
                    
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-yellow-900 mb-2 text-xs">4.1 Electrical (EES)</h4>
                        <p className="text-slate-600 text-xs mb-2">
                          The electrical sector is being reshaped by electrification, EV charging infrastructure, energy-efficiency retrofits, and aging building stock. <strong>Persistent shortages in transformers and switchgear make inventory leverage a core competitive advantage.</strong>
                        </p>
                        <p className="text-slate-600 text-xs">
                          Trends such as prefabricated electrical rooms and modular power solutions shift value toward distributors with engineering and kitting capabilities.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-orange-900 mb-2 text-xs">4.2 Utility & T&D (UPS)</h4>
                        <p className="text-slate-600 text-xs mb-2">
                          Utility markets represent the <strong>most predictable long-term growth</strong>, driven by:
                        </p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Grid modernization investments</li>
                          <li>Wildfire mitigation programs</li>
                          <li>Undergrounding initiatives</li>
                          <li>Renewable interconnection requirements</li>
                        </ul>
                        <p className="text-slate-600 text-xs mt-2">
                          MV/HV constraints and transformer shortages mean utilities require distributors who can forecast demand, hold strategic stock, and respond to emergency events.
                        </p>
                        <p className="text-green-700 text-xs mt-2"><strong>This is a segment where local niche players excel tactically, but Wesco dominates strategically due to scale + specialization.</strong></p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-purple-900 mb-2 text-xs">4.3 Network, Security & Data Center (NSS)</h4>
                        <p className="text-slate-600 text-xs mb-2">
                          The NSS sector is undergoing <strong>explosive growth due to the AI compute boom</strong>. AI-driven data centers require:
                        </p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Extremely dense fiber architectures</li>
                          <li>High-capacity racks and PDUs</li>
                          <li>Integrated electrical + low-voltage solutions</li>
                          <li>Advanced security systems</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Only a distributor with data center + electrical + utility capability can fully serve this market, giving Wesco an unmatched competitive position.</strong></p>
                      </div>
                    </div>
                  </section>

                  {/* 5. Technology Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">5. Technology Trends</h3>
                    <p className="text-slate-700 text-xs">
                      The distributor of the future is defined by <strong>AI + automation + digital orchestration</strong>.
                    </p>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">AI-Driven Pricing</h4>
                        <p className="text-slate-600 text-xs">Improving win rates and protecting margin through intelligent pricing algorithms</p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Predictive Inventory</h4>
                        <p className="text-slate-600 text-xs">Reducing stockouts and dead stock through demand forecasting</p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Warehouse Robotics</h4>
                        <p className="text-slate-600 text-xs">Enabling faster order fulfilment and reducing labor dependency</p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Customer Portals</h4>
                        <p className="text-slate-600 text-xs">Real-time visibility of lead times, alternatives, and delivery status</p>
                      </div>
                      
                      <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm md:col-span-2">
                        <h4 className="font-semibold text-slate-900 mb-2 text-xs">Cyber-Physical Convergence</h4>
                        <p className="text-slate-600 text-xs">Making security an integrated electrical proposition</p>
                      </div>
                    </div>
                    
                    <p className="text-amber-700 text-xs"><strong>Wesco's ability to unify its digital stack could become either its greatest strategic accelerator or its largest vulnerability.</strong></p>
                  </section>

                  {/* 6. Geographic Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">6. Geographic Trends</h3>
                    <p className="text-slate-700 text-xs">Market conditions vary significantly across geographic layers.</p>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-blue-900 mb-2 text-xs">Local</h4>
                        <p className="text-slate-600 text-xs mb-2">Contractor markets depend on:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Regional construction pipelines</li>
                          <li>Local labor availability</li>
                          <li>Metro-specific permitting trends</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Local availability and branch execution remain decisive.</strong></p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-green-900 mb-2 text-xs">National</h4>
                        <p className="text-slate-600 text-xs mb-2">Federal incentives, infrastructure bills, energy policies, and tax credits are driving national-level demand across:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Electrification</li>
                          <li>Grid modernization</li>
                          <li>Clean energy installation</li>
                        </ul>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 shadow-sm">
                        <h4 className="font-semibold text-purple-900 mb-2 text-xs">Global</h4>
                        <p className="text-slate-600 text-xs mb-2">Global reshoring, supply diversification, and hyperscale data center clustering require:</p>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Cross-border supply chains</li>
                          <li>Multi-region project execution</li>
                          <li>Vendor diversification</li>
                        </ul>
                        <p className="text-green-700 text-xs mt-2"><strong>Wesco's global footprint (via Anixter heritage) is a differentiating asset.</strong></p>
                      </div>
                    </div>
                  </section>

                  {/* 7. Competitive Trends */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">7. Competitive Trends</h3>
                    <p className="text-slate-700 text-xs">Competitors are repositioning, but none replicates Wesco's integrated model.</p>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                        <span className="font-semibold text-slate-900 text-xs w-20">Sonepar</span>
                        <span className="text-slate-600 text-xs">Focuses heavily on the contractor market and local scale</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                        <span className="font-semibold text-slate-900 text-xs w-20">Graybar</span>
                        <span className="text-slate-600 text-xs">Excels in service culture but lacks technical breadth</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                        <span className="font-semibold text-slate-900 text-xs w-20">Rexel</span>
                        <span className="text-slate-600 text-xs">Leads in digital innovation but lacks U.S. scale</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                        <span className="font-semibold text-slate-900 text-xs w-20">CED</span>
                        <span className="text-slate-600 text-xs">Dominates local contractor markets but is irrelevant in large-scale programs</span>
                      </div>
                    </div>
                    
                    <p className="text-green-700 text-xs"><strong>The market is evolving such that niche strengths matter, but ecosystem integration wins — and Wesco is the only competitor with a full ecosystem across electrical, utility, and data center infrastructure.</strong></p>
                  </section>

                  {/* 8. Trend Impact Heatmap */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">8. Trend Impact Heatmap</h3>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-red-900 mb-2 text-xs">HIGH IMPACT | Short-Medium Term</h4>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>AI hyperscale data center expansion</li>
                          <li>Grid modernization + undergrounding</li>
                          <li>Electrification retrofits</li>
                          <li>AI-driven pricing and forecasting</li>
                        </ul>
                      </div>
                      
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-amber-900 mb-2 text-xs">MEDIUM IMPACT | Long-Term</h4>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Supply chain reshoring</li>
                          <li>Connected equipment adoption</li>
                          <li>Modular construction</li>
                          <li>Talent shortages</li>
                        </ul>
                      </div>
                      
                      <div className="bg-slate-100 border-2 border-slate-400 rounded-lg p-3 shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-2 text-xs">HIGH THREAT</h4>
                        <ul className="list-disc ml-4 text-slate-600 space-y-1 text-xs">
                          <li>Digital procurement transparency</li>
                          <li>Material shortages (MV/HV equipment)</li>
                          <li>Competitor consolidation</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 9. Strategic Implications */}
                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-300 pb-2">9. Strategic Implications & Recommended Actions</h3>
                    <p className="text-slate-700 text-xs">
                      A Wesco-like organization should position itself as the <strong>premier integrator of power, data, and security infrastructure</strong>.
                    </p>
                    
                    <div className="space-y-2">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-green-900 text-xs">1. Expand Hyperscale Data Center Capability</h4>
                        <p className="text-slate-600 text-xs">Through dedicated supply hubs, pre-configured solutions, and multi-region orchestration platforms.</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-yellow-900 text-xs">2. Own the Utility Modernization Ecosystem</h4>
                        <p className="text-slate-600 text-xs">By increasing MV/HV specialization, storm logistics, and selective acquisition of niche T&D providers.</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-blue-900 text-xs">3. Accelerate Digital Transformation</h4>
                        <p className="text-slate-600 text-xs">With unified pricing AI, predictive inventory engines, and an enterprise-grade customer portal.</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-purple-900 text-xs">4. Create a Verticalized Sales Model</h4>
                        <p className="text-slate-600 text-xs">Supported by engineering specialists in data center, utility, automation, and security.</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-l-4 border-slate-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-slate-900 text-xs">5. Simplify the Portfolio</h4>
                        <p className="text-slate-600 text-xs">While focusing on high-margin, high-growth segments (NSS + UPS + automation).</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500 p-3 rounded-r-lg">
                        <h4 className="font-bold text-teal-900 text-xs">6. Pursue Targeted M&A</h4>
                        <p className="text-slate-600 text-xs">To reinforce leadership in strategic verticals.</p>
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3 border-t rounded-b-xl">
            <div className="text-[10px] text-slate-500 text-center">
              Source: Formula2GX Digital's OneMindAI Analysis
            </div>
          </div>
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          {uploadErrors.map((error, i) => (
            <div key={i} className="text-sm text-red-600 flex items-start gap-2">
              <span>❌</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Usage Indicators */}
      {files.length > 0 && (
        <div className="text-xs text-slate-600 flex items-center gap-4 px-2">
          <span>
            📊 {files.length} / {FILE_LIMITS.MAX_FILE_COUNT} files
          </span>
          <span>
            💾 {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} / {FILE_LIMITS.MAX_TOTAL_SIZE / 1024 / 1024} MB used
          </span>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-12 border-4 border-dashed border-blue-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <div className="text-2xl font-bold text-blue-600 mb-2">Drop files here</div>
              <div className="text-gray-600">Supports all file types</div>
            </div>
          </div>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Image Thumbnails */}
          {files.some(file => file.type.startsWith('image/')) && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Images ({files.filter(f => f.type.startsWith('image/')).length})</div>
              <div className="flex flex-wrap gap-3">
                {files.filter(file => file.type.startsWith('image/')).map((file, index) => (
                  <div
                    key={`img-${index}`}
                    className="relative group"
                  >
                    <img
                      src={file.content}
                      alt={file.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                    />
                    <button
                      onClick={() => removeFile(files.indexOf(file))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 flex items-center justify-center text-xs font-bold"
                      disabled={disabled}
                      title="Remove file"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate rounded-b-lg">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Files */}
          {files.some(file => !file.type.startsWith('image/')) && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Documents ({files.filter(f => !f.type.startsWith('image/')).length})</div>
              <div className="flex flex-wrap gap-2">
                {files.filter(file => !file.type.startsWith('image/')).map((file, index) => {
                  const isWordDoc = file.name.endsWith('.docx') || file.name.endsWith('.doc');
                  const isPDF = file.name.endsWith('.pdf');
                  const isTxt = file.name.endsWith('.txt');
                  const isJson = file.name.endsWith('.json');
                  const isCsv = file.name.endsWith('.csv');
                  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
                  
                  return (
                    <div
                      key={`file-${index}`}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-sm border border-gray-300 shadow-sm"
                    >
                      <span className="text-lg">
                        {isWordDoc && '📘'}
                        {isPDF && '📕'}
                        {isTxt && '📝'}
                        {isJson && '📋'}
                        {isCsv && '📊'}
                        {isExcel && '📗'}
                        {!isWordDoc && !isPDF && !isTxt && !isJson && !isCsv && !isExcel && '📄'}
                      </span>
                      <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        onClick={() => removeFile(files.indexOf(file))}
                        className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                        disabled={disabled}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Document Content Preview */}
          {files.some(file => file.extractedText) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600">Document Content Preview:</div>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-white custom-scrollbar">
                {files.filter(file => file.extractedText).map((file, index) => (
                  <div key={index} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">📄</span>
                      <p className="text-xs font-semibold text-gray-700">{file.name}</p>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap pl-6">
                      {file.extractedText?.substring(0, 500)}
                      {file.extractedText && file.extractedText.length > 500 && '...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HubSpot Modal */}
      <HubSpotModal
        isOpen={showHubSpotModal}
        onClose={() => setShowHubSpotModal(false)}
        onSelectDeal={(deal) => {
          console.log('Selected deal:', deal);
          // You can add logic here to inject deal info into the prompt
          setShowHubSpotModal(false);
        }}
        onSelectContact={(contact) => {
          console.log('Selected contact:', contact);
          setShowHubSpotModal(false);
        }}
        onSelectCompany={(company) => {
          console.log('Selected company:', company);
          setShowHubSpotModal(false);
        }}
      />
    </div>
  );
}
