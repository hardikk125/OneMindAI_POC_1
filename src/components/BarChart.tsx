import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  displayValue: string;
}

interface BarChartProps {
  title: string;
  data: BarChartData[];
  height?: string;
  color?: string;
  highlightIndex?: number;
}

export function BarChart({ 
  title, 
  data, 
  height = 'h-48', 
  color = '#F59E0B',
  highlightIndex 
}: BarChartProps) {
  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  
  // Generate Y-axis labels (0 to max in 5 steps)
  const yAxisSteps = 5;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = (maxValue / yAxisSteps) * i;
    return Math.round(value);
  }).reverse();

  // Determine Y-axis label based on title
  const getYAxisLabel = () => {
    if (title.includes('Revenue')) return 'Revenue (USD Billions)';
    if (title.includes('Margin')) return 'Margin (%)';
    if (title.includes('Europe')) return 'Share of Revenue (%)';
    return '';
  };

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      
      <div className="bg-white">
        <div className="flex gap-3">
          {/* Y-axis label (vertical) */}
          <div className="flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-[10px] text-slate-600 font-medium">{getYAxisLabel()}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex gap-2">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-[10px] text-slate-600 pr-2" style={{ height: height === 'h-48' ? '200px' : '140px' }}>
                {yAxisLabels.map((label, i) => (
                  <div key={i} className="text-right leading-none">{label}</div>
                ))}
              </div>
              
              {/* Chart area with gridlines */}
              <div className="flex-1 relative border-l border-b border-slate-300" style={{ height: height === 'h-48' ? '200px' : '140px' }}>
                {/* Horizontal gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {yAxisLabels.map((_, i) => (
                    <div key={i} className="border-t border-slate-200 w-full"></div>
                  ))}
                </div>
                
                {/* Bars */}
                <div className="absolute inset-0 flex justify-around gap-4 px-4 pb-0 z-10">
                  {data.map((item, index) => {
                    const heightPercent = (item.value / maxValue) * 100;
                    const isHighlighted = highlightIndex === index;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex flex-col justify-end items-center"
                        style={{ width: '60px', height: '100%' }}
                      >
                        <div 
                          className={`w-full transition-all ${isHighlighted ? 'opacity-100' : 'opacity-90'}`}
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: color,
                            minHeight: '8px',
                            borderRadius: '2px 2px 0 0'
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="flex gap-2 mt-3">
              <div style={{ width: '32px' }}></div>
              <div className="flex-1 flex justify-around gap-4 px-4">
                {data.map((item, index) => {
                  const isHighlighted = highlightIndex === index;
                  return (
                    <div key={index} className="flex flex-col items-center" style={{ width: '60px' }}>
                      <span className={`text-[11px] text-center ${isHighlighted ? 'font-bold' : 'font-medium'} text-slate-900`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-600 mt-0.5">
                        {item.displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* X-axis title */}
            <div className="text-center text-[10px] text-slate-600 mt-2 font-medium">Company</div>
          </div>
        </div>
      </div>
    </section>
  );
}
