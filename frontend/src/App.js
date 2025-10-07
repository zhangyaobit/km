import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import MarkdownWithLatex from './components/MarkdownWithLatex';
import { useTooltip } from './hooks/useTooltip';
import { useD3Tree } from './hooks/useD3Tree';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import API_URL from './config';
import './styles/App.css';

function App() {
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

      {/* Explanation Modal */}
      {(explanation || explanationLoading || selectedConcept) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => {
            setExplanation(null);
            setSelectedConcept(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '1400px',
              width: '100%',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: '600' }}>
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
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
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
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #8b5cf6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <div style={{ color: '#64748b', fontSize: '16px' }}>
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
                background: '#f8fafc'
              }}>
                {/* Chat Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                  background: 'white'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    color: '#475569',
                    fontWeight: '600'
                  }}>
                    💬 Ask Questions
                  </h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#94a3b8'
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
                      color: '#94a3b8',
                      fontSize: '14px',
                      padding: '40px 20px'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>💭</div>
                      <div>Ask any questions about this concept!</div>
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
                          borderRadius: '12px',
                          background: msg.role === 'user' ? '#8b5cf6' : 'white',
                          color: msg.role === 'user' ? 'white' : '#1e293b',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          boxShadow: msg.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
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
                        borderRadius: '12px',
                        background: 'white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#cbd5e1',
                            animation: 'bounce 1.4s infinite ease-in-out both',
                            animationDelay: '-0.32s'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#cbd5e1',
                            animation: 'bounce 1.4s infinite ease-in-out both',
                            animationDelay: '-0.16s'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#cbd5e1',
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
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        background: (!explanation || chatLoading) ? '#f1f5f9' : 'white'
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || chatLoading || !explanation}
                      style={{
                        padding: '10px 16px',
                        background: (!chatInput.trim() || chatLoading || !explanation) ? '#cbd5e1' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (!chatInput.trim() || chatLoading || !explanation) ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
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

export default App;
