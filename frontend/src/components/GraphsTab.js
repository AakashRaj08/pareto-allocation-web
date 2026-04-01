import React from 'react';

const GraphsTab = ({ plotData }) => {
  return (
    <div className="glass-card graphs-placeholder">
      <div className="placeholder-icon">📐</div>
      <h3>Advanced Graphs</h3>
      <p>
        This panel is reserved for additional interactive visualizations such as
        parallel coordinates, sensitivity heatmaps, and agent utility surfaces.
        These will be available in a future update.
      </p>
    </div>
  );
};

export default GraphsTab;