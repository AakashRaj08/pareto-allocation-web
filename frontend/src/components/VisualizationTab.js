import React from 'react';
import Plot from 'react-plotly.js';

// Dark theme base for all Plotly charts
const darkLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, sans-serif', color: '#94a3b8', size: 12 },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    tickcolor: 'rgba(255,255,255,0.15)',
    linecolor: 'rgba(255,255,255,0.1)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    tickcolor: 'rgba(255,255,255,0.15)',
    linecolor: 'rgba(255,255,255,0.1)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    bordercolor: 'rgba(255,255,255,0.08)',
    borderwidth: 1,
  },
  margin: { t: 24, l: 48, r: 24, b: 48 },
};

const mergeLayout = (base) => ({
  ...darkLayout,
  ...base,
  xaxis: { ...darkLayout.xaxis, ...(base?.xaxis || {}) },
  yaxis: { ...darkLayout.yaxis, ...(base?.yaxis || {}) },
  font: { ...darkLayout.font, ...(base?.font || {}) },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  margin: { ...darkLayout.margin, ...(base?.margin || {}) },
});

const PlotCard = ({ title, dot, data, layout, height = 380, children }) => (
  <div className="glass-card plot-card">
    <div className="plot-title">
      <span className={`plot-title-dot ${dot}`} />
      {title}
    </div>
    {data && data.length > 0 ? (
      <Plot
        data={data}
        layout={mergeLayout(layout)}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: `${height}px` }}
      />
    ) : (
      children || <div className="plot-empty">No data available</div>
    )}
  </div>
);

const VisualizationTab = ({ plotData }) => {
  if (!plotData) {
    return (
      <div className="glass-card plot-card">
        <div className="plot-empty">No visualization data available.</div>
      </div>
    );
  }

  return (
    <div className="viz-grid">
      <PlotCard
        title="2D Pareto Front"
        dot="dot-blue"
        data={plotData.pareto_2d?.data}
        layout={plotData.pareto_2d?.layout}
        height={360}
      />

      <PlotCard
        title="α‑Score Distribution"
        dot="dot-violet"
        data={plotData.alpha_scores?.data}
        layout={plotData.alpha_scores?.layout}
        height={360}
      />

      <div className="viz-grid-full">
        <PlotCard
          title="3D Pareto Front"
          dot="dot-cyan"
          data={plotData.pareto_3d?.data}
          layout={plotData.pareto_3d?.layout}
          height={480}
        />
      </div>

      <div className="viz-grid-full">
        <PlotCard
          title="Regret Distribution"
          dot="dot-pink"
          data={plotData.regret_distribution?.data}
          layout={plotData.regret_distribution?.layout}
          height={360}
        />
      </div>
    </div>
  );
};

export default VisualizationTab;