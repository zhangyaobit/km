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

