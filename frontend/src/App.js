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

  // Fetch domains on mount
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/domains`)
      .then(res => setDomains(res.data))
      .catch(err => console.error('Error fetching domains:', err));
  }, []);

  const handleDomainChange = (e) => {
    const key = e.target.value;
    setSelectedDomain(key);
    setDomainConfig(domains[key]);
    setPreferences({});
    setResult(null);
    setPlotData(null);
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

    console.log('Sending allocation request:', requestData);

    try {
      // First call /allocate
      const allocResponse = await axios.post(`${process.env.REACT_APP_API_URL}/allocate`, requestData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setResult(allocResponse.data);

      // Then call /visualize with same request data
      const visResponse = await axios.post(`${process.env.REACT_APP_API_URL}/visualize`, requestData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setPlotData(visResponse.data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPreferenceForm = () => {
    if (!domainConfig) return null;
    const layers = domainConfig.layers;
    const resources = domainConfig.resources;

    return (
      <div style={{ marginTop: '20px' }}>
        <h3>Enter Preferences (rank 1 = best)</h3>
        {Array.from({ length: nAgents }).map((_, agentIdx) => (
          <div key={agentIdx} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
            <h4>Agent {agentIdx + 1}</h4>
            {layers.map((layer, layerIdx) => (
              <div key={layerIdx} style={{ marginLeft: '20px' }}>
                <strong>{layer.name}</strong> – {layer.description}
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {resources.map((resource, resourceIdx) => (
                    <label key={resourceIdx} style={{ marginRight: '15px' }}>
                      {resource}:
                      <input
                        type="number"
                        min="1"
                        max={resources.length}
                        value={preferences[`${agentIdx}-${layerIdx}-${resourceIdx}`] || resourceIdx + 1}
                        onChange={(e) => handlePreferenceChange(agentIdx, layerIdx, resourceIdx, e.target.value)}
                        style={{ width: '50px', marginLeft: '5px' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Pareto Allocation System</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Select Domain:
          <select value={selectedDomain} onChange={handleDomainChange} style={{ marginLeft: '10px' }}>
            <option value="">-- Choose a domain --</option>
            {Object.entries(domains).map(([key, domain]) => (
              <option key={key} value={key}>{domain.name}</option>
            ))}
          </select>
        </label>
      </div>

      {domainConfig && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Number of Agents (zones):
              <input
                type="number"
                min="1"
                max="10"
                value={nAgents}
                onChange={(e) => setNAgents(parseInt(e.target.value) || 1)}
                style={{ marginLeft: '10px' }}
              />
            </label>
          </div>

          {renderPreferenceForm()}

          <button type="submit" disabled={loading} style={{ padding: '10px 20px', marginTop: '20px' }}>
            {loading ? 'Calculating...' : 'Calculate Allocation'}
          </button>
        </form>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '20px' }}>
          <strong>Error:</strong> {JSON.stringify(error)}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #ccc' }}>
            <button onClick={() => setActiveTab('visualization')} style={{ padding: '10px', background: activeTab === 'visualization' ? '#ddd' : 'none' }}>
              Visualization
            </button>
            <button onClick={() => setActiveTab('graphs')} style={{ padding: '10px', background: activeTab === 'graphs' ? '#ddd' : 'none' }}>
              Graphs
            </button>
            <button onClick={() => setActiveTab('calculations')} style={{ padding: '10px', background: activeTab === 'calculations' ? '#ddd' : 'none' }}>
              Calculations
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {activeTab === 'visualization' && <VisualizationTab plotData={plotData} />}
            {activeTab === 'graphs' && <GraphsTab plotData={plotData} />}
            {activeTab === 'calculations' && <CalculationsTab calculations={result} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;