import React from 'react';

/* ────────────────────────────────────────────────────────────────────────────
   Reusable flowchart primitives (CSS-only, no external deps)
   ──────────────────────────────────────────────────────────────────────────── */

const cx = (...classes) => classes.filter(Boolean).join(' ');

/* single node */
const Node = ({ label, sub, color = 'blue', icon, wide, small }) => (
  <div className={cx('fc-node', `fc-node--${color}`, wide && 'fc-node--wide', small && 'fc-node--sm')}>
    {icon && <span className="fc-node-icon">{icon}</span>}
    <span className="fc-node-label">{label}</span>
    {sub && <span className="fc-node-sub">{sub}</span>}
  </div>
);

/* diamond decision node */
const Diamond = ({ label, color = 'yellow' }) => (
  <div className={cx('fc-diamond', `fc-diamond--${color}`)}>
    <span>{label}</span>
  </div>
);

/* downward arrow */
const Arrow = ({ label, dashed }) => (
  <div className="fc-arrow-wrap">
    <div className={cx('fc-arrow', dashed && 'fc-arrow--dashed')} />
    {label && <span className="fc-arrow-label">{label}</span>}
  </div>
);

/* horizontal split (side-by-side branches) */
const Row = ({ children, gap = 16 }) => (
  <div className="fc-row" style={{ gap }}>{children}</div>
);

/* vertical column */
const Col = ({ children, align = 'center' }) => (
  <div className="fc-col" style={{ alignItems: align }}>{children}</div>
);

/* section card */
const FlowSection = ({ title, dot, sub, children }) => (
  <div className="glass-card flow-section">
    <div className="flow-section-header">
      <span className={cx('plot-title-dot', dot)} />
      <span className="flow-section-title">{title}</span>
      {sub && <span className="flow-section-sub">{sub}</span>}
    </div>
    <div className="flow-section-body">{children}</div>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
   1. Overall Thesis Flowchart
   ──────────────────────────────────────────────────────────────────────────── */
const ThesisFlowchart = () => (
  <FlowSection title="Overall Thesis Flowchart" dot="dot-blue" sub="End-to-end pipeline of the Pareto multi-layer allocation system">
    <Col>
      <Node icon="📋" label="Problem Definition" sub="Multi-layer resource allocation with agent preferences" color="blue" wide />
      <Arrow />
      <Node icon="🗂️" label="Multi-Layer Rank Matrix Construction" sub="L layers × N agents × M resources → rank & score matrices" color="violet" wide />
      <Arrow />
      <Node icon="⚙️" label="Layer Mask Selection" sub="Binary mask selects active criteria layers" color="cyan" wide />
      <Arrow />
      <Node icon="🧬" label="Candidate Generation" sub="Multiple algorithms produce diverse allocation candidates" color="green" wide />
      <Arrow />
      <Row>
        <Node label="Serial Dictatorship" sub="Random priority ordering" color="blue" small />
        <Node label="Greedy Aggregated" sub="Score-weighted matching" color="violet" small />
        <Node label="Rank-Maximal" sub="Min aggregated rank" color="cyan" small />
        <Node label="Random Feasible" sub="Baseline comparison" color="pink" small />
      </Row>
      <Arrow />
      <Node icon="📊" label="Multi-Objective Evaluation" sub="Avg rank, α-score, stability, fairness, sensitivity, utilization" color="orange" wide />
      <Arrow />
      <Diamond label="Pareto Dominance Test" />
      <Arrow label="Non-dominated solutions" />
      <Node icon="🏆" label="Pareto Frontier" sub="Set of optimal trade-off solutions" color="green" wide />
      <Arrow />
      <Row>
        <Node label="Visualization" sub="13 interactive charts" color="blue" small />
        <Node label="Calculations" sub="JSON metrics export" color="violet" small />
        <Node label="Decision Support" sub="Stakeholder analysis" color="cyan" small />
      </Row>
    </Col>
  </FlowSection>
);

/* ────────────────────────────────────────────────────────────────────────────
   2. Algorithm Flowchart
   ──────────────────────────────────────────────────────────────────────────── */
const AlgorithmFlowchart = () => (
  <FlowSection title="Algorithm Flowcharts" dot="dot-violet" sub="Step-by-step logic for each allocation algorithm">
    <div className="fc-algo-grid">

      {/* Serial Dictatorship */}
      <div className="fc-algo-card">
        <div className="fc-algo-title" style={{ color: 'var(--accent-blue)' }}>Serial Dictatorship</div>
        <Col>
          <Node label="Random agent order π" color="blue" small />
          <Arrow />
          <Node label="For each agent a in π" color="blue" small />
          <Arrow />
          <Node label="Compute score(a,r) = mean over masked layers" color="blue" small />
          <Arrow />
          <Diamond label="Any feasible r available?" color="blue" />
          <Arrow label="Yes" />
          <Node label="Assign best feasible r to a" color="green" small />
          <Arrow label="Next agent" dashed />
        </Col>
      </div>

      {/* Greedy Aggregated */}
      <div className="fc-algo-card">
        <div className="fc-algo-title" style={{ color: 'var(--accent-violet)' }}>Greedy Aggregated</div>
        <Col>
          <Node label="Weighted score matrix S" color="violet" small />
          <Arrow />
          <Node label="Build all (score, agent, resource) tuples" color="violet" small />
          <Arrow />
          <Node label="Sort tuples by score DESC" color="violet" small />
          <Arrow />
          <Diamond label="Agent unassigned & resource free?" color="violet" />
          <Arrow label="Yes" />
          <Node label="Assign resource to agent" color="green" small />
          <Arrow label="Next tuple" dashed />
        </Col>
      </div>

      {/* Rank-Maximal Matching */}
      <div className="fc-algo-card">
        <div className="fc-algo-title" style={{ color: 'var(--accent-cyan)' }}>Rank-Maximal Matching</div>
        <Col>
          <Node label="Aggregate ranks across masked layers" color="cyan" small />
          <Arrow />
          <Node label="Set infeasible pairs to ∞" color="cyan" small />
          <Arrow />
          <Node label="Build all (agg_rank, a, r) tuples" color="cyan" small />
          <Arrow />
          <Node label="Sort tuples by rank ASC" color="cyan" small />
          <Arrow />
          <Diamond label="Agent free & resource free?" color="cyan" />
          <Arrow label="Yes" />
          <Node label="Assign, mark used" color="green" small />
        </Col>
      </div>

      {/* Random Feasible */}
      <div className="fc-algo-card">
        <div className="fc-algo-title" style={{ color: 'var(--accent-pink)' }}>Random Feasible</div>
        <Col>
          <Node label="Shuffle agent order" color="pink" small />
          <Arrow />
          <Node label="For each agent a" color="pink" small />
          <Arrow />
          <Node label="Find compatible & unused resources" color="pink" small />
          <Arrow />
          <Diamond label="Feasible set non-empty?" color="pink" />
          <Arrow label="Yes" />
          <Node label="Random pick from feasible" color="green" small />
          <Arrow label="Next agent" dashed />
        </Col>
      </div>

    </div>

    {/* Evaluation + Pareto pipeline */}
    <div style={{ marginTop: 32 }}>
      <Col>
        <Node icon="📥" label="All Candidate Allocations Collected" sub="Serial Dict. × 3 + Greedy + Rank-Max + Random × 5" color="orange" wide />
        <Arrow />
        <Node icon="📐" label="Evaluate Each Allocation" sub="avg_rank, α-score, stability, fairness, sensitivity, utilization, efficiency" color="orange" wide />
        <Arrow />
        <Diamond label="Is allocation feasible & valid?" />
        <Row>
          <Col>
            <Arrow label="Yes" />
            <Node label="Add to evaluated pool" color="green" small />
          </Col>
          <Col>
            <Arrow label="No" />
            <Node label="Discard" color="red" small />
          </Col>
        </Row>
        <Arrow />
        <Node icon="⚖️" label="Pareto Dominance Filter" sub="Keep only non-dominated solutions (minimize avg_rank, maximize α-score & stability)" color="violet" wide />
        <Arrow />
        <Node icon="🏆" label="Final Pareto Front" color="green" wide />
      </Col>
    </div>
  </FlowSection>
);

/* ────────────────────────────────────────────────────────────────────────────
   3. Dynamic Example Flowchart (uses actual allocation data)
   ──────────────────────────────────────────────────────────────────────────── */
const ExampleFlowchart = ({ result, nAgents, domainConfig }) => {
  if (!result || !result.pareto_front || result.pareto_front.length === 0) {
    return (
      <FlowSection title="Specific Example Flowchart" dot="dot-green" sub="Run an allocation to see a numerical walkthrough">
        <div className="plot-empty">No allocation data yet. Configure and run an allocation first.</div>
      </FlowSection>
    );
  }

  const paretoFront = result.pareto_front;
  const n = nAgents || 0;
  const layers = domainConfig?.layers || [];
  const resources = domainConfig?.resources || [];
  const nLayers = layers.length;
  const nResources = resources.length;

  // Pick the best solution (first in pareto front)
  const best = paretoFront[0];
  const alloc = best.allocation || {};
  const met = best.metrics || {};

  // Build assignment pairs
  const assignments = Object.entries(alloc)
    .filter(([, v]) => v !== null)
    .map(([agent, res]) => `${agent} → ${res}`);

  return (
    <FlowSection
      title="Specific Example Flowchart"
      dot="dot-green"
      sub={`Numerical walkthrough for ${n} agents × ${nResources} resources × ${nLayers} layers`}
    >
      <Col>
        {/* Input */}
        <Node
          icon="📥"
          label="Input Configuration"
          sub={`Domain: ${domainConfig?.name || '—'}`}
          color="blue"
          wide
        />
        <Arrow />

        {/* Dimensions */}
        <Row>
          <Node label={`${n} Agents`} sub={`A0 … A${n - 1}`} color="blue" small />
          <Node label={`${nResources} Resources`} sub={resources.slice(0, 3).join(', ') + (nResources > 3 ? ' …' : '')} color="violet" small />
          <Node label={`${nLayers} Layers`} sub={layers.map(l => l.name).slice(0, 3).join(', ') + (nLayers > 3 ? ' …' : '')} color="cyan" small />
        </Row>
        <Arrow />

        {/* Rank matrix */}
        <Node
          icon="🗂️"
          label="Rank Matrices Constructed"
          sub={`Shape: ${nLayers} × ${n} × ${nResources} — each agent ranks all resources per layer`}
          color="violet"
          wide
        />
        <Arrow />

        {/* Mask */}
        <Node
          icon="🎚️"
          label="Layer Mask Applied"
          sub={`All ${nLayers} layers active: [${Array(nLayers).fill(1).join(', ')}]`}
          color="cyan"
          wide
        />
        <Arrow />

        {/* Candidates */}
        <Node
          icon="🧬"
          label="Candidate Allocations Generated"
          sub="Serial Dict. × 3 + Greedy Agg. + Rank-Maximal + Random × 5 = 10 candidates"
          color="orange"
          wide
        />
        <Arrow />

        {/* Evaluation */}
        <Node
          icon="📊"
          label="Multi-Objective Evaluation"
          sub={`Each candidate scored on ${Object.keys(met).length} metrics`}
          color="orange"
          wide
        />
        <Arrow />

        {/* Pareto filter */}
        <Diamond label="Pareto Dominance" />
        <Arrow label={`${paretoFront.length} non-dominated solution${paretoFront.length !== 1 ? 's' : ''} survive`} />

        {/* Solutions */}
        <Row>
          {paretoFront.slice(0, 4).map((sol, i) => (
            <Node
              key={i}
              label={`Sol ${i + 1}`}
              sub={`α=${sol.metrics?.alpha_score ?? '?'}  stab=${(sol.metrics?.stability ?? 0).toFixed(2)}`}
              color={i === 0 ? 'green' : 'teal'}
              small
            />
          ))}
        </Row>
        <Arrow />

        {/* Best solution detail */}
        <Node icon="🏆" label="Best Pareto Solution (Sol 1)" color="green" wide />
        <Arrow />

        {/* Metrics */}
        <div className="fc-metrics-grid">
          {[
            ['Avg Rank', met.avg_rank_selected],
            ['α-Score', met.alpha_score],
            ['Stability', met.stability],
            ['Utilization', met.utilization],
            ['Sensitivity', met.sensitivity],
            ['Efficiency', met.efficiency],
            ['Fairness (Gini)', met.fairness_gini],
            ['Max Regret', met.fairness_max_regret],
          ].map(([name, val]) => (
            <div className="fc-metric" key={name}>
              <span className="fc-metric-val">{val != null ? (typeof val === 'number' ? val.toFixed(3) : val) : '—'}</span>
              <span className="fc-metric-name">{name}</span>
            </div>
          ))}
        </div>

        <Arrow />

        {/* Assignment map */}
        <Node icon="🗺️" label="Final Assignment Map" color="green" wide />
        <div className="fc-assign-grid">
          {assignments.map((pair, i) => (
            <div className="fc-assign-pill" key={i}>
              {pair}
            </div>
          ))}
        </div>
      </Col>
    </FlowSection>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────────────────────── */
const GraphsTab = ({ plotData, result, nAgents, domainConfig }) => {
  return (
    <div className="viz-flow-container">
      <ThesisFlowchart />
      <AlgorithmFlowchart />
      <ExampleFlowchart result={result} nAgents={nAgents} domainConfig={domainConfig} />
    </div>
  );
};

export default GraphsTab;