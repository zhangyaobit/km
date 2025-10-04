import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

function App() {
  const [concept, setConcept] = useState('');
  const [knowledgeTree, setKnowledgeTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const zoomRef = useRef(null);

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

  useEffect(() => {
    if (knowledgeTree && svgRef.current) {
      renderTree(knowledgeTree);
    }
  }, [knowledgeTree]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!svgRef.current || !knowledgeTree || !zoomRef.current) return;
      
      // Check if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const moveDistance = 50;
      const zoomFactor = 1.2;
      let dx = 0;
      let dy = 0;
      let newScale = transformRef.current.k;
      let isZoom = false;

      switch(event.key.toLowerCase()) {
        case 'w':
          dy = moveDistance;
          break;
        case 's':
          dy = -moveDistance;
          break;
        case 'a':
          dx = moveDistance;
          break;
        case 'd':
          dx = -moveDistance;
          break;
        case 'k':
          // Zoom in
          newScale = Math.min(transformRef.current.k * zoomFactor, 3);
          isZoom = true;
          break;
        case 'j':
          // Zoom out
          newScale = Math.max(transformRef.current.k / zoomFactor, 0.5);
          isZoom = true;
          break;
        default:
          return;
      }

      event.preventDefault();

      // Update transform
      const newTransform = isZoom
        ? d3.zoomIdentity
            .translate(transformRef.current.x, transformRef.current.y)
            .scale(newScale)
        : d3.zoomIdentity
            .translate(transformRef.current.x + dx, transformRef.current.y + dy)
            .scale(transformRef.current.k);

      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.transform, newTransform);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [knowledgeTree]);

  const renderTree = (data) => {
    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},50)`);

    // Create tree layout with better spacing
    const treeLayout = d3.tree()
      .size([width * 2, height - 100])
      .separation((a, b) => {
        // Increase separation based on depth and sibling relationship
        const baseSeparation = a.parent === b.parent ? 2.5 : 3.5;
        // Add more spacing for deeper nodes which tend to have longer names
        const depthFactor = 1 + (a.depth * 0.2);
        return baseSeparation * depthFactor;
      });

    // Create hierarchy
    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);

    // Add links
    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .attr('opacity', 0.6);

    // Add nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('opacity', 0);

    // Add circles for nodes
    nodes.append('circle')
      .attr('r', d => d.depth === 0 ? 30 : 20)
      .attr('fill', d => {
        const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];
        return colors[d.depth % colors.length];
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.depth === 0 ? 35 : 25);
        
        showTooltip(event, d.data);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.depth === 0 ? 30 : 20);
        
        hideTooltip();
      });

    // Add text labels
    nodes.append('text')
      .attr('dy', d => d.depth === 0 ? 50 : 35)
      .attr('text-anchor', 'middle')
      .style('font-size', d => d.depth === 0 ? '16px' : '14px')
      .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
      .style('fill', '#1e293b')
      .text(d => {
        const maxLength = 20;
        return d.data.name.length > maxLength 
          ? d.data.name.substring(0, maxLength) + '...' 
          : d.data.name;
      });

    // Animate nodes
    nodes.transition()
      .duration(600)
      .delay((d, i) => i * 50)
      .style('opacity', 1);

    // Add zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        transformRef.current = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
        g.attr('transform', `translate(${width / 2 + event.transform.x},${50 + event.transform.y}) scale(${event.transform.k})`);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
  };

  const showTooltip = (event, data) => {
    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <div style="font-weight: bold; margin-bottom: 5px; color: #1e293b;">${data.name}</div>
        <div style="font-size: 13px; color: #475569;">${data.description || 'No description available'}</div>
      `);
  };

  const hideTooltip = () => {
    d3.select(tooltipRef.current).style('opacity', 0);
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
      {/* Header */}
      <div style={{
        padding: '30px',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '42px',
          fontWeight: '700',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>
          Knowledge Map
        </h1>
        <p style={{
          margin: '0',
          fontSize: '18px',
          opacity: 0.95
        }}>
          Visualize learning paths and dependencies
        </p>
      </div>

      {/* Search Form */}
      <div style={{
        padding: '0 30px 20px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '600px',
          width: '100%'
        }}>
          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="What do you want to learn? (e.g., Machine Learning, React, Quantum Physics)"
            disabled={loading}
            style={{
              flex: 1,
              padding: '16px 20px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '12px',
              outline: 'none',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              background: loading ? '#94a3b8' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            {loading ? 'Generating...' : 'Generate Map'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '15px 30px',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'inline-block',
            fontWeight: '500'
          }}>
            {error}
          </div>
        </div>
      )}

      {/* Visualization Area */}
      <div style={{
        flex: 1,
        margin: '0 30px 30px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
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
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
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

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input:focus {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
        }
        button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default App; 