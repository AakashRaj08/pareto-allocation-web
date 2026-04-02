import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VisualizationTab from './components/VisualizationTab';
import GraphsTab from './components/GraphsTab';
import CalculationsTab from './components/CalculationsTab';
import './App.css';

function App() {
  const [domains, setDomains] = useState({});
  const [selectedDomain, setSelectedDomain] = useState('');
  const [domainConfig, setDomainConfig] = useState(null);
  const [nAgents, setNAgents] = useState(3);
  const [preferences, setPreferences] = useState({});
  const [result, setResult] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('visualization');
  const [agentCountVisible, setAgentCountVisible] = useState(false);
  const [agentCountAnim, setAgentCountAnim] = useState(false);

  const handleShowAgentCount = () => {
    setAgentCountAnim(false);
    setAgentCountVisible(true);
    // Trigger re-animation on each click
    setTimeout(() => setAgentCountAnim(true), 10);
    // Auto-hide after 4 seconds
    setTimeout(() => setAgentCountVisible(false), 4000);
  };

  // Fetch domains on mount
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/domains`)
      .then(res => setDomains(res.data))
      .catch(err => console.error('Error fetching domains:', err));
  }, []);

  const handleDomainChange = (e) => {
    const key = e.target.value;
    setSelectedDomain(key);
    setDomainConfig(domains[key] || null);
    setPreferences({});
    setResult(null);
    setPlotData(null);
    setError(null);
  };

  const handlePreferenceChange = (agentIdx, layerIdx, resourceIdx, value) => {
    const key = `${agentIdx}-${layerIdx}-${resourceIdx}`;
    setPreferences(prev => ({ ...prev, [key]: parseInt(value) || 1 }));
  };

  const buildRankMatrices = () => {
    if (!domainConfig) return [];
    const layers = domainConfig.layers.length;
    const resources = domainConfig.resources.length;
    const matrices = [];
    for (let l = 0; l < layers; l++) {
      const layerMatrix = [];
      for (let a = 0; a < nAgents; a++) {
        const agentRanks = [];
        for (let r = 0; r < resources; r++) {
          const key = `${a}-${l}-${r}`;
          agentRanks.push(preferences[key] || r + 1);
        }
        layerMatrix.push(agentRanks);
      }
      matrices.push(layerMatrix);
    }
    return matrices;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domainConfig) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPlotData(null);

    const layers = domainConfig.layers.length;
    const resources = domainConfig.resources.length;

    const requestData = {
      n_agents: Number(nAgents),
      n_resources: resources,
      n_layers: layers,
      rank_matrices: buildRankMatrices(),
      compatibility: Array(nAgents).fill(Array(resources).fill(true)),
      reliability: Array(nAgents).fill(domainConfig.default_reliability || 0.9),
      mask: Array(layers).fill(1),
    };

    try {
      const [allocResponse, visResponse] = await Promise.all([
        axios.post(`${process.env.REACT_APP_API_URL}/allocate`, requestData, {
          headers: { 'Content-Type': 'application/json' },
        }),
        axios.post(`${process.env.REACT_APP_API_URL}/visualize`, requestData, {
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);
      setResult(allocResponse.data);
      setPlotData(visResponse.data);
      setActiveTab('visualization');
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gradient colors for each agent card
  const agentGradients = [
    'linear-gradient(135deg, #4f9eff, #a855f7)',
    'linear-gradient(135deg, #22d3ee, #4f9eff)',
    'linear-gradient(135deg, #a855f7, #ec4899)',
    'linear-gradient(135deg, #ec4899, #f97316)',
    'linear-gradient(135deg, #10b981, #22d3ee)',
    'linear-gradient(135deg, #f59e0b, #ec4899)',
  ];

  const renderPreferenceForm = () => {
    if (!domainConfig) return null;
    const layers = domainConfig.layers;
    const resources = domainConfig.resources;

    return (
      <div className="preferences-section anim-fade-up anim-delay-200">
        <p className="section-label">Agent Preferences — rank 1 = highest priority</p>
        <div className="preferences-grid">
          {Array.from({ length: nAgents }).map((_, agentIdx) => (
            <div
              key={agentIdx}
              className="glass-card agent-card"
              style={{ animationDelay: `${agentIdx * 80}ms` }}
            >
              <div className="agent-header">
                <div
                  className="agent-avatar"
                  style={{ background: agentGradients[agentIdx % agentGradients.length] }}
                >
                  A{agentIdx + 1}
                </div>
                <div>
                  <div className="agent-name">Agent {agentIdx + 1}</div>
                  <div className="agent-desc">Set resource preferences per layer</div>
                </div>
              </div>

              {layers.map((layer, layerIdx) => (
                <div key={layerIdx} className="layer-block">
                  <div className="layer-name">
                    {layer.name}
                  </div>
                  {layer.description && (
                    <div className="layer-layer-desc">{layer.description}</div>
                  )}
                  <div className="resource-inputs">
                    {resources.map((resource, resourceIdx) => (
                      <div key={resourceIdx} className="resource-input-group">
                        <span className="resource-label" title={resource}>{resource}</span>
                        <input
                          className="resource-input"
                          type="number"
                          min="1"
                          max={resources.length}
                          value={preferences[`${agentIdx}-${layerIdx}-${resourceIdx}`] || resourceIdx + 1}
                          onChange={(e) =>
                            handlePreferenceChange(agentIdx, layerIdx, resourceIdx, e.target.value)
                          }
                          id={`pref-a${agentIdx}-l${layerIdx}-r${resourceIdx}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [
    { key: 'visualization', label: 'Visualization', icon: '📊' },
    { key: 'graphs', label: 'Graphs', icon: '📈' },
    { key: 'calculations', label: 'Calculations', icon: '🧮' },
  ];

  return (
    <div className="app-wrapper">
      {/* ── Header ─────────────────────────── */}
      <header className="app-header">
        <div className="app-header-badge anim-fade-in">
          <span className="dot" />
          Research System · Multi-Layer Allocation
        </div>
        <h1 className="app-title anim-fade-up anim-delay-100">
          <span className="gradient-text">Pareto</span> Allocation
        </h1>
        <p className="app-subtitle anim-fade-up anim-delay-200">
          Fair, multi-layer resource allocation powered by Pareto efficiency analysis
          with agent preference modelling.
        </p>
      </header>

      {/* ── Main ───────────────────────────── */}
      <main className="app-main">

        {/* Domain + Agents Control Strip */}
        <div className="control-strip anim-fade-up">
          <div className="control-group">
            <label className="section-label" htmlFor="domain-select">
              Select Domain
            </label>
            <div className="select-wrapper">
              <select
                id="domain-select"
                className="form-select"
                value={selectedDomain}
                onChange={handleDomainChange}
              >
                <option value="">— Choose a domain —</option>
                {Object.entries(domains).map(([key, domain]) => (
                  <option key={key} value={key}>{domain.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label className="section-label" htmlFor="agent-count">
              Number of Agents (Zones)
            </label>
            <div className="agent-count-row">
              <input
                id="agent-count"
                className="form-input"
                type="number"
                min="1"
                max="10"
                value={nAgents}
                onChange={(e) => {
                  setNAgents(parseInt(e.target.value) || 1);
                  setPreferences({});
                  setAgentCountVisible(false);
                }}
              />
              <button
                id="show-agent-count-btn"
                type="button"
                className="btn-agent-count"
                onClick={handleShowAgentCount}
                title="Click to see the current agent count"
              >
                👥 Get Count
              </button>
            </div>
            {agentCountVisible && (
              <div className={`agent-count-badge ${agentCountAnim ? 'agent-count-badge--visible' : ''}`}>
                <span className="agent-count-badge__icon">🤖</span>
                <span className="agent-count-badge__text">
                  <strong>{nAgents}</strong> agent{nAgents !== 1 ? 's' : ''} selected
                  {selectedDomain && domainConfig
                    ? ` · ${domainConfig.name}`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Preference Form */}
        {domainConfig && (
          <form onSubmit={handleSubmit}>
            {renderPreferenceForm()}

            <div className="submit-row anim-fade-up anim-delay-300">
              <button
                id="calculate-btn"
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Calculating…
                  </>
                ) : (
                  <>
                    ⚡ Calculate Allocation
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <div>
              <div className="error-title">Something went wrong</div>
              <div className="error-body">{JSON.stringify(error)}</div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="results-area">
            {/* Tab Navigation */}
            <nav className="tab-nav" role="tablist" aria-label="Results tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  id={`tab-${tab.key}`}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab Panels */}
            <div className="tab-panel" role="tabpanel">
              {activeTab === 'visualization' && <VisualizationTab plotData={plotData} />}
              {activeTab === 'graphs'        && <GraphsTab plotData={plotData} />}
              {activeTab === 'calculations'  && <CalculationsTab calculations={result} />}
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ─────────────────────────── */}
      <footer className="app-footer">
        Pareto Allocation System · Built for <span>Thesis Research</span> · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;