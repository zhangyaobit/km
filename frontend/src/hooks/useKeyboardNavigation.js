import { useEffect } from 'react';
import * as d3 from 'd3';
import { calculateBoundingBox, calculateFitTransform } from '../utils/d3Utils';

const MOVE_DISTANCE = 50;
const ZOOM_FACTOR = 1.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

/**
 * Handle panning (WASD keys)
 */
const handlePan = (key, transformRef) => {
  const moves = {
    'w': { dx: 0, dy: MOVE_DISTANCE },
    's': { dx: 0, dy: -MOVE_DISTANCE },
    'a': { dx: MOVE_DISTANCE, dy: 0 },
    'd': { dx: -MOVE_DISTANCE, dy: 0 }
  };

  const move = moves[key];
  if (!move) return null;

  return d3.zoomIdentity
    .translate(transformRef.current.x + move.dx, transformRef.current.y + move.dy)
    .scale(transformRef.current.k);
};

/**
 * Handle zooming (J/K keys)
 */
const handleZoom = (key, transformRef, svgRef) => {
  const isZoomIn = key === 'k';
  const isZoomOut = key === 'j';
  
  if (!isZoomIn && !isZoomOut) return null;

  const width = svgRef.current.clientWidth;
  const height = svgRef.current.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const oldScale = transformRef.current.k;
  const newScale = isZoomIn 
    ? Math.min(oldScale * ZOOM_FACTOR, MAX_SCALE)
    : Math.max(oldScale / ZOOM_FACTOR, MIN_SCALE);
  
  const scaleFactor = newScale / oldScale;
  
  // Calculate new translation to keep center point fixed
  const newX = centerX - (centerX - transformRef.current.x) * scaleFactor;
  const newY = centerY - (centerY - transformRef.current.y) * scaleFactor;
  
  return d3.zoomIdentity
    .translate(newX, newY)
    .scale(newScale);
};

/**
 * Handle fit to canvas (F key)
 */
const handleFitToCanvas = (svgRef, treeDataRef) => {
  if (!treeDataRef.current) return null;
  
  const descendants = treeDataRef.current.descendants();
  if (descendants.length === 0) return null;
  
  const boundingBox = calculateBoundingBox(descendants);
  const width = svgRef.current.clientWidth;
  const height = svgRef.current.clientHeight;
  
  const { translateX, translateY, scale } = calculateFitTransform(boundingBox, width, height);
  
  return d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
};

/**
 * Custom hook for keyboard navigation of D3 tree
 * @param {Object} svgRef - Reference to SVG element
 * @param {Object} treeDataRef - Reference to tree data
 * @param {Object} transformRef - Reference to current transform
 * @param {Object} zoomRef - Reference to D3 zoom behavior
 * @param {boolean} isActive - Whether keyboard navigation is active
 */
export const useKeyboardNavigation = (svgRef, treeDataRef, transformRef, zoomRef, isActive) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      if (!svgRef.current || !zoomRef.current) return;
      
      // Check if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();
      let newTransform = null;

      // Handle different key commands
      if (['w', 's', 'a', 'd'].includes(key)) {
        newTransform = handlePan(key, transformRef);
      } else if (['j', 'k'].includes(key)) {
        newTransform = handleZoom(key, transformRef, svgRef);
      } else if (key === 'f') {
        event.preventDefault();
        newTransform = handleFitToCanvas(svgRef, treeDataRef);
      }

      // Apply transform with animation if one was calculated
      if (newTransform) {
        event.preventDefault();
        const duration = key === 'f' ? 500 : 200;
        
        d3.select(svgRef.current)
          .transition()
          .duration(duration)
          .call(zoomRef.current.transform, newTransform);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [svgRef, treeDataRef, transformRef, zoomRef, isActive]);
};

