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
    
    // Format learning time display
    const formatTime = (minutes) => {
      if (!minutes) return 'N/A';
      if (minutes < 1) {
        return '< 1 min';
      } else if (minutes < 60) {
        return `${Math.round(minutes)} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
      }
    };
    
    const selfTime = formatTime(data.selfLearningTime);
    const totalTime = formatTime(data.totalLearningTime);
    const conceptType = data.isAtomic ? '🔹 Atomic' : '🔸 Composite';
    
    tooltip.style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <div style="font-weight: bold; margin-bottom: 5px; color: #1e293b;">${data.name}</div>
        <div style="font-size: 12px; color: #7c3aed; margin-bottom: 6px; font-weight: 600;">${conceptType}</div>
        <div style="font-size: 13px; color: #475569; margin-bottom: 8px;">${data.description || 'No description available'}</div>
        <div style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>⏱️ Self:</span>
            <span style="font-weight: 600;">${selfTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>📚 Total:</span>
            <span style="font-weight: 600;">${totalTime}</span>
          </div>
        </div>
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

