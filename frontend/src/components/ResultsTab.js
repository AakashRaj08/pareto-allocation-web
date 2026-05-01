import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */
const fmt = (v, decimals = 3) =>
  v == null ? '—' : typeof v === 'number' ? v.toFixed(decimals) : String(v);

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

/* Metric definitions: key → { label, icon, color, format, higherBetter } */
const METRIC_DEFS = [
  { key: 'avg_rank_selected',  label: 'Avg Rank',        icon: '📊', color: 'blue',   format: fmt,   higherBetter: false },
  { key: 'alpha_score',        label: 'α-Score',         icon: '⚡', color: 'violet', format: fmt,   higherBetter: true  },
  { key: 'stability',          label: 'Stability',        icon: '🧲', color: 'cyan',   format: fmt,   higherBetter: true  },
  { key: 'sensitivity',        label: 'Sensitivity',      icon: '🎯', color: 'orange', format: fmt,   higherBetter: false },
  { key: 'utilization',        label: 'Utilization',      icon: '📦', color: 'green',  format: pct,   higherBetter: true  },
  { key: 'efficiency',         label: 'Efficiency',       icon: '⚙️', color: 'teal',   format: fmt,   higherBetter: true  },
  { key: 'fairness_gini',      label: 'Gini (Fairness)',  icon: '⚖️', color: 'pink',   format: fmt,   higherBetter: false },
  { key: 'fairness_max_regret',label: 'Max Regret',       icon: '😔', color: 'red',    format: fmt,   higherBetter: false },
];

const colorMap = {
  blue:   { bg: 'rgba(79,158,255,0.1)',   border: 'rgba(79,158,255,0.3)',   text: 'var(--accent-blue)'   },
  violet: { bg: 'rgba(168,85,247,0.1)',   border: 'rgba(168,85,247,0.3)',   text: 'var(--accent-violet)' },
  cyan:   { bg: 'rgba(34,211,238,0.1)',   border: 'rgba(34,211,238,0.3)',   text: 'var(--accent-cyan)'   },
  orange: { bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.3)',   text: 'var(--accent-orange)' },
  green:  { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',   text: 'var(--accent-green)'  },
  teal:   { bg: 'rgba(45,212,191,0.1)',   border: 'rgba(45,212,191,0.3)',   text: 'var(--accent-teal)'   },
  pink:   { bg: 'rgba(236,72,153,0.1)',   border: 'rgba(236,72,153,0.3)',   text: 'var(--accent-pink)'   },
  red:    { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)',  text: 'var(--accent-red)'    },
};

/* small inline bar */
const MiniBar = ({ value, color = 'blue', inverse = false }) => {
  if (value == null) return null;
  const pctVal = Math.min(100, Math.max(0, inverse ? (1 - value) * 100 : value * 100));
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="res-minibar-track">
      <div className="res-minibar-fill" style={{ width: `${pctVal}%`, background: c.text }} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Summary KPI strip (selected solution metrics)
   ───────────────────────────────────────────────────────────────────────────── */
const SummaryStrip = ({ selected }) => {
  const metrics = selected?.metrics || {};
  return (
    <div className="res-kpi-grid">
      {METRIC_DEFS.map(def => {
        const val = metrics[def.key];
        const c = colorMap[def.color];
        return (
          <div
            key={def.key}
            className="res-kpi-card glass-card"
            style={{ borderColor: c.border }}
          >
            <div className="res-kpi-icon">{def.icon}</div>
            <div className="res-kpi-value" style={{ color: c.text }}>
              {def.format(val)}
            </div>
            <div className="res-kpi-label">{def.label}</div>
            <MiniBar
              value={val}
              color={def.color}
              inverse={!def.higherBetter}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Allocation panel — shows agent → resource mapping for selected solution
   ───────────────────────────────────────────────────────────────────────────── */
const AllocationPanel = ({ sol, selectedIdx }) => {
  if (!sol) return null;
  const allocation = sol.allocation || {};
  const entries = Object.entries(allocation);
  const gradients = [
    'linear-gradient(135deg,#4f9eff,#a855f7)',
    'linear-gradient(135deg,#22d3ee,#4f9eff)',
    'linear-gradient(135deg,#a855f7,#ec4899)',
    'linear-gradient(135deg,#10b981,#22d3ee)',
    'linear-gradient(135deg,#f59e0b,#ec4899)',
    'linear-gradient(135deg,#ec4899,#f97316)',
  ];
  return (
    <div className="res-alloc-panel glass-card">
      <div className="res-alloc-panel-header">
        <span className="res-alloc-title">📌 Resource Assignment</span>
        <span className="res-alloc-sub">
          Solution {selectedIdx + 1}{selectedIdx === 0 ? ' · Best' : ''}
          {' — '}{entries.length} agent{entries.length !== 1 ? 's' : ''} allocated
        </span>
      </div>
      <div className="res-alloc-grid">
        {entries.map(([agent, resource], i) => (
          <div
            key={agent}
            className={`res-alloc-item${resource == null ? ' res-alloc-item--unassigned' : ''}`}
          >
            <div
              className="res-alloc-agent-badge"
              style={{ background: gradients[i % gradients.length] }}
            >
              {agent}
            </div>
            <div className="res-alloc-arrow">→</div>
            <div className="res-alloc-resource">
              {resource ?? <span className="res-alloc-null">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Individual solution card (expandable)
   ───────────────────────────────────────────────────────────────────────────── */
const SolutionCard = ({ sol, index, isSelected, onSelect }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const metrics = sol.metrics || {};
  const allocation = sol.allocation || {};
  const isBest = index === 0;

  const gradients = [
    'linear-gradient(135deg, #4f9eff, #a855f7)',
    'linear-gradient(135deg, #22d3ee, #4f9eff)',
    'linear-gradient(135deg, #a855f7, #ec4899)',
    'linear-gradient(135deg, #10b981, #22d3ee)',
    'linear-gradient(135deg, #f59e0b, #ec4899)',
  ];

  return (
    <div className={`res-sol-card glass-card${isBest ? ' res-sol-card--best' : ''}${isSelected ? ' res-sol-card--selected' : ''}`}>
      {/* Card header – always visible */}
      <div
        className="res-sol-header"
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div
          className="res-sol-avatar"
          style={{ background: gradients[index % gradients.length] }}
        >
          {isBest ? '🏆' : index + 1}
        </div>

        <div className="res-sol-title-block">
          <span className="res-sol-title">
            Solution {index + 1}
            {isBest && <span className="res-best-badge">Best</span>}
          </span>
          <span className="res-sol-subtitle">
            Avg Rank: <strong>{fmt(metrics.avg_rank_selected)}</strong>
            &nbsp;·&nbsp; α: <strong>{fmt(metrics.alpha_score)}</strong>
            &nbsp;·&nbsp; Stability: <strong>{fmt(metrics.stability)}</strong>
          </span>
        </div>

        <div className="res-sol-actions">
          <button
            className={`res-select-btn${isSelected ? ' res-select-btn--on' : ''}`}
            onClick={e => { e.stopPropagation(); onSelect(index); }}
            title="Pin for comparison"
          >
            {isSelected ? '★ Pinned' : '☆ Pin'}
          </button>
          <span className="res-chevron">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="res-sol-body">
          {/* Metric grid */}
          <div className="res-metrics-grid">
            {METRIC_DEFS.map(def => {
              const val = metrics[def.key];
              const c = colorMap[def.color];
              return (
                <div key={def.key} className="res-metric-row">
                  <span className="res-metric-icon">{def.icon}</span>
                  <span className="res-metric-label">{def.label}</span>
                  <span className="res-metric-value" style={{ color: c.text }}>
                    {def.format(val)}
                  </span>
                  <MiniBar value={val} color={def.color} inverse={!def.higherBetter} />
                </div>
              );
            })}
          </div>

          {/* Assignment pills */}
          <div className="res-assign-section">
            <div className="res-assign-label">📌 Resource Assignment</div>
            <div className="res-assign-pills">
              {Object.entries(allocation).map(([agent, resource]) => (
                <span
                  key={agent}
                  className={`res-assign-pill${resource == null ? ' res-assign-pill--null' : ''}`}
                >
                  <span className="res-pill-agent">{agent}</span>
                  <span className="res-pill-arrow">→</span>
                  <span className="res-pill-res">{resource ?? '—'}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Comparison table for pinned solutions
   ───────────────────────────────────────────────────────────────────────────── */
const CompareTable = ({ solutions, pinnedIndices }) => {
  if (pinnedIndices.length < 2) return null;
  const pinned = pinnedIndices.map(i => solutions[i]);

  return (
    <div className="glass-card res-compare-card">
      <div className="res-compare-header">
        <span className="res-section-title">🔍 Pinned Comparison</span>
        <span className="res-section-sub">{pinnedIndices.length} solutions</span>
      </div>

      <div className="res-compare-table-wrap">
        <table className="res-compare-table">
          <thead>
            <tr>
              <th>Metric</th>
              {pinnedIndices.map(i => (
                <th key={i}>Sol {i + 1}{i === 0 ? ' 🏆' : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_DEFS.map(def => {
              const vals = pinned.map(sol => sol?.metrics?.[def.key]);
              // find best value index
              const bestIdx = vals.reduce((bi, v, i) => {
                if (v == null) return bi;
                if (bi === -1) return i;
                return def.higherBetter ? (v > vals[bi] ? i : bi) : (v < vals[bi] ? i : bi);
              }, -1);
              return (
                <tr key={def.key}>
                  <td className="res-ct-metric">
                    {def.icon} {def.label}
                  </td>
                  {vals.map((v, ci) => (
                    <td
                      key={ci}
                      className={`res-ct-val${ci === bestIdx ? ' res-ct-val--best' : ''}`}
                      style={ci === bestIdx ? { color: colorMap[def.color].text } : {}}
                    >
                      {def.format(v)}
                      {ci === bestIdx && <span className="res-ct-star">★</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Pareto Front Summary table (all solutions at a glance, rows are clickable)
   ───────────────────────────────────────────────────────────────────────────── */
const ParetoTable = ({ solutions, selectedIdx, onRowClick }) => (
  <div className="glass-card res-pareto-table-card">
    <div className="res-section-header">
      <span className="res-section-title">📋 Pareto Front — All Solutions</span>
      <span className="res-section-sub">
        {solutions.length} non-dominated solution{solutions.length !== 1 ? 's' : ''}
        {' · '}<span style={{ color: 'var(--accent-blue)' }}>Click a row to inspect its allocation</span>
      </span>
    </div>
    <div className="res-compare-table-wrap">
      <table className="res-compare-table">
        <thead>
          <tr>
            <th>#</th>
            {METRIC_DEFS.map(def => <th key={def.key}>{def.icon} {def.label}</th>)}
            <th>Assignment</th>
          </tr>
        </thead>
        <tbody>
          {solutions.map((sol, i) => {
            const m = sol.metrics || {};
            const alloc = sol.allocation || {};
            const isActive = i === selectedIdx;
            return (
              <tr
                key={i}
                className={[
                  i === 0 ? 'res-best-row' : '',
                  isActive ? 'res-row--active' : '',
                  'res-row--clickable',
                ].filter(Boolean).join(' ')}
                onClick={() => onRowClick(i)}
                title={`Click to inspect Solution ${i + 1}`}
              >
                <td className="res-ct-sol">
                  {i === 0 ? '🏆' : i + 1}
                  {isActive && <span className="res-row-indicator"> ◀</span>}
                </td>
                {METRIC_DEFS.map(def => (
                  <td key={def.key} className="res-ct-val">
                    {def.format(m[def.key])}
                  </td>
                ))}
                <td className="res-ct-assign">
                  {Object.entries(alloc).map(([a, r]) => `${a}→${r ?? '—'}`).join(', ')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Main ResultsTab
   ───────────────────────────────────────────────────────────────────────────── */
const ResultsTab = ({ result }) => {
  const [pinnedIndices, setPinnedIndices] = useState([]);
  const [view, setView] = useState('cards'); // 'cards' | 'table'
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!result || !result.pareto_front || result.pareto_front.length === 0) {
    return (
      <div className="glass-card plot-card">
        <div className="plot-empty">No results yet. Run an allocation to see Pareto front results.</div>
      </div>
    );
  }

  const paretoFront = result.pareto_front;
  const selectedSol = paretoFront[Math.min(selectedIdx, paretoFront.length - 1)];

  const togglePin = (idx) => {
    setPinnedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleRowClick = (idx) => {
    setSelectedIdx(idx);
  };

  return (
    <div className="res-container">
      {/* ── Top header ─────────────────────────────────────────── */}
      <div className="glass-card res-top-card">
        <div className="res-top-row">
          <div>
            <div className="res-top-title">
              🏆 Pareto Front Results
            </div>
            <div className="res-top-sub">
              {paretoFront.length} non-dominated solution{paretoFront.length !== 1 ? 's' : ''} found on the Pareto frontier
            </div>
          </div>
          <div className="res-view-toggle">
            <button
              className={`res-toggle-btn${view === 'cards' ? ' active' : ''}`}
              onClick={() => setView('cards')}
            >
              🃏 Cards
            </button>
            <button
              className={`res-toggle-btn${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Strip ──────────────────────────────────── */}
      <div className="glass-card res-kpi-header-card">
        <div className="res-section-header">
          <span className="res-section-title">
            {selectedIdx === 0 ? '⭐ Best Solution' : `📍 Solution ${selectedIdx + 1}`} — Key Metrics
          </span>
          <span className="res-section-sub">
            {selectedIdx === 0
              ? 'Solution 1 (top-ranked on Pareto front)'
              : `Solution ${selectedIdx + 1} · Click table rows to switch`
            }
          </span>
        </div>
        <SummaryStrip selected={selectedSol} />
      </div>

      {/* ── Allocation Panel ────────────────────────────────────── */}
      <AllocationPanel sol={selectedSol} selectedIdx={selectedIdx} />

      {/* ── Pareto Table View ─────────────────────────────────── */}
      {view === 'table' && (
        <ParetoTable
          solutions={paretoFront}
          selectedIdx={selectedIdx}
          onRowClick={handleRowClick}
        />
      )}

      {/* ── Cards View ─────────────────────────────────────────── */}
      {view === 'cards' && (
        <>
          {pinnedIndices.length >= 2 && (
            <CompareTable solutions={paretoFront} pinnedIndices={pinnedIndices} />
          )}

          <div className="res-section-header res-cards-header">
            <span className="res-section-title">🔬 All Pareto Solutions</span>
            <span className="res-section-sub">
              Click ☆ Pin on any two cards to compare side-by-side
            </span>
          </div>

          <div className="res-solutions-list">
            {paretoFront.map((sol, i) => (
              <SolutionCard
                key={i}
                sol={sol}
                index={i}
                isSelected={pinnedIndices.includes(i)}
                onSelect={togglePin}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsTab;
