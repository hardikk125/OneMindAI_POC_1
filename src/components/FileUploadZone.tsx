import React, { useState } from 'react';
import { UploadedFile, processFilesWithValidation, FILE_LIMITS } from '../lib/file-utils';
import { BarChart } from './BarChart';

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
        <button
          type="button"
          onClick={() => {
            setSelectedIntegration(selectedIntegration === 'crm' ? null : 'crm');
            if (selectedIntegration !== 'crm') {
              alert('CRM Integration coming soon!\n\nConnect to Salesforce, HubSpot, or other CRM systems.');
            }
          }}
          disabled={disabled}
          className={`px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedIntegration === 'crm'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
          }`}
        >
          <span className="font-medium">Integrate with CRM</span>
        </button>
        
        <button
          type="button"
          onClick={() => {
            setSelectedIntegration(selectedIntegration === 'sharepoint' ? null : 'sharepoint');
            if (selectedIntegration !== 'sharepoint') {
              alert('SharePoint Integration coming soon!\n\nConnect to Microsoft SharePoint for document management.');
            }
          }}
          disabled={disabled}
          className={`px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedIntegration === 'sharepoint'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
          }`}
        >
          <span className="font-medium">Integrate with SharePoint</span>
        </button>
        
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
          onClick={() => setShowPerspective(true)}
          disabled={disabled}
          className="ml-auto px-4 py-2 text-sm border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#001f3f] text-white border-[#001f3f] hover:bg-[#003366] hover:border-[#003366]"
        >
          <span className="font-medium">Outside-in Perspective</span>
        </button>
      </div>
      
      {/* Outside-in Perspective Slide-in Panel */}
      {showPerspective && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[800px] lg:w-[900px] bg-white shadow-2xl overflow-y-auto animate-slide-in">
          <div className="relative">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#001f3f] to-[#003366] text-white p-4 z-20 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Outside-in Perspective</h2>
                  <p className="text-sm text-blue-100 mt-1">HCLTech 2025 Executive Narrative - UK + Europe Lens</p>
                </div>
                <button
                  onClick={() => setShowPerspective(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Word Document Style */}
            <div className="p-6 pt-8 space-y-6 text-sm leading-relaxed bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
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

            {/* Footer */}
            <div className="bg-slate-50 p-3 border-t">
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
