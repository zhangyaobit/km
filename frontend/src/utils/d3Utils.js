/**
 * Calculate the bounding box of all nodes in a tree
 * @param {Array} descendants - Array of tree nodes
 * @returns {Object} Bounding box with minX, maxX, minY, maxY
 */
export const calculateBoundingBox = (descendants) => {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  descendants.forEach(d => {
    minX = Math.min(minX, d.x);
    maxX = Math.max(maxX, d.x);
    minY = Math.min(minY, d.y);
    maxY = Math.max(maxY, d.y);
  });
  
  return { minX, maxX, minY, maxY };
};

/**
 * Calculate transform to fit the graph within the viewport
 * @param {Object} boundingBox - Bounding box with minX, maxX, minY, maxY
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @param {number} padding - Padding around the graph
 * @returns {Object} d3 zoom transform
 */
export const calculateFitTransform = (boundingBox, width, height, padding = 100) => {
  const { minX, maxX, minY, maxY } = boundingBox;
  
  const boundingWidth = maxY - minY + padding * 2;
  const boundingHeight = maxX - minX + padding * 2;
  
  // Calculate scale to fit
  const scale = Math.min(
    width / boundingWidth,
    height / boundingHeight,
    3 // max scale
  );
  
  // Calculate center of bounding box
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Calculate translation to center the graph
  const translateX = width / 2 - centerY * scale;
  const translateY = height / 2 - centerX * scale;
  
  return { translateX, translateY, scale };
};

/**
 * Node colors by depth level
 */
export const NODE_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

/**
 * Get color for a node based on its depth
 * @param {number} depth - Node depth in tree
 * @returns {string} Color hex code
 */
export const getNodeColor = (depth) => {
  return NODE_COLORS[depth % NODE_COLORS.length];
};

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 25) => {
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
};

/**
 * Detect and resolve text label collisions
 * @param {Array} nodes - Array of node selections with text
 */
export const resolveTextCollisions = (nodes) => {
  const labels = [];
  
  // Collect all label bounding boxes
  nodes.each(function(d) {
    const textElement = this.querySelector('text');
    if (!textElement) return;
    
    const bbox = textElement.getBBox();
    const transform = this.getAttribute('transform');
    const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
    
    if (match) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      
      labels.push({
        node: this,
        textElement,
        x: x + bbox.x,
        y: y + bbox.y,
        width: bbox.width,
        height: bbox.height,
        centerY: y,
        depth: d.depth,
        originalDy: parseFloat(textElement.getAttribute('dy') || 0)
      });
    }
  });
  
  // Sort by x position (left to right)
  labels.sort((a, b) => a.x - b.x);
  
  // Resolve collisions by adjusting dy offset
  const maxIterations = 10;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        
        // Check if labels are in the same horizontal region
        const horizontalOverlap = !(a.x + a.width + 20 < b.x || b.x + b.width + 20 < a.x);
        
        if (horizontalOverlap) {
          // Check vertical overlap
          const aTop = a.centerY + a.originalDy - a.height / 2;
          const aBottom = a.centerY + a.originalDy + a.height / 2;
          const bTop = b.centerY + b.originalDy - b.height / 2;
          const bBottom = b.centerY + b.originalDy + b.height / 2;
          
          const verticalOverlap = !(aBottom + 10 < bTop || bBottom + 10 < aTop);
          
          if (verticalOverlap) {
            hasCollision = true;
            
            // Adjust positions to resolve collision
            const midpoint = (aTop + aBottom + bTop + bBottom) / 4;
            const spacing = (a.height + b.height) / 2 + 15;
            
            a.originalDy = midpoint - a.centerY - spacing / 2;
            b.originalDy = midpoint - b.centerY + spacing / 2;
          }
        }
      }
    }
    
    if (!hasCollision) break;
  }
  
  // Apply adjusted positions
  labels.forEach(label => {
    label.textElement.setAttribute('dy', label.originalDy);
  });
};

