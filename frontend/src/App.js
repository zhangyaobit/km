import React, { useState } from 'react';
import Header from './components/Header';
import { useTooltip } from './hooks/useTooltip';
import { useD3Tree } from './hooks/useD3Tree';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import './styles/App.css';

function App() {
  const [concept, setConcept] = useState('');
  const [knowledgeTree, setKnowledgeTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom hooks
  const { tooltipRef, showTooltip, hideTooltip } = useTooltip();
  const { svgRef, treeDataRef, transformRef, zoomRef } = useD3Tree(
    knowledgeTree, 
    showTooltip, 
    hideTooltip
  );
  
  useKeyboardNavigation(svgRef, treeDataRef, transformRef, zoomRef, !!knowledgeTree);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (concept.trim() === '') return;

    setLoading(true);
    setError(null);
    setKnowledgeTree(null);

    try {
      const response = await fetch('http://localhost:8000/api/knowledge-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ concept: concept }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate knowledge map');
      }

      const data = await response.json();
      setKnowledgeTree(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error generating knowledge map. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Header 
        concept={concept}
        setConcept={setConcept}
        loading={loading}
        onSubmit={handleSubmit}
      />

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '0 20px 10px',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '8px 16px',
            borderRadius: '6px',
            display: 'inline-block',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            {error}
          </div>
        </div>
      )}

      {/* Visualization Area */}
      <div style={{
        flex: 1,
        margin: '0 12px 12px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {!knowledgeTree && !loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
            <div style={{ fontSize: '20px', fontWeight: '500' }}>
              Enter a concept to generate its knowledge map
            </div>
          </div>
        )}
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '5px solid #e5e7eb',
              borderTop: '5px solid #8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <div style={{ fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
              Generating your knowledge map...
            </div>
          </div>
        )}
        <svg ref={svgRef} style={{ width: '100%', height: '100%', outline: 'none' }} tabIndex="0"></svg>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          padding: '12px 16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s',
          maxWidth: '300px',
          zIndex: 1000
        }}
      />
    </div>
  );
}

export default App;
