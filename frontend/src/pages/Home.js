import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MarkdownWithLatex from '../components/MarkdownWithLatex';
import { useTooltip } from '../hooks/useTooltip';
import { useD3Tree } from '../hooks/useD3Tree';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import API_URL from '../config';

function Home() {
  const [concept, setConcept] = useState('');
  const [knowledgeTree, setKnowledgeTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Custom hooks
  const { tooltipRef, showTooltip, hideTooltip } = useTooltip();
  
  // Node click handler
  const handleNodeClick = useCallback(async (nodeData) => {
    if (!knowledgeTree || !concept) return;
    
    setSelectedConcept(nodeData.name);
    setExplanationLoading(true);
    setExplanation(null);
    setChatMessages([]); // Reset chat when opening new explanation
    setChatInput('');
    
    try {
      const response = await fetch(`${API_URL}/api/explain-concept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept_name: nodeData.name,
          original_query: concept,
          knowledge_tree: knowledgeTree
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error('Error:', err);
      setExplanation('Error generating explanation. Please try again.');
    } finally {
      setExplanationLoading(false);
    }
  }, [knowledgeTree, concept]);
  
  // Handle chat message send
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !explanation) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/chat-about-explanation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept_name: selectedConcept,
          original_query: concept,
          knowledge_tree: knowledgeTree,
          explanation: explanation,
          chat_history: chatMessages,
          user_message: userMessage
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.response };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, explanation, selectedConcept, concept, knowledgeTree, chatMessages]);
  
  const { svgRef, treeDataRef, transformRef, zoomRef } = useD3Tree(
    knowledgeTree, 
    showTooltip, 
    hideTooltip,
    handleNodeClick
  );
  
  useKeyboardNavigation(svgRef, treeDataRef, transformRef, zoomRef, !!knowledgeTree);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (concept.trim() === '') return;

    setLoading(true);
    setError(null);
    setKnowledgeTree(null);

    try {
      const response = await fetch(`${API_URL}/api/knowledge-map`, {
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
  }, [concept]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      {knowledgeTree && (
        <div style={{
          padding: '16px 24px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              MindTrail
            </h1>
            <Link
              to="/about"
              style={{
                fontSize: '14px',
                color: '#6b7280',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#1f2937'}
              onMouseLeave={(e) => e.target.style.color = '#6b7280'}
            >
              About
            </Link>
          </div>
          <button
            onClick={() => {
              setKnowledgeTree(null);
              setConcept('');
              setError(null);
            }}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            New Trail
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: !knowledgeTree && !loading ? 'center' : 'flex-start',
        padding: knowledgeTree || loading ? '0' : '40px 20px',
        overflow: 'hidden'
      }}>
        {!knowledgeTree && !loading && (
          <div style={{
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center'
          }}>
            {/* Logo/Title */}
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px',
              marginTop: 0
            }}>
              MindTrail
            </h1>
            
            <p style={{
              fontSize: '18px',
              color: '#6b7280',
              marginBottom: '48px',
              marginTop: 0
            }}>
              Navigate knowledge
            </p>
            
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                marginBottom: '12px'
              }}>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="What do you want to learn? (e.g., General Relativity)"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    fontSize: '16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '24px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#9ca3af';
                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
              
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: concept.trim() ? '#10b981' : '#e5e7eb',
                  color: concept.trim() ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: concept.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: concept.trim() ? '0 2px 4px rgba(16,185,129,0.2)' : 'none'
                }}
                disabled={!concept.trim()}
                onMouseEnter={(e) => {
                  if (concept.trim()) {
                    e.target.style.background = '#059669';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px rgba(16,185,129,0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (concept.trim()) {
                    e.target.style.background = '#10b981';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
                  }
                }}
              >
                Generate Learning Trail
              </button>
            </form>

            {error && (
              <div style={{
                marginTop: '20px',
                padding: '12px 20px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}

            {/* About Link */}
            <div style={{ marginTop: '32px' }}>
              <Link
                to="/about"
                style={{
                  fontSize: '15px',
                  color: '#10b981',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#059669'}
                onMouseLeave={(e) => e.target.style.color = '#10b981'}
              >
                Learn more about MindTrail →
              </Link>
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
              width: '48px',
              height: '48px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <div style={{ fontSize: '16px', color: '#6b7280', fontWeight: '500' }}>
              Mapping your learning trail...
            </div>
          </div>
        )}

        {knowledgeTree && (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'white',
            position: 'relative'
          }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%', outline: 'none' }} tabIndex="0"></svg>
          </div>
        )}
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

      {/* Explanation Modal */}
      {(explanation || explanationLoading || selectedConcept) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => {
            setExplanation(null);
            setSelectedConcept(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '1400px',
              width: '100%',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'white',
              borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937', fontWeight: '600' }}>
                {selectedConcept}
              </h2>
              <button
                onClick={() => {
                  setExplanation(null);
                  setSelectedConcept(null);
                  setChatMessages([]);
                  setChatInput('');
                }}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content - Two Column Layout */}
            <div style={{ 
              display: 'flex', 
              flex: 1,
              overflow: 'hidden'
            }}>
              {/* Left Column - Explanation */}
              <div style={{ 
                flex: '1',
                padding: '24px',
                overflowY: 'auto',
                borderRight: '1px solid #e5e7eb'
              }}>
                {explanationLoading && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #f3f4f6',
                      borderTop: '4px solid #10b981',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <div style={{ color: '#6b7280', fontSize: '15px' }}>
                      Generating explanation...
                    </div>
                  </div>
                )}
                
                {explanation && !explanationLoading && (
                  <MarkdownWithLatex content={explanation} />
                )}
              </div>

              {/* Right Column - Chat */}
              <div style={{
                width: '400px',
                display: 'flex',
                flexDirection: 'column',
                background: '#f9fafb'
              }}>
                {/* Chat Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                  background: 'white'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '15px', 
                    color: '#374151',
                    fontWeight: '600'
                  }}>
                    Ask Questions
                  </h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    Chat about this explanation
                  </p>
                </div>

                {/* Chat Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {chatMessages.length === 0 && !chatLoading && (
                    <div style={{
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '14px',
                      padding: '40px 20px'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>💭</div>
                      <div>Ask any questions about this concept</div>
                    </div>
                  )}
                  
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: '16px',
                          background: msg.role === 'user' ? '#10b981' : 'white',
                          color: msg.role === 'user' ? 'white' : '#1f2937',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb'
                        }}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownWithLatex content={msg.content} />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '16px',
                        background: 'white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#d1d5db',
                            animation: 'bounce 1.4s infinite ease-in-out both',
                            animationDelay: '-0.32s'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#d1d5db',
                            animation: 'bounce 1.4s infinite ease-in-out both',
                            animationDelay: '-0.16s'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#d1d5db',
                            animation: 'bounce 1.4s infinite ease-in-out both'
                          }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid #e5e7eb',
                  background: 'white'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask a question..."
                      disabled={!explanation || chatLoading}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        background: (!explanation || chatLoading) ? '#f3f4f6' : 'white'
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || chatLoading || !explanation}
                      style={{
                        padding: '10px 16px',
                        background: (!chatInput.trim() || chatLoading || !explanation) ? '#e5e7eb' : '#10b981',
                        color: (!chatInput.trim() || chatLoading || !explanation) ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (!chatInput.trim() || chatLoading || !explanation) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (chatInput.trim() && !chatLoading && explanation) {
                          e.target.style.background = '#059669';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (chatInput.trim() && !chatLoading && explanation) {
                          e.target.style.background = '#10b981';
                        }
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

