import React from 'react';

const CalculationsTab = ({ calculations }) => {
  if (!calculations) return <div>No calculation details available.</div>;

  return (
    <div className="calculations-tab">
      <h3>Step‑by‑Step Calculations</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflowX: 'auto' }}>
        {JSON.stringify(calculations, null, 2)}
      </pre>
    </div>
  );
};

export default CalculationsTab;