import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

/**
 * Component that renders text with LaTeX math formulas
 * Supports both inline math ($...$) and display math ($$...$$)
 * Also supports basic markdown formatting (headings, bold, etc.)
 */
function MarkdownWithLatex({ content }) {
  if (!content) return null;

  const renderParagraph = (text, key) => {
    // Split text by LaTeX delimiters while preserving the delimiters
    const parts = [];
    let currentIndex = 0;
    let partKey = 0;

    // Pattern to match $$...$$ (block math) or $...$ (inline math)
    const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let match;

    while ((match = mathPattern.exec(text)) !== null) {
      // Add text before the math
      if (match.index > currentIndex) {
        const textBefore = text.substring(currentIndex, match.index);
        parts.push(
          <span key={`${key}-text-${partKey++}`}>
            {renderTextWithFormatting(textBefore)}
          </span>
        );
      }

      // Add the math
      const mathContent = match[0];
      if (mathContent.startsWith('$$') && mathContent.endsWith('$$')) {
        // Block math
        const formula = mathContent.slice(2, -2).trim();
        parts.push(
          <div key={`${key}-block-${partKey++}`} style={{ margin: '16px 0', textAlign: 'center' }}>
            <BlockMath math={formula} />
          </div>
        );
      } else if (mathContent.startsWith('$') && mathContent.endsWith('$')) {
        // Inline math
        const formula = mathContent.slice(1, -1);
        parts.push(
          <span key={`${key}-inline-${partKey++}`} style={{ display: 'inline-block', margin: '0 2px' }}>
            <InlineMath math={formula} />
          </span>
        );
      }

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      parts.push(
        <span key={`${key}-text-${partKey++}`}>
          {renderTextWithFormatting(remainingText)}
        </span>
      );
    }

    return parts.length > 0 ? parts : renderTextWithFormatting(text);
  };

  const renderTextWithFormatting = (text) => {
    // Handle both bold and italic markdown formatting
    // Pattern matches: **bold**, __bold__, *italic*, _italic_
    // Process in order: bold first, then italic
    const parts = [];
    let remainingText = text;
    let keyCounter = 0;

    // Split by segments that need formatting
    const segments = [];
    let currentPos = 0;

    // Combined pattern to find all formatting markers
    const formattingPattern = /(\*\*|__)((?:(?!\1).)+?)\1|(\*|_)((?:(?!\3).)+?)\3/g;
    let match;

    while ((match = formattingPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentPos) {
        segments.push({
          type: 'text',
          content: text.substring(currentPos, match.index)
        });
      }

      // Add the formatted text
      if (match[1]) {
        // Bold (**text** or __text__)
        segments.push({
          type: 'bold',
          content: match[2]
        });
      } else if (match[3]) {
        // Italic (*text* or _text_)
        segments.push({
          type: 'italic',
          content: match[4]
        });
      }

      currentPos = match.index + match[0].length;
    }

    // Add remaining text
    if (currentPos < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(currentPos)
      });
    }

    // Render segments
    if (segments.length === 0) {
      return text;
    }

    return segments.map((segment, idx) => {
      if (segment.type === 'bold') {
        return <strong key={`bold-${idx}`}>{segment.content}</strong>;
      } else if (segment.type === 'italic') {
        return <em key={`italic-${idx}`}>{segment.content}</em>;
      } else {
        return <span key={`text-${idx}`}>{segment.content}</span>;
      }
    });
  };

  return (
    <div style={{
      fontSize: '16px',
      lineHeight: '1.7',
      color: '#334155'
    }}>
      {content.split('\n').map((paragraph, idx) => {
        // Handle headings
        if (paragraph.startsWith('###')) {
          return (
            <h3 key={idx} style={{
              fontSize: '18px',
              fontWeight: '600',
              marginTop: '20px',
              marginBottom: '10px',
              color: '#1e293b'
            }}>
              {renderParagraph(paragraph.replace(/^###\s*/, ''), idx)}
            </h3>
          );
        } else if (paragraph.startsWith('##')) {
          return (
            <h2 key={idx} style={{
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '24px',
              marginBottom: '12px',
              color: '#1e293b'
            }}>
              {renderParagraph(paragraph.replace(/^##\s*/, ''), idx)}
            </h2>
          );
        } else if (paragraph.startsWith('#')) {
          return (
            <h1 key={idx} style={{
              fontSize: '22px',
              fontWeight: '600',
              marginTop: '28px',
              marginBottom: '14px',
              color: '#1e293b'
            }}>
              {renderParagraph(paragraph.replace(/^#\s*/, ''), idx)}
            </h1>
          );
        } else if (paragraph.trim() === '') {
          return <br key={idx} />;
        } else {
          return (
            <p key={idx} style={{ marginBottom: '12px' }}>
              {renderParagraph(paragraph, idx)}
            </p>
          );
        }
      })}
    </div>
  );
}

export default MarkdownWithLatex;

