import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   Step renderers – one for each step type returned by the backend
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Mini table ─────────────────────────────────────────────────── */
const MiniTable = ({ headers, rows, highlight }) => (
  <div className="st-table-wrap">
    <table className="st-table">
      <thead>
        <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={highlight && highlight(row, ri) ? 'st-row-hl' : ''}>
            {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ─── Key-value pairs ────────────────────────────────────────────── */
const KV = ({ label, value, mono }) => (
  <div className="st-kv">
    <span className="st-kv-label">{label}</span>
    <span className={`st-kv-value${mono ? ' mono' : ''}`}>{typeof value === 'boolean' ? (value ? '✔ Yes' : '✘ No') : String(value)}</span>
  </div>
);

/* ─── Assignment pill row ────────────────────────────────────────── */
const AssignPills = ({ map }) => (
  <div className="st-pills">
    {Object.entries(map).map(([k, v]) => (
      <span key={k} className={`st-pill${v === '—' ? ' st-pill--empty' : ''}`}>
        {k} → {v}
      </span>
    ))}
  </div>
);

/* ─── Matrix renderer (compact) ──────────────────────────────────── */
const Matrix = ({ data, rowLabel = 'A', colLabel = 'R' }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="st-table-wrap">
      <table className="st-table st-table--compact">
        <thead>
          <tr>
            <th></th>
            {data[0].map((_, ci) => <th key={ci}>{colLabel}{ci}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}>
              <td className="st-row-header">{rowLabel}{ri}</td>
              {row.map((val, ci) => <td key={ci}>{val}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   Render a single step card (dispatch by step.type)
   ═══════════════════════════════════════════════════════════════════ */
const StepCard = ({ step, index }) => {
  const [expanded, setExpanded] = useState(index < 3); // first 3 open by default

  const badgeColor = {
    setup: 'var(--accent-blue)',
    algorithm: 'var(--accent-violet)',
    evaluation: 'var(--accent-orange)',
    pareto: 'var(--accent-green)',
    result: 'var(--accent-cyan)',
  }[step.type] || 'var(--accent-blue)';

  const badgeLabel = {
    setup: 'SETUP',
    algorithm: 'ALGORITHM',
    evaluation: 'EVAL',
    pareto: 'PARETO',
    result: 'RESULT',
  }[step.type] || step.type?.toUpperCase();

  return (
    <div className="st-card glass-card">
      <button className="st-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="st-step-num">Step {index + 1}</span>
        <span className="st-badge" style={{ background: badgeColor }}>{badgeLabel}</span>
        <span className="st-card-title">{step.title}</span>
        <span className="st-chevron">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="st-card-body">
          {step.type === 'setup' && <SetupBody d={step.details} />}
          {step.type === 'algorithm' && <AlgorithmBody d={step.details} />}
          {step.type === 'evaluation' && <EvaluationBody d={step.details} />}
          {step.type === 'pareto' && <ParetoBody d={step.details} />}
          {step.type === 'result' && <ResultBody d={step.details} />}
        </div>
      )}
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════
   Body renderers per type
   ═══════════════════════════════════════════════════════════════════ */

/* ── SETUP ─────────────────────────────────────────────────────── */
const SetupBody = ({ d }) => (
  <div className="st-body-inner">
    <div className="st-grid-2">
      <KV label="Agents" value={d.n_agents} />
      <KV label="Resources" value={d.n_resources} />
      <KV label="Layers" value={d.n_layers} />
      <KV label="Active Layers" value={d.active_layers?.join(', ')} />
    </div>
    <KV label="Mask" value={`[${d.mask?.join(', ')}]`} mono />
    <KV label="Reliability" value={`[${d.reliability?.join(', ')}]`} mono />

    <div className="st-subsection">
      <div className="st-sub-label">Score Formula</div>
      <code className="st-formula">{d.score_formula}</code>
    </div>

    {d.rank_matrices?.map((rm, li) => (
      <div key={li} className="st-subsection">
        <div className="st-sub-label">Rank Matrix — {rm.layer}</div>
        <Matrix data={rm.ranks} />
      </div>
    ))}

    {d.score_matrices?.map((sm, li) => (
      <div key={li} className="st-subsection">
        <div className="st-sub-label">Score Matrix — {sm.layer}</div>
        <Matrix data={sm.scores} />
      </div>
    ))}

    <div className="st-subsection">
      <div className="st-sub-label">Compatibility Matrix</div>
      <Matrix data={d.compatibility} />
    </div>
  </div>
);

/* ── ALGORITHM ─────────────────────────────────────────────────── */
const AlgorithmBody = ({ d }) => (
  <div className="st-body-inner">
    <p className="st-desc">{d.description}</p>
    {d.formula && (
      <div className="st-subsection">
        <div className="st-sub-label">Formula</div>
        <code className="st-formula">{d.formula}</code>
      </div>
    )}

    {d.agent_order && (
      <KV label="Agent Order" value={d.agent_order.join(' → ')} mono />
    )}
    {d.weights && (
      <KV label="Weights" value={Array.isArray(d.weights) ? `[${d.weights.join(', ')}]` : d.weights} mono />
    )}

    {d.aggregated_scores && (
      <div className="st-subsection">
        <div className="st-sub-label">Aggregated Score Matrix</div>
        <Matrix data={d.aggregated_scores} />
      </div>
    )}
    {d.aggregated_ranks && (
      <div className="st-subsection">
        <div className="st-sub-label">Aggregated Rank Matrix</div>
        <Matrix data={d.aggregated_ranks} />
      </div>
    )}

    {d.iterations && d.iterations.length > 0 && (
      <div className="st-subsection">
        <div className="st-sub-label">Iterations ({d.iterations.length} steps)</div>
        <div className="st-iter-list">
          {d.iterations.map((it, i) => (
            <div key={i} className={`st-iter ${it.accepted === true ? 'st-iter--accept' : it.accepted === false ? 'st-iter--skip' : 'st-iter--info'}`}>
              <span className="st-iter-step">{it.step}</span>
              <span className="st-iter-action">{it.action}</span>
              {it.tuple && <span className="st-iter-detail mono">{it.tuple}</span>}
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="st-subsection">
      <div className="st-sub-label">Final Assignment</div>
      {d.final_assignment && <AssignPills map={d.final_assignment} />}
    </div>
  </div>
);

/* ── EVALUATION ────────────────────────────────────────────────── */
const EvaluationBody = ({ d }) => (
  <div className="st-body-inner">
    {d.allocation && (
      <div className="st-subsection">
        <div className="st-sub-label">Allocation</div>
        <AssignPills map={d.allocation} />
      </div>
    )}

    {d.steps?.map((s, i) => (
      <div key={i} className="st-eval-step">
        <div className="st-eval-metric">{s.metric}</div>

        {s.formula && !s.formulas && (
          <code className="st-formula">{s.formula}</code>
        )}
        {s.formulas && (
          <div className="st-formulas">
            {Object.entries(s.formulas).map(([k, v]) => (
              <div key={k}><strong>{k}:</strong> <code>{v}</code></div>
            ))}
          </div>
        )}
        {s.calculation && (
          <div className="st-calc"><span>Calc:</span> <code>{s.calculation}</code></div>
        )}
        {s.values && (
          <div className="st-grid-2">
            {Object.entries(s.values).map(([k, v]) => (
              <KV key={k} label={k} value={v} mono />
            ))}
          </div>
        )}
        {s.results && typeof s.results === 'object' && !Array.isArray(s.results) && (
          <div className="st-grid-2">
            {Object.entries(s.results).map(([k, v]) => (
              <KV key={k} label={k} value={v} mono />
            ))}
          </div>
        )}
        {s.per_layer && (
          <div className="st-grid-2">
            {s.per_layer.map((pl, j) => (
              <KV key={j} label={pl.layer} value={pl.pareto_optimal ? '✔ Pareto-Optimal' : '✘ Not Optimal'} />
            ))}
          </div>
        )}
        {s.result !== undefined && !s.values && !s.results && !s.per_layer && (
          <div className="st-result-badge">
            Result: <strong>{typeof s.result === 'boolean' ? (s.result ? '✔ Yes' : '✘ No') : s.result}</strong>
          </div>
        )}
      </div>
    ))}
  </div>
);

/* ── PARETO ─────────────────────────────────────────────────────── */
const ParetoBody = ({ d }) => (
  <div className="st-body-inner">
    <div className="st-subsection">
      <div className="st-sub-label">Objectives</div>
      <div className="st-grid-2">
        {d.objectives?.map((obj, i) => (
          <KV key={i} label={obj.name} value={obj.direction} />
        ))}
      </div>
    </div>

    <div className="st-grid-2">
      <KV label="Total Candidates" value={d.total_candidates} />
      <KV label="Dominated" value={d.dominated_count} />
      <KV label="Survivors" value={d.survivor_count} />
      <KV label="Survivor IDs" value={d.survivors?.join(', ')} mono />
    </div>

    {d.comparisons?.length > 0 && (
      <div className="st-subsection">
        <div className="st-sub-label">Dominance Comparisons</div>
        <MiniTable
          headers={['Dominated', 'By', ...d.objectives.map(o => o.name + ' (dom)'), ...d.objectives.map(o => o.name + ' (by)')]}
          rows={d.comparisons.map(c => [
            c.dominated,
            c.by,
            ...d.objectives.map(o => c.values_dominated[o.name]),
            ...d.objectives.map(o => c.values_dominator[o.name]),
          ])}
          highlight={(row) => true}
        />
      </div>
    )}
  </div>
);

/* ── RESULT ──────────────────────────────────────────────────────── */
const ResultBody = ({ d }) => (
  <div className="st-body-inner">
    <KV label="Solutions on Pareto Front" value={d.n_solutions} />
    {d.solutions?.map((sol, i) => (
      <div key={i} className="st-result-sol">
        <div className="st-sol-title">{sol.solution}</div>
        <div className="st-grid-2">
          {Object.entries(sol.key_metrics || {}).map(([k, v]) => (
            <KV key={k} label={k} value={v} mono />
          ))}
        </div>
        <AssignPills map={sol.assignment} />
      </div>
    ))}
  </div>
);


/* ═══════════════════════════════════════════════════════════════════
   Main CalculationsTab Component
   ═══════════════════════════════════════════════════════════════════ */
const CalculationsTab = ({ calculations }) => {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!calculations) {
    return (
      <div className="glass-card plot-card">
        <div className="plot-empty">No calculation details available.</div>
      </div>
    );
  }

  const steps = calculations.steps || [];
  const jsonString = JSON.stringify(calculations, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Count by type
  const counts = {};
  steps.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });

  return (
    <div className="st-container">
      {/* Header */}
      <div className="glass-card st-header-card">
        <div className="st-header-row">
          <div>
            <div className="st-header-title">Step-by-Step Calculation Trace</div>
            <div className="st-header-sub">
              {steps.length} steps — {counts.algorithm || 0} algorithms, {counts.evaluation || 0} evaluations, {counts.pareto || 0} Pareto filter
            </div>
          </div>
          <div className="st-header-actions">
            <button className="st-btn" onClick={() => setShowJson(!showJson)}>
              {showJson ? '📊 Steps View' : '{ } JSON View'}
            </button>
            <button className="st-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '⎘ Copy JSON'}
            </button>
          </div>
        </div>
      </div>

      {showJson ? (
        <div className="glass-card plot-card">
          <pre className="json-viewer">{jsonString}</pre>
        </div>
      ) : (
        <div className="st-steps-list">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CalculationsTab;