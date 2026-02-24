import React from 'react';
import Plot from 'react-plotly.js';

const VisualizationTab = ({ plotData }) => {
  if (!plotData) return <div>No visualization data available.</div>;

  return (
    <div className="visualization-tab">
      <h3>2D Pareto Front</h3>
      {plotData.pareto_2d.data.length > 0 ? (
        <Plot
          data={plotData.pareto_2d.data}
          layout={plotData.pareto_2d.layout}
          style={{ width: '100%', height: '400px' }}
        />
      ) : <p>No data for 2D Pareto front.</p>}

      <h3>3D Pareto Front</h3>
      {plotData.pareto_3d.data.length > 0 ? (
        <Plot
          data={plotData.pareto_3d.data}
          layout={plotData.pareto_3d.layout}
          style={{ width: '100%', height: '500px' }}
        />
      ) : <p>No data for 3D Pareto front.</p>}

      <h3>α‑score Bar Chart</h3>
      {plotData.alpha_scores.data.length > 0 ? (
        <Plot
          data={plotData.alpha_scores.data}
          layout={plotData.alpha_scores.layout}
          style={{ width: '100%', height: '400px' }}
        />
      ) : <p>No α‑score data.</p>}

      <h3>Regret Distribution</h3>
      {plotData.regret_distribution.data.length > 0 ? (
        <Plot
          data={plotData.regret_distribution.data}
          layout={plotData.regret_distribution.layout}
          style={{ width: '100%', height: '400px' }}
        />
      ) : <p>No regret data.</p>}
    </div>
  );
};

export default VisualizationTab;