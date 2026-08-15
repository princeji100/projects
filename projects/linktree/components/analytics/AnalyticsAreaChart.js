'use client';

import { useState } from 'react';

/**
 * High-performance, zero-dependency responsive SVG Area Chart.
 * Renders smooth bezier curves, gradient fill, data point nodes, gridlines, and hover tooltips.
 */
export default function AnalyticsAreaChart({ data = [], range = '7d' }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // data format: [['Day', 'Clicks'], ['2026-08-08', 5], ...]
  const rows = data.slice(1);

  if (rows.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-medium">
        No click activity recorded in this period
      </div>
    );
  }

  const values = rows.map((r) => Number(r[1]) || 0);
  const labels = rows.map((r) => r[0]);

  const maxValue = Math.max(...values, 5);
  // Round upper scale to a pleasant integer
  const upperScale = Math.ceil(maxValue * 1.25);

  // Chart coordinate space
  const svgWidth = 800;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 30;
  const padBottom = 40;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Compute (x, y) coordinates for each data point
  const points = rows.map((row, i) => {
    const x = padLeft + (i / Math.max(1, rows.length - 1)) * chartW;
    const val = Number(row[1]) || 0;
    const y = padTop + chartH - (val / upperScale) * chartH;
    return { x, y, value: val, date: row[0], index: i };
  });

  // Generate smooth SVG Catmull-Rom / Bezier Path
  const makeSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = makeSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  // Grid steps (4 horizontal guide lines)
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = Math.round((upperScale / gridSteps) * i);
    const y = padTop + chartH - (val / upperScale) * chartH;
    return { val, y };
  });

  const formatDateLabel = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: '220px' }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
          </linearGradient>

          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Horizontal Gridlines & Left Y-Axis Values */}
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={gl.y}
              x2={svgWidth - padRight}
              y2={gl.y}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray={i === 0 ? '' : '3 3'}
            />
            <text
              x={padLeft - 10}
              y={gl.y + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-400 font-mono font-medium"
            >
              {gl.val}
            </text>
          </g>
        ))}

        {/* Area Gradient Fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Crisp Stroke Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#shadow)"
        />

        {/* Bottom Date Labels (Step sampled for readability across 7d, 30d, 90d, 365d) */}
        {points.map((pt, i) => {
          let showLabel = false;
          if (range === '7d') {
            showLabel = true;
          } else if (range === '30d') {
            showLabel = i % 5 === 0 || i === points.length - 1;
          } else if (range === '90d') {
            showLabel = i % 15 === 0 || i === points.length - 1;
          } else if (range === '365d') {
            showLabel = i % 60 === 0 || i === points.length - 1;
          } else {
            showLabel = i % 5 === 0 || i === points.length - 1;
          }

          if (!showLabel) return null;

          return (
            <text
              key={i}
              x={pt.x}
              y={svgHeight - 12}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-medium"
            >
              {formatDateLabel(pt.date)}
            </text>
          );
        })}

        {/* Interactive Data Point Nodes */}
        {points.map((pt, i) => {
          const isHovered = hoveredPoint?.index === i;
          const defaultRadius = range === '365d' ? 1.5 : (range === '90d' ? 2.5 : 3.5);
          return (
            <g
              key={i}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Invisible larger hit target */}
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

              {/* Point Node */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? '6' : defaultRadius}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth={isHovered ? '3' : '2'}
                className="transition-all duration-150"
              />

              {/* Static top value label on 7-day range when > 0 */}
              {range === '7d' && pt.value > 0 && !isHovered && (
                <text
                  x={pt.x}
                  y={pt.y - 8}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-blue-600 font-mono"
                >
                  {pt.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip Box on Hover */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 text-center transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
            top: `${(hoveredPoint.y / svgHeight) * 100 - 4}%`,
          }}
        >
          <div className="text-[10px] text-slate-400 font-medium">
            {formatDateLabel(hoveredPoint.date)}
          </div>
          <div className="text-xs font-bold text-white font-mono">
            {hoveredPoint.value} {hoveredPoint.value === 1 ? 'click' : 'clicks'}
          </div>
        </div>
      )}
    </div>
  );
}
