import { useRef, useCallback } from 'react';
import * as d3 from 'd3';

/**
 * Custom hook for managing D3 tooltip behavior
 * @returns {Object} Tooltip ref and handler functions
 */
export const useTooltip = () => {
  const tooltipRef = useRef(null);

  const showTooltip = useCallback((event, data) => {
    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <div style="font-weight: bold; margin-bottom: 5px; color: #1e293b;">${data.name}</div>
        <div style="font-size: 13px; color: #475569;">${data.description || 'No description available'}</div>
      `);
  }, []);

  const hideTooltip = useCallback(() => {
    d3.select(tooltipRef.current).style('opacity', 0);
  }, []);

  return {
    tooltipRef,
    showTooltip,
    hideTooltip
  };
};

