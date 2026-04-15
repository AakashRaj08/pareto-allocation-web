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
  const [nAgents, setNAgents] = useState('');
  const [preferences, setPreferences] = useState({});
  const [reliabilities, setReliabilities] = useState([]);
  const [layerMask, setLayerMask] = useState([]);
  const [result, setResult] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('visualization');
  const [showPreferences, setShowPreferences] = useState(false);
  const [getCountError, setGetCountError] = useState('');

  const parsedAgents = parseInt(nAgents) || 0;

  const handleShowAgentCount = () => {
    if (!selectedDomain || !domainConfig) {
      setGetCountError('Please select a domain first.');
      return;
    }
    if (!nAgents || parsedAgents < 1) {
      setGetCountError('Please enter a valid number of agents (≥ 1).');
      return;
    }
    setGetCountError('');

    // Generate random permutation of ranks for each agent × layer
    const layers = domainConfig.layers.length;
    const resources = domainConfig.resources.length;
    const n = parseInt(nAgents);
    const randomPrefs = {};
    for (let a = 0; a < n; a++) {
      for (let l = 0; l < layers; l++) {
        // Fisher-Yates shuffle of [1, 2, ..., resources]
        const ranks = Array.from({ length: resources }, (_, i) => i + 1);
        for (let i = ranks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
        }
        for (let r = 0; r < resources; r++) {
          randomPrefs[`${a}-${l}-${r}`] = ranks[r];
        }
      }
    }
    setPreferences(randomPrefs);

    // Initialise reliabilities: default from domainConfig, one per agent
    const defaultRel = domainConfig.default_reliability ?? 0.9;
    setReliabilities(Array.from({ length: n }, () => defaultRel));

    // Initialise layer mask: all layers enabled
    setLayerMask(Array(layers).fill(1));

    setResult(null);
    setPlotData(null);
    setShowPreferences(true);
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
    setReliabilities([]);
    setLayerMask([]);
    setResult(null);
    setPlotData(null);
    setError(null);
    setShowPreferences(false);
    setGetCountError('');
  };

  const handlePreferenceChange = (agentIdx, layerIdx, resourceIdx, value) => {
    if (value === '') {
      setPreferences(prev => ({ ...prev, [`${agentIdx}-${layerIdx}-${resourceIdx}`]: '' }));
      return;
    }

    const newVal = parseInt(value, 10);
    if (isNaN(newVal)) return;

    setPreferences(prev => {
      const newPrefs = { ...prev };
      const resourcesCount = domainConfig?.resources?.length || 1;
      
      let clampedVal = newVal;
      if (clampedVal < 1) clampedVal = 1;
      if (clampedVal > resourcesCount) clampedVal = resourcesCount;

      const currentRanks = [];
      for (let r = 0; r < resourcesCount; r++) {
        const val = prev[`${agentIdx}-${layerIdx}-${r}`];
        currentRanks[r] = (val !== undefined) ? val : (r + 1);
      }
      
      const oldVal = prev[`${agentIdx}-${layerIdx}-${resourceIdx}`];

      let conflictIdx = -1;
      for (let r = 0; r < resourcesCount; r++) {
        if (r !== resourceIdx && currentRanks[r] === clampedVal) {
          conflictIdx = r;
          break;
        }
      }

      if (conflictIdx !== -1) {
        if (oldVal !== '' && oldVal !== undefined) {
          newPrefs[`${agentIdx}-${layerIdx}-${conflictIdx}`] = oldVal;
        } else {
          const usedRanks = new Set();
          for (let r = 0; r < resourcesCount; r++) {
            if (r !== resourceIdx && r !== conflictIdx && currentRanks[r] !== '' && currentRanks[r] !== undefined) {
              usedRanks.add(currentRanks[r]);
            }
          }
          usedRanks.add(clampedVal);
          
          let missingRank = 1;
          for (let i = 1; i <= resourcesCount; i++) {
            if (!usedRanks.has(i)) {
              missingRank = i;
              break;
            }
          }
          newPrefs[`${agentIdx}-${layerIdx}-${conflictIdx}`] = missingRank;
        }
      }

      newPrefs[`${agentIdx}-${layerIdx}-${resourceIdx}`] = clampedVal;
      return newPrefs;
    });
  };

  const buildRankMatrices = () => {
    if (!domainConfig) return [];
    const layers = domainConfig.layers.length;
    const resources = domainConfig.resources.length;
    const matrices = [];
    for (let l = 0; l < layers; l++) {
      const layerMatrix = [];
      for (let a = 0; a < parsedAgents; a++) {
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
    if (!domainConfig || parsedAgents < 1) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPlotData(null);

    const layers = domainConfig.layers.length;
    const resources = domainConfig.resources.length;

    // Build reliability array, falling back to default if a value is missing/invalid
    const defaultRel = domainConfig.default_reliability ?? 0.9;
    const reliabilityPayload = Array.from({ length: parsedAgents }, (_, i) => {
      const v = parseFloat(reliabilities[i]);
      return isNaN(v) ? defaultRel : Math.min(1, Math.max(0, v));
    });

    const requestData = {
      n_agents: parsedAgents,
      n_resources: resources,
      n_layers: layers,
      rank_matrices: buildRankMatrices(),
      compatibility: Array(parsedAgents).fill(Array(resources).fill(true)),
      reliability: reliabilityPayload,
      mask: layerMask.length === layers ? layerMask : Array(layers).fill(1),
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

  const handleReliabilityChange = (agentIdx, value) => {
    setReliabilities(prev => {
      const next = [...prev];
      next[agentIdx] = value;
      return next;
    });
  };

  const handleLayerMaskToggle = (layerIdx) => {
    setLayerMask(prev => {
      const next = [...prev];
      next[layerIdx] = next[layerIdx] === 1 ? 0 : 1;
      return next;
    });
  };

  const renderPreferenceForm = () => {
    if (!domainConfig || !showPreferences || parsedAgents < 1) return null;
    const layers = domainConfig.layers;
    const resources = domainConfig.resources;

    return (
      <div className="preferences-section anim-fade-up anim-delay-200">

        {/* ── Layer Mask Panel ─────────────────────── */}
        <div className="layer-mask-panel glass-card">
          <p className="section-label" style={{ marginBottom: 'var(--space-sm)' }}>
            🗂️ Active Layers — select which layers to include in allocation
          </p>
          <div className="layer-mask-grid">
            {layers.map((layer, layerIdx) => {
              const checked = layerMask[layerIdx] === 1;
              return (
                <label
                  key={layerIdx}
                  className={`layer-mask-item${checked ? ' layer-mask-item--on' : ''}`}
                  htmlFor={`mask-layer-${layerIdx}`}
                >
                  <input
                    type="checkbox"
                    id={`mask-layer-${layerIdx}`}
                    checked={checked}
                    onChange={() => handleLayerMaskToggle(layerIdx)}
                    className="layer-mask-checkbox"
                  />
                  <span className="layer-mask-name">{layer.name}</span>
                  {layer.description && (
                    <span className="layer-mask-desc">{layer.description}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Agent Preferences ────────────────────── */}
        <p className="section-label" style={{ marginTop: 'var(--space-lg)' }}>
          Agent Preferences &amp; Reliability — rank&nbsp;1&nbsp;=&nbsp;highest priority
        </p>
        <div className="preferences-grid">
          {Array.from({ length: parsedAgents }).map((_, agentIdx) => (
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
                <div style={{ flex: 1 }}>
                  <div className="agent-name">Agent {agentIdx + 1}</div>
                  <div className="agent-desc">Set resource preferences per layer</div>
                </div>
              </div>

              {/* Reliability row */}
              <div className="reliability-row">
                <label
                  className="reliability-label"
                  htmlFor={`rel-a${agentIdx}`}
                >
                  🔧 Reliability
                </label>
                <input
                  id={`rel-a${agentIdx}`}
                  className="reliability-input"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={reliabilities[agentIdx] !== undefined ? reliabilities[agentIdx] : 0.9}
                  onChange={(e) => handleReliabilityChange(agentIdx, e.target.value)}
                  title="Probability that this agent performs correctly (0–1)"
                />
                <span className="reliability-hint">0 – 1</span>
              </div>

              {layers.map((layer, layerIdx) => (
                <div key={layerIdx} className={`layer-block${layerMask[layerIdx] === 0 ? ' layer-block--disabled' : ''}`}>
                  <div className="layer-name">
                    {layer.name}
                    {layerMask[layerIdx] === 0 && (
                      <span className="layer-disabled-badge">excluded</span>
                    )}
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
                          value={preferences[`${agentIdx}-${layerIdx}-${resourceIdx}`] !== undefined ? preferences[`${agentIdx}-${layerIdx}-${resourceIdx}`] : resourceIdx + 1}
                          onChange={(e) =>
                            handlePreferenceChange(agentIdx, layerIdx, resourceIdx, e.target.value)
                          }
                          id={`pref-a${agentIdx}-l${layerIdx}-r${resourceIdx}`}
                          disabled={layerMask[layerIdx] === 0}
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
    { key: 'visualization', label: 'Graphs', icon: '📊' },
    { key: 'graphs', label: 'Visualization', icon: '📈' },
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
                max="20"
                placeholder="e.g. 4"
                value={nAgents}
                onChange={(e) => {
                  setNAgents(e.target.value);
                  setPreferences({});
                  setReliabilities([]);
                  setLayerMask([]);
                  setShowPreferences(false);
                  setGetCountError('');
                }}
              />
              <button
                id="show-agent-count-btn"
                type="button"
                className="btn-agent-count"
                onClick={handleShowAgentCount}
                title="Generate agent preference cards"
              >
                👥 Get Count
              </button>
            </div>
            {getCountError && (
              <div className="get-count-error">
                <span>⚠️</span> {getCountError}
              </div>
            )}
          </div>
        </div>

        {/* Preference Form — only shown after Get Count is clicked */}
        {showPreferences && domainConfig && parsedAgents >= 1 && (
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
              {activeTab === 'graphs'        && <GraphsTab plotData={plotData} result={result} nAgents={parsedAgents} domainConfig={domainConfig} />}
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