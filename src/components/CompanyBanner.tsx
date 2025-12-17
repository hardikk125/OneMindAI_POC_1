import React from 'react';

export interface Company {
  id: string;
  name: string;
  logo: React.ReactNode;
  description: string;
}

interface CompanyBannerProps {
  companies: Company[];
  onCompanySelect: (company: Company | null) => void;
  selectedCompanyId?: string;
  layout?: 'grid' | 'list' | 'stack';
  searchQuery?: string;
}

export function CompanyBanner({ companies, onCompanySelect, selectedCompanyId, layout = 'grid', searchQuery = '' }: CompanyBannerProps) {
  // Filter and sort companies based on search query
  const filteredAndSortedCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return companies;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company => 
      company.name.toLowerCase().includes(query) || 
      company.description.toLowerCase().includes(query)
    );
    
    // Sort by relevance: exact matches first, then starts with, then contains
    return filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact match
      if (aName === query) return -1;
      if (bName === query) return 1;
      
      // Starts with
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
      
      // Alphabetical for same relevance
      return aName.localeCompare(bName);
    });
  }, [companies, searchQuery]);
  
  // No results message
  if (filteredAndSortedCompanies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No companies found matching "{searchQuery}"</p>
        <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
      </div>
    );
  }
  
  // Grid Layout
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredAndSortedCompanies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          return (
            <button
              key={company.id}
              onClick={() => onCompanySelect(isSelected ? null : company)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-500 shadow-xl scale-105'
                  : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
              }`}
              title={company.description}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden ${
                isSelected ? 'shadow-lg ring-2 ring-blue-400 bg-white' : 'bg-gray-50'
              }`}>
                {company.logo}
              </div>
              <span className={`text-xs font-bold tracking-wide transition-colors duration-300 text-center ${
                isSelected ? 'text-blue-900' : 'text-gray-600'
              }`}>
                {company.name}
              </span>
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // List Layout
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {filteredAndSortedCompanies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          return (
            <button
              key={company.id}
              onClick={() => onCompanySelect(isSelected ? null : company)}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-500 shadow-lg'
                  : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                isSelected ? 'shadow-lg ring-2 ring-blue-400 bg-white' : 'bg-gray-50'
              }`}>
                {company.logo}
              </div>
              <div className="flex-1 text-left">
                <h3 className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {company.name}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">{company.description}</p>
              </div>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Stack Layout (original scrollable horizontal)
  return (
    <div className="relative">
      {/* Scroll Left Button */}
      <button
        onClick={() => {
          const container = document.getElementById('company-scroll-container');
          if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
        }}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border-2 border-blue-200 rounded-full shadow-md flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* Scroll Right Button */}
      <button
        onClick={() => {
          const container = document.getElementById('company-scroll-container');
          if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
        }}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border-2 border-blue-200 rounded-full shadow-md flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* Gradient Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none z-[5]"></div>
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none z-[5]"></div>
      
      {/* Scrollable Container */}
      <div 
        id="company-scroll-container"
        className="flex items-center gap-3 overflow-x-auto scroll-smooth px-10 py-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {filteredAndSortedCompanies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          return (
            <button
              key={company.id}
              onClick={() => onCompanySelect(isSelected ? null : company)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 min-w-[90px] flex-shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-500 shadow-xl scale-110 -translate-y-1'
                  : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5'
              }`}
              title={company.description}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden ${
                isSelected ? 'shadow-lg ring-2 ring-blue-400 bg-white' : 'bg-gray-50'
              }`}>
                {company.logo}
              </div>
              <span className={`text-xs font-bold tracking-wide transition-colors duration-300 ${
                isSelected ? 'text-blue-900' : 'text-gray-600'
              }`}>
                {company.name}
              </span>
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pre-configured companies with REAL logo images from CDN
export const COMPANIES: Company[] = [
  {
    id: 'wesco',
    name: 'Wesco',
    logo: (
      <img 
        src="https://back.3blmedia.com/sites/default/files/Clients/wesco_logo_csrwire_2022.png" 
        alt="Wesco" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23C8102E" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">W</text></svg>'; }}
      />
    ),
    description: 'Wesco International - Electrical Distribution'
  },
  {
    id: 'accenture',
    name: 'Accenture',
    logo: (
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Accenture.svg/200px-Accenture.svg.png" 
        alt="Accenture" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23A100FF" width="100" height="100" rx="8"/><text x="50" y="65" font-size="50" fill="white" text-anchor="middle" font-weight="bold">></text></svg>'; }}
      />
    ),
    description: 'Accenture - Professional Services'
  },
  {
    id: 'capgemini',
    name: 'Capgemini',
    logo: (
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg" 
        alt="Capgemini" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230070AD" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">C</text></svg>'; }}
      />
    ),
    description: 'Capgemini - Digital Transformation'
  },
  {
    id: 'tcs',
    name: 'TCS',
    logo: (
      <img 
        src="https://images.ctfassets.net/7xz1x21beds9/4cTq1jt8uh8jnBgvWbpKOV/663b48744791bd4e5ca178ae503d4916/Tata_Consultancy_Services_Logo.svg.png?w=1029&h=1029&q=90&fm=png" 
        alt="TCS" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231A1A1A" width="100" height="100" rx="8"/><text x="50" y="60" font-size="30" fill="white" text-anchor="middle" font-weight="bold">TCS</text></svg>'; }}
      />
    ),
    description: 'Tata Consultancy Services'
  },
  {
    id: 'infosys',
    name: 'Infosys',
    logo: (
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/200px-Infosys_logo.svg.png" 
        alt="Infosys" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23007CC3" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">I</text></svg>'; }}
      />
    ),
    description: 'Infosys - IT Services'
  },
  {
    id: 'wipro',
    name: 'Wipro',
    logo: (
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wipro_Primary_Logo_Color_RGB.svg/200px-Wipro_Primary_Logo_Color_RGB.svg.png" 
        alt="Wipro" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23441A6E" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">W</text></svg>'; }}
      />
    ),
    description: 'Wipro - Technology Services'
  },
  {
    id: 'cognizant',
    name: 'Cognizant',
    logo: (
      <img 
        src="https://latestlogo.com/wp-content/uploads/2024/02/cognizant.png" 
        alt="Cognizant" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231A4CA1" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">C</text></svg>'; }}
      />
    ),
    description: 'Cognizant - Digital Services'
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    logo: (
      <img 
        src="https://logolook.net/wp-content/uploads/2022/06/Deloitte-Symbol.png" 
        alt="Deloitte" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2386BC25" width="100" height="100" rx="8"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">D</text></svg>'; }}
      />
    ),
    description: 'Deloitte - Consulting'
  },
  {
    id: 'pwc',
    name: 'PwC',
    logo: (
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/PricewaterhouseCoopers_Logo.svg/200px-PricewaterhouseCoopers_Logo.svg.png" 
        alt="PwC" 
        className="w-14 h-14 object-contain"
        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23DC6900" width="100" height="100" rx="8"/><text x="50" y="60" font-size="30" fill="white" text-anchor="middle" font-weight="bold">PwC</text></svg>'; }}
      />
    ),
    description: 'PricewaterhouseCoopers'
  }
];
