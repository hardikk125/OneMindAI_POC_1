import React, { useState } from 'react';
import { UploadedFile, processFilesWithValidation, FILE_LIMITS } from '../lib/file-utils';
import { BarChart } from './BarChart';
import { Dock, DockIcon } from './ui/dock';

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ files, onFilesChange, disabled = false }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<'crm' | 'sharepoint' | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [showPerspective, setShowPerspective] = useState(false);
  const [perspectiveTab, setPerspectiveTab] = useState<'persona' | 'business'>('persona');
  const [showCrmPopup, setShowCrmPopup] = useState(false);
  const [showSharepointPopup, setShowSharepointPopup] = useState(false);

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
    { id: 'dynamics', name: 'Microsoft Dynamics', logo: (
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
    { id: 'teams', name: 'Microsoft Teams', logo: (
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

  return (
    <div className="space-y-3">
      {/* File Upload Button */}
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
          className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          <span className="font-medium">Attach Files</span>
        </button>
        
        {/* Integration Buttons */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowCrmPopup(!showCrmPopup);
              setShowSharepointPopup(false);
            }}
            disabled={disabled}
            className={`px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              showCrmPopup
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
            }`}
          >
            <span className="font-medium">Integrate with CRM</span>
          </button>
          
          {/* CRM Popup - Opens Above with Dock */}
          {showCrmPopup && (
            <div className="absolute bottom-full left-0 mb-2 z-50 animate-fade-in">
              <Dock direction="middle" magnification={50} distance={100} className="bg-white/95 border-gray-200 shadow-lg">
                {crmIntegrations.map((crm) => (
                  <DockIcon
                    key={crm.id}
                    className="bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <button
                      onClick={() => {
                        alert(`${crm.name} Integration coming soon!\n\nConnect to ${crm.name} to sync your customer data.`);
                        setShowCrmPopup(false);
                      }}
                      className="w-full h-full flex items-center justify-center p-2"
                      title={crm.name}
                    >
                      {crm.logo}
                    </button>
                  </DockIcon>
                ))}
              </Dock>
            </div>
          )}
        </div>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSharepointPopup(!showSharepointPopup);
              setShowCrmPopup(false);
            }}
            disabled={disabled}
            className={`px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              showSharepointPopup
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
            }`}
          >
            <span className="font-medium">Integrate with SharePoint</span>
          </button>
          
          {/* Collaboration Tools Popup - Opens Above with Dock */}
          {showSharepointPopup && (
            <div className="absolute bottom-full left-0 mb-2 z-50 animate-fade-in">
              <Dock direction="middle" magnification={50} distance={100} className="bg-white/95 border-gray-200 shadow-lg">
                {collaborationIntegrations.map((tool) => (
                  <DockIcon
                    key={tool.id}
                    className="bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <button
                      onClick={() => {
                        alert(`${tool.name} Integration coming soon!\n\nConnect to ${tool.name} for seamless collaboration.`);
                        setShowSharepointPopup(false);
                      }}
                      className="w-full h-full flex items-center justify-center p-2"
                      title={tool.name}
                    >
                      {tool.logo}
                    </button>
                  </DockIcon>
                ))}
              </Dock>
            </div>
          )}
        </div>
        
        {/* Integrate Sales Data Button */}
        <button
          type="button"
          onClick={() => {
            alert('Integrate Sales Data\n\nConnect to your sales platforms (Salesforce, HubSpot, etc.) to import customer data, deals, and analytics.');
          }}
          disabled={disabled}
          className="px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50"
        >
          <span className="font-medium">Integrate Sales Data</span>
        </button>
        
        {/* Others Button (Small) */}
        <button
          type="button"
          onClick={() => {
            alert('Other Integrations\n\nMore integration options coming soon:\n• Google Drive\n• Dropbox\n• OneDrive\n• Slack\n• And more...');
          }}
          disabled={disabled}
          className="px-3 py-1.5 text-xs border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 border-gray-300 hover:border-slate-400 hover:bg-slate-50"
        >
          <span className="font-medium">Others</span>
        </button>
        
        {/* Outside-in Perspective Button */}
        <button
          type="button"
          onClick={() => setShowPerspective(!showPerspective)}
          disabled={disabled}
          className={`ml-auto px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            showPerspective
              ? 'bg-[#003366] text-white border-[#003366]'
              : 'bg-[#001f3f] text-white border-[#001f3f] hover:bg-[#003366] hover:border-[#003366]'
          }`}
        >
          <span className="font-medium">Outside-in Perspective</span>
        </button>
      </div>
      
      {/* Outside-in Perspective Tab Panel (Inline, not popup) */}
      {showPerspective && (
        <div className="mt-4 bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
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
            
            {/* Close button on the right */}
            <button
              onClick={() => setShowPerspective(false)}
              className="ml-auto text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full p-1.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {perspectiveTab === 'persona' && (
              <div className="space-y-4 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-purple-900 mb-2">🎯 Persona Analysis</h3>
                  <p className="text-slate-700">
                    Understanding your target audience's motivations, pain points, and decision-making patterns.
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2">Key Decision Makers</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1">
                      <li>C-Suite executives (CEO, CTO, CFO)</li>
                      <li>VP of Digital Transformation</li>
                      <li>Head of IT/Technology</li>
                      <li>Procurement & Vendor Management</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2">Pain Points</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1">
                      <li>Legacy system modernization</li>
                      <li>AI/ML adoption challenges</li>
                      <li>Talent acquisition & retention</li>
                      <li>Regulatory compliance</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2">Buying Triggers</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1">
                      <li>Digital transformation initiatives</li>
                      <li>Cost optimization mandates</li>
                      <li>Competitive pressure</li>
                      <li>New regulatory requirements</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2">Success Metrics</h4>
                    <ul className="list-disc ml-4 text-slate-600 space-y-1">
                      <li>ROI within 12-18 months</li>
                      <li>Operational efficiency gains</li>
                      <li>Customer experience improvement</li>
                      <li>Time-to-market reduction</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {perspectiveTab === 'business' && (
              <div className="space-y-4 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {/* Section 1: 2025 Executive Narrative */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  1. 2025 Executive Narrative (UK + Europe lens)
                </h2>
                
                <p className="text-slate-800">
                  HCLTech enters 2025 as a £10–11B / ~$14B revenue player with Europe contributing just under one-third of global revenue and growing in the mid-single digits.
                </p>
                
                <p className="text-slate-800">
                  <strong>UK is the central hub/control tower for Europe, Asia, Middle East & Africa Growth.</strong> Here's why and how to continue the growth curve from Formula2GX Digital's OneMindAI Analysis.
                </p>

                <h3 className="text-lg font-semibold text-slate-900 mt-4">Four repeatable "hero" playbooks</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Energy & Utilities – E.ON and Equinor as the regulatory AI blueprint</h4>
                    <p className="text-slate-700 mt-1">
                      Multi-country energy-transition and grid-modernisation work (E.ON, Equinor) gives HCLTech a repeatable AI + ER&D + cloud pattern for National Grid, Centrica and other UK infrastructure players:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>grid stability and outage prediction</li>
                      <li>asset performance and maintenance</li>
                      <li>customer-level energy analytics and green-tariff journeys</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Retail & CPG – high-growth, UK-relevant vertical</h4>
                    <p className="text-slate-700 mt-1">
                      Retail & CPG is one of HCLTech's fastest-growing verticals globally (+17.2% YoY in constant currency), ahead of the company average.
                    </p>
                    <p className="text-slate-700 mt-1">
                      That underpins the UK omnichannel story with Tesco/Sainsbury's-type programmes:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>SAP/AWS-based core commerce and supply-chain</li>
                      <li>AI demand forecasting and markdown optimisation</li>
                      <li>unified, data-driven loyalty and personalisation</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Banking & Insurance – GenAI-enabled compliance and operations</h4>
                    <p className="text-slate-700 mt-1">
                      Banking growth is flatter globally (–1.4% YoY CC for Financial Services), but GenAI-led compliance and automation programmes (e.g., Dubai Islamic Bank) provide a strong reference case for:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>post-Brexit regulatory change management</li>
                      <li>KYC/AML operations and alert triage</li>
                      <li>AI copilots for risk, finance and operations teams</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Engineering-led Manufacturing & Auto – Swedish/European OEMs</h4>
                    <p className="text-slate-700 mt-1">
                      Europe is already a growth pocket for engineering-heavy work (Europe up ~2.6% YoY in CC; ER&D a key driver).
                    </p>
                    <p className="text-slate-700 mt-1">
                      A large Swedish commercial-vehicle / auto platform win plus new Volvo/Equinor deals show HCLTech as an industrial modernisation partner, not just an SI:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                      <li>digital factories and IoT</li>
                      <li>AI-driven supply-chain and logistics</li>
                      <li>vehicle & fleet telematics, predictive maintenance</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mt-4">Two structural gaps you should explicitly acknowledge</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Advisory and local consulting depth</h4>
                    <p className="text-slate-700 mt-1">
                      Against Accenture, Capgemini, KPMG and PwC, HCLTech is still perceived as stronger in delivery and engineering than in boardroom-level consulting – particularly in UK public sector, central government and complex multi-stakeholder programmes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">Public sector and regulated-market penetration</h4>
                    <p className="text-slate-700 mt-1">
                      While the commercial side (retail, CPG, manufacturing, energy) is growing double-digit in places, public sector revenue is actually declining (–4.6% YoY CC), which mirrors the gap you already feel versus KPMG/PwC in UK government analytics and digital.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-4">
                  <p className="text-slate-800">
                    Even though HCLTech is headquartered in India, the data supports a UK-anchored narrative:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-slate-700 space-y-1">
                    <li>Europe is the fastest-growing and strategically critical region (20.5% CC growth in FY23; 7.6% YoY in Q2 FY25 vs 2.4% in the US).</li>
                    <li>Europe's revenue share has risen to c. 27% of global revenue in FY25, with UK, Germany and Nordics flagged as the growth engines.</li>
                    <li>Many of the flagship energy, manufacturing and public-sector references (E.ON, Equinor, Volvo Cars, UK borough councils) are Europe-based but create templates that can be exported to Middle East, Africa and Asia.</li>
                  </ul>
                  <p className="text-slate-800 mt-3">
                    So for your storyline, it's credible to position <strong>"UK as the coordination hub that orchestrates EMEA + Asia + Africa plays"</strong>: strategy, advisory, CoEs and senior client coverage are run from London, with delivery distributed globally.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-purple-900">oneMindAI Recommendation:</p>
                  <p className="text-slate-800 mt-2">
                    Framed this way, 2025 is the year to convert "engineering-led credibility" into "trusted strategic partner" status in UK boardrooms – especially where energy transition, omnichannel retail and AI-enabled operations intersect.
                  </p>
                </div>
              </section>

              {/* Section 2: Three-Year Performance Arc */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  2. 2023–2025: Three-year performance arc (numbers + narrative)
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">FY23 – "Supercharged growth, Europe breaks out"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial & deal metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $12.6B, up 9.6% YoY (13.7% CC).</li>
                      <li>Geography: Europe +20.5% CC, Americas +14.4%, RoW +11%.</li>
                      <li>Large deals: 57 large deals, $8.85B TCV (new wins).</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">What HCLTech learns (2023)</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Winning formula: engineering + infra + apps + software in one stack, heavy Europe push.</li>
                      <li>Gap: still perceived more as delivery & engineering powerhouse than boardroom advisor, especially vs. Accenture/KPMG in UK public and financial services.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">FY24 – "Resilience, AI foundations and GenAI partnerships"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial & deal metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $13.3B, up 5.4% YoY.</li>
                      <li>Large deals: 73 large deals, $9.76B TCV (new wins).</li>
                      <li>Europe share: c. 26.3% of revenue; Americas still ~63% but slowing.</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Partnerships & awards – foundations for 2025</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>SAP – GenAI CoE: HCLTech partners with SAP to build a GenAI Center of Excellence on SAP BTP.</li>
                      <li>Intel – 2024 EPIC Outstanding Supplier Award for continuous quality and collaboration.</li>
                      <li>Early inclusion in TIME World's Best Companies 2024, ranked #1 India-headquartered tech company.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">FY25 – "AI-empowered expansion, anchor deals and accolades"</h3>
                    
                    <h4 className="font-semibold text-slate-900 mt-3">Financial & deal metrics</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Revenue: $13.84B, 4.3–4.7% CC growth; EBIT margin 18.3%.</li>
                      <li>New deal wins: $9.3B TCV; Q3 and Q4 each around $3B of bookings.</li>
                      <li>Q2 FY25 specifically: CC revenue +4.6% YoY, Europe +7.6%.</li>
                    </ul>

                    <h4 className="font-semibold text-slate-900 mt-3">Awards & partner-credibility story (2023–2025)</h4>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Intel EPIC awards – three-year run (2023, 2024, 2025)</li>
                      <li>Dell Technologies: 2025 Global Alliances AI Partner of the Year</li>
                      <li>SAP: Strategic partnership + GenAI CoE</li>
                      <li>TIME: 2025 Dual recognition as World's Best Company and Most Sustainable Company</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Lessons from Competitors */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  3. Lessons from competitor wins & losses (2023–2025)
                </h2>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">2023</h3>
                    <p className="text-slate-700">
                      Accenture/TCS/Infosys secure large cloud + app-modernization programmes in UK banks and retailers; they sell "strategy through to run" with heavy consulting.
                    </p>
                    <p className="text-slate-800 font-medium mt-2">HCLTech lesson:</p>
                    <p className="text-slate-700">
                      Build UK and Europe-based advisory pods that sit on top of your delivery engine; your narrative: "we match Big-4 strategy with deeper engineering and better value."
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">2024</h3>
                    <p className="text-slate-700">
                      Capgemini and some others slow in UK & Ireland, giving whitespace; But Infosys & TCS double-down on Europe with large banking and manufacturing deals.
                    </p>
                    <p className="text-slate-800 font-medium mt-2">HCLTech lesson:</p>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Lean harder into sector specialisation (energy, manufacturing, BFSI, retail) and use European sustainability + regulatory angles to differentiate.</li>
                      <li>Turn Intel/SAP partnerships into sector playbooks, not generic alliances.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">2025</h3>
                    <p className="text-slate-700">
                      Infosys' £1.2B NHS deal shows what a UK mega-reference can do for perception. Accenture's AI bookings and acquisitions show the scale of investment in advisory + AI IP.
                    </p>
                    <p className="text-slate-800 font-medium mt-2">HCLTech lesson:</p>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li>Use E.ON + Equinor + Volvo Cars as your "mega-narrative", even if TCV is undisclosed – emphasise private cloud at European scale, energy transition, AI-driven engineering and North Sea + Nordics leadership.</li>
                      <li>Push to convert one or two UK-public or tier-1 UK bank/retail deals into big-ticket, public case studies to match the Infosys/Accenture signalling.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4: SWOT Analysis */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  4. Synthesised 2023–2025 SWOT (UK-anchored, multi-region)
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                    <h3 className="font-bold text-green-900 mb-2">Strengths (structural)</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Three-year revenue climb from $12.6B → $13.84B, with large-deal TCV $8.85B → $9.3B despite macro headwinds.</li>
                      <li>Europe as fastest-growing region, now ~27% of revenue, driven by UK, Germany and Nordics.</li>
                      <li>Deep engineering & infra + software stack; proven at scale in energy (E.ON, Equinor), auto (Volvo Cars), public sector (Harrow), FS, and retail.</li>
                      <li>Strong AI & GenAI credibility via Dell AI Partner of the Year, SAP GenAI CoE, Intel EPIC awards, and TIME "World's Best Companies" rankings.</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                    <h3 className="font-bold text-red-900 mb-2">Weaknesses</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Advisory and local consulting muscle in UK/Europe not as deep as Accenture, Capgemini, KPMG, PwC, especially in government and board-level strategy.</li>
                      <li>Visibility of UK mega-deals: compared with Infosys's NHS win, HCLTech's contracts are less public in terms of TCV, forcing more outcome-based storytelling.</li>
                      <li>Short-term softness in manufacturing and life sciences growth, even as flagship projects exist.</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                    <h3 className="font-bold text-blue-900 mb-2">Opportunities</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>UK and European energy transition – take the E.ON + Equinor + Volvo triangle and sell it as a North Sea + UK energy & mobility AI-transition blueprint.</li>
                      <li>BFSI compliance + GenAI – use your advanced AI revenue track record and Islamic/European bank stories to target Barclays, Lloyds, NatWest, challenger banks, AXA, Aviva, and MENA/Africa banks needing regulatory uplift.</li>
                      <li>Retail and omni-channel – extend Power Platform / SAP / edge-AI retail work to Tesco, Sainsbury's, Carrefour, Ahold, with UK as the design & experimentation hub.</li>
                      <li>Public sector modernisation & sustainability – TIME sustainability recognition and Green IT solutions give an angle into UK local and central government ESG-driven programs.</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                    <h3 className="font-bold text-yellow-900 mb-2">Threats</h3>
                    <ul className="list-disc ml-4 text-slate-700 text-xs space-y-1">
                      <li>Accenture, Infosys, TCS, Capgemini each own pieces of UK & European boardroom mindshare.</li>
                      <li>Macro & regulatory volatility (Brexit aftermath, EU digital/AI regulation, energy-price shocks) can delay discretionary transformation spending.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5: Executive Story */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                  5. Putting it together as an executive story for 2025
                </h2>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Three-year performance arc:</h3>
                    <p className="text-slate-700">
                      "From FY23 to FY25, HCLTech grew from $12.6B to $13.84B, with ~$28B of large-deal TCV signed in three years, and pushed Europe's share of revenue to 27%. Europe – led by the UK – is now the growth engine of the company."
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">UK-anchored sector playbooks:</h3>
                    <ul className="list-disc ml-6 text-slate-700 space-y-1">
                      <li><strong>Energy transition:</strong> E.ON + Equinor → blueprint for National Grid, Centrica, Ofgem-sensitive infra.</li>
                      <li><strong>Automotive & manufacturing:</strong> Volvo Cars + ERS → blueprint for UK/German OEMs and tier-1s.</li>
                      <li><strong>BFSI & insurance:</strong> FS vertical double-digit growth + advanced AI revenue → blueprint for Barclays, Lloyds, AXA, Aviva, GCC/African banks.</li>
                      <li><strong>Retail & public:</strong> Power Platform + Dynamics + SAP + edge AI → blueprint for Tesco, Sainsbury's and UK public bodies.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">Differentiation vs peers:</h3>
                    <p className="text-slate-700">
                      You combine Big-Tech-level AI recognition (Dell/Intel/TIME/SAP) with Indian-IT efficiency and European energy/manufacturing references.
                    </p>
                    <p className="text-slate-700 mt-2">
                      The gap to close is local advisory and perception. That's precisely where your EchoIntelligence / OneMindAI-style story fits: coaching your own teams, mapping C-suite personas, and upgrading the narrative from "great delivery partner" to "boardroom transformation co-pilot."
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
                        <th className="border p-1.5 text-right">EBIT</th>
                        <th className="border p-1.5 text-right">EU%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-1.5 font-medium">Accenture</td>
                        <td className="border p-1.5 text-right">$64.9B</td>
                        <td className="border p-1.5 text-right">14.8%</td>
                        <td className="border p-1.5 text-right">35%</td>
                      </tr>
                      <tr>
                        <td className="border p-1.5 font-medium">TCS</td>
                        <td className="border p-1.5 text-right">$27.9B</td>
                        <td className="border p-1.5 text-right">24.0%</td>
                        <td className="border p-1.5 text-right">30%</td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="border p-1.5 font-bold">HCLTech</td>
                        <td className="border p-1.5 text-right font-bold">$13.84B</td>
                        <td className="border p-1.5 text-right font-bold">18.3%</td>
                        <td className="border p-1.5 text-right font-bold">29%</td>
                      </tr>
                      <tr>
                        <td className="border p-1.5 font-medium">Infosys</td>
                        <td className="border p-1.5 text-right">~$18B</td>
                        <td className="border p-1.5 text-right">21.0%</td>
                        <td className="border p-1.5 text-right">27%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Chart 1: Revenue Comparison */}
              <BarChart
                title="IT Services Leaders - Annual Revenue"
                data={[
                  { label: 'HCLTech', value: 13.84, displayValue: '$13.8B' },
                  { label: 'Accenture', value: 64.9, displayValue: '$64.9B' },
                  { label: 'TCS', value: 27.9, displayValue: '$27.9B' },
                  { label: 'Infosys', value: 18, displayValue: '$18B' }
                ]}
                height="h-48"
                color="#F59E0B"
                highlightIndex={0}
              />

              {/* Chart 2: EBIT Margin */}
              <BarChart
                title="Operating / EBIT Margin Comparison"
                data={[
                  { label: 'HCLTech', value: 18.3, displayValue: '18.3%' },
                  { label: 'Accenture', value: 14.8, displayValue: '14.8%' },
                  { label: 'TCS', value: 24.0, displayValue: '24.0%' },
                  { label: 'Infosys', value: 21.0, displayValue: '21.0%' }
                ]}
                height="h-32"
                color="#10B981"
                highlightIndex={0}
              />

              {/* Chart 3: Europe Share */}
              <BarChart
                title="Europe / UK Share of Revenue"
                data={[
                  { label: 'HCLTech', value: 29, displayValue: '29%' },
                  { label: 'Accenture', value: 35, displayValue: '35%' },
                  { label: 'TCS', value: 30, displayValue: '30%' },
                  { label: 'Infosys', value: 27, displayValue: '27%' }
                ]}
                height="h-32"
                color="#F59E0B"
                highlightIndex={0}
              />

              {/* SWOT */}
              <section>
                <h3 className="text-lg font-bold text-slate-900 mb-3">💡 Strategic SWOT (UK-Anchored)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Strengths</h4>
                    <ul className="text-xs text-green-800 space-y-1 list-disc ml-4">
                      <li>Europe fastest-growing region (~27% revenue)</li>
                      <li>Deep engineering + AI credibility</li>
                      <li>Dell AI Partner of the Year 2025</li>
                      <li>TIME World's Best Companies recognition</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Weaknesses</h4>
                    <ul className="text-xs text-red-800 space-y-1 list-disc ml-4">
                      <li>Advisory depth vs Accenture/KPMG/PwC</li>
                      <li>Public sector penetration gaps</li>
                      <li>Lower mega-deal visibility</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Opportunities</h4>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc ml-4">
                      <li>UK energy transition (E.ON, Equinor blueprint)</li>
                      <li>BFSI GenAI compliance programs</li>
                      <li>Retail omnichannel modernization</li>
                      <li>Public sector sustainability programs</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Threats</h4>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc ml-4">
                      <li>Accenture/TCS/Infosys boardroom mindshare</li>
                      <li>Brexit & EU regulatory volatility</li>
                      <li>Macro spending delays</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Key Recommendation */}
              <section className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">OneMindAI Recommendation</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  2025 is the year to convert "engineering-led credibility" into "trusted strategic partner" status in UK boardrooms – especially where energy transition, omnichannel retail and AI-enabled operations intersect.
                </p>
              </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3 border-t rounded-b-xl">
            <div className="text-[10px] text-slate-600 text-center mb-3">
              Source: Formula2GX Digital's OneMindAI Analysis
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // TODO: Add functionality to add content as prompt
                  alert('This feature will add the Outside-in Perspective content to your prompt');
                  setShowPerspective(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                Add this as prompt
              </button>
              <button
                onClick={() => setShowPerspective(false)}
                className="flex-1 px-4 py-2 bg-[#001f3f] text-white rounded-lg hover:bg-[#003366] transition text-sm font-medium"
              >
                Close
              </button>
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

      {/* Help Text */}
      {files.length === 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Tip:</strong> You can also paste screenshots directly with <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl/Cmd + V</kbd></p>
          <p>📁 <strong>Supported:</strong> All file types - Images, Text (.txt), Word (.docx), PDFs, Excel (.xlsx), CSV, JSON, and more</p>
        </div>
      )}
    </div>
  );
}
