import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface TableChartRendererProps {
  chart: {
    id: string;
    config: any;
    sourceTable: string;
  };
}

export function TableChartRenderer({ chart }: TableChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(chart.config);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [chart.config]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Interactive Chart (Auto-generated from Table)
            </h3>
            <p className="text-xs text-gray-600">
              Hover over the chart for details • Click legend items to toggle series
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-white">
        <div 
          ref={chartRef} 
          style={{ width: '100%', height: '400px' }}
          className="rounded-lg"
        />
      </div>
      
      <div className="bg-gray-50 p-3 border-t">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-900 font-medium">
            View Source Table
          </summary>
          <div className="mt-2 p-3 bg-white rounded border">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {chart.sourceTable}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
