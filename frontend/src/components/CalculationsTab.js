import React, { useState } from 'react';

const CalculationsTab = ({ calculations }) => {
  const [copied, setCopied] = useState(false);

  if (!calculations) {
    return (
      <div className="glass-card plot-card">
        <div className="plot-empty">No calculation details available.</div>
      </div>
    );
  }

  const jsonString = JSON.stringify(calculations, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card plot-card">
      <div className="calc-header">
        <div className="calc-title">Allocation Result</div>
        <span className="calc-badge">JSON</span>
        <button
          id="copy-json-btn"
          onClick={handleCopy}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            color: copied ? '#34d399' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          {copied ? '✓ Copied!' : '⎘ Copy'}
        </button>
      </div>
      <pre className="json-viewer">{jsonString}</pre>
    </div>
  );
};

export default CalculationsTab;