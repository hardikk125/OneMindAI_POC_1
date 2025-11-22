import React, { useEffect, useRef, useState } from 'react';
import Plot from 'react-plotly.js';

interface ChartRendererProps {
  code: string;
  language: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ code, language }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (language !== 'python') return;

    // Try to extract chart data from Python code
    try {
      // Check if it's matplotlib code
      if (code.includes('matplotlib') || code.includes('plt.')) {
        const plotlyData = convertMatplotlibToPlotly(code);
        if (plotlyData) {
          setChartData(plotlyData);
        }
      }
    } catch (err) {
      setError('Could not render chart');
    }
  }, [code, language]);

  const convertMatplotlibToPlotly = (pythonCode: string): any => {
    try {
      // Extract data from the code
      const dataMatch = pythonCode.match(/data\s*=\s*{([^}]+)}/);
      if (!dataMatch) return null;

      const dataStr = dataMatch[1];
      
      // Parse Month/labels
      const monthMatch = dataStr.match(/'Month':\s*\[([^\]]+)\]/);
      const revenueMatch = dataStr.match(/'Revenue':\s*\[([^\]]+)\]/);
      
      if (!monthMatch || !revenueMatch) return null;

      const months = monthMatch[1].split(',').map(m => m.trim().replace(/['"]/g, ''));
      const revenues = revenueMatch[1].split(',').map(r => parseFloat(r.trim()));

      // Create Plotly data
      return {
        data: [{
          x: months,
          y: revenues,
          type: 'scatter',
          mode: 'lines+markers',
          marker: { color: '#2E86AB', size: 10 },
          line: { color: '#2E86AB', width: 3 },
          name: 'Revenue'
        }],
        layout: {
          title: 'Revenue Trends Over Time',
          xaxis: { title: 'Month' },
          yaxis: { title: 'Revenue' },
          hovermode: 'closest',
          plot_bgcolor: '#f8fafc',
          paper_bgcolor: '#ffffff',
        }
      };
    } catch (err) {
      return null;
    }
  };

  if (!chartData) return null;

  return (
    <div className="my-4 p-4 bg-white rounded-lg border">
      <Plot
        data={chartData.data}
        layout={chartData.layout}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%', height: '400px' }}
      />
    </div>
  );
};
