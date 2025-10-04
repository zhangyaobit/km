import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { calculateBoundingBox, calculateFitTransform, getNodeColor, truncateText, resolveTextCollisions } from '../utils/d3Utils';

/**
 * Render tree links (connections between nodes)
 */
const renderLinks = (g, treeData) => {
  g.selectAll('.link')
    .data(treeData.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x))
    .attr('fill', 'none')
    .attr('stroke', '#64748b')
    .attr('stroke-width', 2)
    .attr('opacity', 0)
    .transition()
    .duration(600)
    .attr('opacity', 0.6);
};

/**
 * Render tree nodes with circles and labels
 */
const renderNodes = (g, treeData, showTooltip, hideTooltip) => {
  const nodes = g.selectAll('.node')
    .data(treeData.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`)
    .style('opacity', 0);

  // Add circles for nodes
  nodes.append('circle')
    .attr('r', d => d.depth === 0 ? 30 : 20)
    .attr('fill', d => getNodeColor(d.depth))
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
    .attr('dx', d => d.depth === 0 ? 40 : 30)
    .attr('dy', 5)
    .attr('text-anchor', 'start')
    .style('font-size', d => d.depth === 0 ? '42px' : '33px')
    .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
    .style('fill', '#1e293b')
    .text(d => truncateText(d.data.name));

  // Resolve text collisions after a short delay to ensure text is rendered
  setTimeout(() => {
    resolveTextCollisions(nodes);
  }, 50);

  // Animate nodes
  nodes.transition()
    .duration(600)
    .delay((d, i) => i * 50)
    .style('opacity', 1);
};

/**
 * Setup zoom behavior for the SVG
 */
const setupZoom = (svg, g, transformRef, zoomRef) => {
  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => {
      transformRef.current = { 
        x: event.transform.x, 
        y: event.transform.y, 
        k: event.transform.k 
      };
      g.attr('transform', `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k})`);
    });

  svg.call(zoom);
  zoomRef.current = zoom;
  
  return zoom;
};

/**
 * Fit the graph to canvas with animation
 */
const fitGraphToCanvas = (svg, zoom, treeData, width, height) => {
  const descendants = treeData.descendants();
  const boundingBox = calculateBoundingBox(descendants);
  const { translateX, translateY, scale } = calculateFitTransform(boundingBox, width, height);
  
  const initialTransform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
  
  svg.call(zoom.transform, initialTransform);
};

/**
 * Custom hook for D3 tree visualization
 * @param {Object} knowledgeTree - Tree data to visualize
 * @param {Function} showTooltip - Function to show tooltip
 * @param {Function} hideTooltip - Function to hide tooltip
 * @returns {Object} Refs for SVG and tree data, plus zoom ref
 */
export const useD3Tree = (knowledgeTree, showTooltip, hideTooltip) => {
  const svgRef = useRef(null);
  const treeDataRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const zoomRef = useRef(null);

  useEffect(() => {
    if (!knowledgeTree || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    // Create tree layout (horizontal orientation)
    const treeLayout = d3.tree()
      .size([height * 8, width - 300])
      .separation((a, b) => {
        const baseSeparation = a.parent === b.parent ? 5.5 : 6.5;
        const childrenFactor = (a.children || a._children ? 0.5 : 0) + (b.children || b._children ? 0.5 : 0);
        return baseSeparation + childrenFactor;
      });

    // Create hierarchy and layout
    const root = d3.hierarchy(knowledgeTree);
    const treeData = treeLayout(root);
    treeDataRef.current = treeData;

    // Render components
    renderLinks(g, treeData);
    renderNodes(g, treeData, showTooltip, hideTooltip);
    
    // Setup zoom and fit to canvas
    const zoom = setupZoom(svg, g, transformRef, zoomRef);
    fitGraphToCanvas(svg, zoom, treeData, width, height);
    
    // Focus on SVG for keyboard navigation
    setTimeout(() => {
      if (svgRef.current) {
        svgRef.current.focus();
      }
    }, 100);
  }, [knowledgeTree, showTooltip, hideTooltip]);

  return {
    svgRef,
    treeDataRef,
    transformRef,
    zoomRef
  };
};

