import React from 'react';
import Plot from './PlotWrapper';

const darkLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { family: 'Inter, sans-serif', color: '#94a3b8', size: 12 },
  xaxis: {
    gridcolor:     'rgba(255,255,255,0.05)',
    tickcolor:     'rgba(255,255,255,0.15)',
    linecolor:     'rgba(255,255,255,0.1)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
  yaxis: {
    gridcolor:     'rgba(255,255,255,0.05)',
    tickcolor:     'rgba(255,255,255,0.15)',
    linecolor:     'rgba(255,255,255,0.1)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
  legend: {
    bgcolor:     'rgba(0,0,0,0)',
    bordercolor: 'rgba(255,255,255,0.08)',
    borderwidth: 1,
  },
  margin: { t: 44, l: 56, r: 32, b: 56 },
};

const mergeLayout = (base) => {
  const merged = {
    ...darkLayout,
    ...base,
    xaxis: { ...darkLayout.xaxis, ...(base?.xaxis || {}) },
    yaxis: { ...darkLayout.yaxis, ...(base?.yaxis || {}) },
    font:   { ...darkLayout.font,  ...(base?.font  || {}) },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    margin: { ...darkLayout.margin, ...(base?.margin || {}) },
  };
  // Only add yaxis2 if explicitly provided
  if (base?.yaxis2) {
    merged.yaxis2 = { ...base.yaxis2 };
  }
  // Only add scene if explicitly provided (for 3D charts)
  if (base?.scene) {
    merged.scene = {
      ...base.scene,
      bgcolor: 'rgba(0,0,0,0)',
      xaxis: { gridcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8', ...(base.scene.xaxis || {}) },
      yaxis: { gridcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8', ...(base.scene.yaxis || {}) },
      zaxis: { gridcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8', ...(base.scene.zaxis || {}) },
    };
  }
  // Remove any keys with undefined values
  Object.keys(merged).forEach(key => {
    if (merged[key] === undefined) delete merged[key];
  });
  return merged;
};


// ─── Plot card wrapper ─────────────────────────────────────────────────────────
const PlotCard = ({ title, dot, subtitle, data, layout, height = 380 }) => (
  <div className="glass-card plot-card">
    <div className="plot-title">
      <span className={`plot-title-dot ${dot}`} />
      <span>{title}</span>
      {subtitle && (
        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '8px', fontWeight: 400 }}>
          {subtitle}
        </span>
      )}
    </div>
    {data && data.length > 0 ? (
      <Plot
        data={data}
        layout={mergeLayout(layout)}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: `${height}px` }}
      />
    ) : (
      <div className="plot-empty">No data available</div>
    )}
  </div>
);

// ─── Full-width wrapper ────────────────────────────────────────────────────────
const FullWidth = ({ children }) => (
  <div className="viz-grid-full">{children}</div>
);

// ─── Section divider ──────────────────────────────────────────────────────────
const SectionLabel = ({ label }) => (
  <div className="viz-grid-full" style={{
    padding: '8px 4px 4px',
    color: '#475569',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '4px',
  }}>
    {label}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const VisualizationTab = ({ plotData }) => {
  if (!plotData) {
    return (
      <div className="glass-card plot-card">
        <div className="plot-empty">No visualization data available. Run an allocation first.</div>
      </div>
    );
  }

  const pd = plotData;

  return (
    <div className="viz-grid">

      {/* ── Section 1: Pareto Front ────────────────────────────────────── */}
      <SectionLabel label="Pareto Optimality" />

      <PlotCard
        title="2D Pareto Front"
        dot="dot-blue"
        subtitle="Avg Rank vs Stability"
        data={pd.pareto_2d?.data}
        layout={pd.pareto_2d?.layout}
        height={360}
      />
      <PlotCard
        title="Pareto vs Random Baseline"
        dot="dot-pink"
        subtitle="Pareto solutions vs random candidates"
        data={pd.pareto_vs_random?.data}
        layout={pd.pareto_vs_random?.layout}
        height={360}
      />

      <FullWidth>
        <PlotCard
          title="3D Pareto Front"
          dot="dot-cyan"
          subtitle="Avg Rank · Stability · Alpha Score"
          data={pd.pareto_3d?.data}
          layout={pd.pareto_3d?.layout}
          height={500}
        />
      </FullWidth>

      {/* ── Section 2: Per-Solution Rankings & Satisfaction ───────────── */}
      <SectionLabel label="Rankings & Satisfaction" />

      <PlotCard
        title="Avg Rank per Layer"
        dot="dot-green"
        subtitle="Per-solution comparison across criterion layers"
        data={pd.avg_rank_per_layer?.data}
        layout={pd.avg_rank_per_layer?.layout}
        height={360}
      />
      <PlotCard
        title="Per-Agent Satisfaction Distribution"
        dot="dot-orange"
        subtitle="Box plot of satisfaction scores per solution"
        data={pd.per_agent_satisfaction?.data}
        layout={pd.per_agent_satisfaction?.layout}
        height={360}
      />

      <FullWidth>
        <PlotCard
          title="Layerwise Rank Correlation"
          dot="dot-teal"
          subtitle="Heatmap: layers × solutions (lower rank = better)"
          data={pd.layerwise_rank_correlation?.data}
          layout={pd.layerwise_rank_correlation?.layout}
          height={360}
        />
      </FullWidth>

      {/* ── Section 3: Stability & Sensitivity ───────────────────────── */}
      <SectionLabel label="Stability & Sensitivity" />

      <PlotCard
        title="Stability Score Convergence"
        dot="dot-violet"
        subtitle="Per-solution disruption robustness"
        data={pd.stability_convergence?.data}
        layout={pd.stability_convergence?.layout}
        height={340}
      />
      <PlotCard
        title="Sensitivity of Alpha Score"
        dot="dot-yellow"
        subtitle="Robustness to rank noise vs stability"
        data={pd.alpha_sensitivity?.data}
        layout={pd.alpha_sensitivity?.layout}
        height={340}
      />

      <FullWidth>
        <PlotCard
          title="Sensitivity Heatmap"
          dot="dot-purple"
          subtitle="Normalized metrics across all Pareto solutions"
          data={pd.sensitivity_heatmap?.data}
          layout={pd.sensitivity_heatmap?.layout}
          height={Math.max(280, (pd.sensitivity_heatmap?.data?.[0]?.y?.length || 4) * 56 + 120)}
        />
      </FullWidth>

      {/* ── Section 4: Regret & Resources ────────────────────────────── */}
      <SectionLabel label="Regret & Resource Utilization" />

      <PlotCard
        title="Regret Distribution"
        dot="dot-red"
        subtitle="Per-agent regret boxplot per solution"
        data={pd.regret_distribution?.data}
        layout={pd.regret_distribution?.layout}
        height={360}
      />
      <PlotCard
        title="Resource Utilization"
        dot="dot-lime"
        subtitle="How often each resource appears in Pareto solutions"
        data={pd.resource_utilization?.data}
        layout={pd.resource_utilization?.layout}
        height={360}
      />

      {/* ── Section 5: Multi-objective overview ──────────────────────── */}
      <SectionLabel label="Alpha Score & Multi-objective Trade-offs" />

      <PlotCard
        title="α‑Score Distribution"
        dot="dot-sky"
        subtitle="Per-layer Pareto-optimality count per solution"
        data={pd.alpha_scores?.data}
        layout={pd.alpha_scores?.layout}
        height={340}
      />

      <FullWidth>
        <PlotCard
          title="Parallel Coordinates"
          dot="dot-indigo"
          subtitle="All metrics simultaneously – colored by alpha score"
          data={pd.parallel_coordinates?.data}
          layout={pd.parallel_coordinates?.layout}
          height={420}
        />
      </FullWidth>

    </div>
  );
};

export default VisualizationTab;