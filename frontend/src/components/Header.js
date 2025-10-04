import React from 'react';

// Style constants to prevent object recreation on each render
const containerStyle = {
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '20px',
  color: 'white'
};

const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  minWidth: '0'
};

const titleStyle = {
  margin: 0,
  fontSize: '24px',
  fontWeight: '700',
  textShadow: '1px 1px 3px rgba(0,0,0,0.2)',
  whiteSpace: 'nowrap'
};

const subtitleStyle = {
  fontSize: '14px',
  opacity: 0.9,
  whiteSpace: 'nowrap'
};

const formStyle = {
  display: 'flex',
  gap: '10px',
  flex: 1,
  maxWidth: '600px'
};

const inputStyle = {
  flex: 1,
  padding: '10px 16px',
  fontSize: '15px',
  border: 'none',
  borderRadius: '8px',
  outline: 'none',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease'
};

const getButtonStyle = (loading) => ({
  padding: '10px 24px',
  fontSize: '15px',
  fontWeight: '600',
  background: loading ? '#94a3b8' : '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: loading ? 'not-allowed' : 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap'
});

/**
 * Header component with title and search form
 */
const Header = React.memo(({ concept, setConcept, loading, onSubmit }) => {
  return (
    <div style={containerStyle}>
      {/* Title Section */}
      <div style={titleSectionStyle}>
        <h1 style={titleStyle}>
          Knowledge Map
        </h1>
        <span style={subtitleStyle}>
          Visualize learning paths
        </span>
      </div>

      {/* Search Form */}
      <form onSubmit={onSubmit} style={formStyle}>
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="deep learning"
          disabled={loading}
          style={inputStyle}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={getButtonStyle(loading)}
        >
          {loading ? 'Generating...' : 'Generate Map'}
        </button>
      </form>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;

