'use client';
import { Chart } from "react-google-charts";
import { useState } from "react";

const Graf = ({ data }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const options = {
    title: "Clicks Over the Last 30 Days",
    titleTextStyle: {
      color: '#1e293b',
      fontSize: 16,
      bold: true
    },
    hAxis: {
      title: 'Day',
      format: 'yyyy-MM-dd',
      gridlines: {
        count: -1,
        units: {
          days: { format: ['MMM dd'] },
        }
      },
      textStyle: { 
        color: '#64748b',
        fontSize: 11 
      }
    },
    vAxis: {
      title: 'Clicks',
      baseline: 0,
      minValue: 0,
      textStyle: { 
        color: '#64748b',
        fontSize: 11 
      },
      gridlines: { 
        color: '#f1f5f9',
        count: 4
      }
    },
    legend: { position: 'none' },
    colors: ['#3b82f6'],
    curveType: "function",
    pointSize: 6,
    lineWidth: 3,
    animation: {
      duration: 1000,
      easing: "out",
    },
    chartArea: {
      width: '85%',
      height: '75%',
      top: 48,
      left: 64,
      right: 32,
      bottom: 48
    },
    backgroundColor: { fill:'transparent' },
    focusTarget: 'category'
  };

  const handleError = () => {
    setError("Failed to load chart");
    setIsLoading(false);
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center text-slate-600">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="text-slate-600">Loading chart...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-600">{error}</div>
        </div>
      )}
      <Chart
        chartType="LineChart"
        width="100%"
        height="100%"
        data={data}
        options={options}
        className="absolute inset-0"
        onLoad={() => setIsLoading(false)}
        onError={handleError}
        loader={<div>Loading Chart...</div>}
      />
    </div>
  );
};

export default Graf;