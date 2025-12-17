import React, { useState } from 'react';
import { MorphingCardStack, type CardData, type LayoutMode } from './ui/morphing-card-stack';
import { Grid3X3, Layers, LayoutList } from 'lucide-react';
import { COMPANIES, type Company } from './CompanyBanner';

interface CompanyCardStackProps {
  onCompanySelect: (company: Company | null) => void;
  selectedCompanyId?: string;
}

export function CompanyCardStack({ onCompanySelect, selectedCompanyId }: CompanyCardStackProps) {
  const [layout, setLayout] = useState<LayoutMode>('grid');

  // Convert COMPANIES to CardData format
  const cardData: CardData[] = COMPANIES.map((company) => ({
    id: company.id,
    title: company.name,
    description: company.description,
    icon: company.logo,
  }));

  const handleCardClick = (card: CardData) => {
    const company = COMPANIES.find((c) => c.id === card.id);
    if (company) {
      // Toggle selection
      if (selectedCompanyId === card.id) {
        onCompanySelect(null);
      } else {
        onCompanySelect(company);
      }
    }
  };

  const layoutIcons = {
    stack: Layers,
    grid: Grid3X3,
    list: LayoutList,
  };

  return (
    <div className="space-y-4">
      {/* Layout Toggle */}
      <div className="flex items-center justify-start gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(Object.keys(layoutIcons) as LayoutMode[]).map((mode) => {
          const Icon = layoutIcons[mode];
          return (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`rounded-md p-2 transition-all ${
                layout === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-slate-200'
              }`}
              aria-label={`Switch to ${mode} layout`}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Company Cards */}
      <MorphingCardStack
        cards={cardData}
        defaultLayout={layout}
        onCardClick={handleCardClick}
        className="w-full"
      />
    </div>
  );
}
