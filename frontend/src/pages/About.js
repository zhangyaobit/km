import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          MindTrail
        </h1>
        <Link
          to="/"
          style={{
            padding: '8px 16px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            textDecoration: 'none',
            transition: 'all 0.2s',
            display: 'inline-block'
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
          Back to Home
        </Link>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '24px',
          marginTop: 0
        }}>
          About MindTrail
        </h1>

        <div style={{
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#374151',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <p style={{ margin: 0 }}>
            MindTrail is an applied research lab reimagining how humans learn and explore science. 
            Our mission is to democratize science, making the frontiers of knowledge accessible to 
            everyone—not just the academic elite. We believe understanding science should feel less 
            like scaling a cliff and more like following a well-marked trail through a national park.
          </p>

          <p style={{ margin: 0 }}>
            We are building an AI-powered platform that visualizes the landscape of human understanding. 
            It creates dynamic "learning trails," guiding users through the exact concepts they need to 
            reach any destination, from quantum physics to machine learning. Like a topographic map of 
            knowledge, it reveals dependencies, suggests efficient routes, and adapts to each learner's 
            pace and curiosity.
          </p>

          <p style={{ margin: 0 }}>
            At MindTrail, we see learning as a collective journey. Learners can share their trails, 
            collaborate with others, and contribute new insights to the global map. By combining 
            artificial intelligence with human creativity, we aim to spark a modern renaissance of 
            curiosity—one where exploring science is open, social, and profoundly accelerated.
          </p>
        </div>

        <div style={{
          marginTop: '48px',
          textAlign: 'center'
        }}>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#059669';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 6px rgba(16,185,129,0.25)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#10b981';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
            }}
          >
            Start Your Learning Journey
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;

