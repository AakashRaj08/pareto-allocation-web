import React, { useRef, useEffect, useCallback } from 'react';
import Plotly from 'plotly.js-dist';

/**
 * Custom Plotly wrapper using hooks + imperative API.
 * Bypasses react-plotly.js class component which crashes under React 19.
 */
const Plot = ({ data, layout, config, style, className }) => {
  const containerRef = useRef(null);
  const plotRef = useRef(false);  // track if we've rendered a plot

  const safeConfig = {
    displayModeBar: false,
    responsive: true,
    ...(config || {}),
  };

  // Stable render function
  const renderPlot = useCallback(() => {
    const el = containerRef.current;
    if (!el || !data || data.length === 0) return;

    try {
      Plotly.react(el, data, layout || {}, safeConfig);
      plotRef.current = true;
    } catch (err) {
      console.warn('Plotly.react failed:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layout]);

  // Render on mount + when data/layout changes
  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  // Resize observer for responsiveness
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (plotRef.current) {
        try {
          Plotly.Plots.resize(el);
        } catch (_) {
          // ignore resize errors
        }
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      // Safe cleanup – purge plot on unmount
      try {
        if (el && plotRef.current) {
          Plotly.purge(el);
        }
      } catch (_) {
        // ignore cleanup errors
      }
      plotRef.current = false;
    };
  }, []);

  return <div ref={containerRef} style={style} className={className} />;
};

export default Plot;
