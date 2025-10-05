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
    // First, extract and protect image syntax from formatting
    const images = [];
    const imagePattern = /!\[([^\]]*)\]\(([^\)]+)\)/g;
    let textWithPlaceholders = text;
    let match;
    let imageIndex = 0;

    // Replace images with placeholders
    while ((match = imagePattern.exec(text)) !== null) {
      const placeholder = `__IMAGE_PLACEHOLDER_${imageIndex}__`;
      images.push({
        alt: match[1],
        url: match[2],
        placeholder: placeholder
      });
      textWithPlaceholders = textWithPlaceholders.replace(match[0], placeholder);
      imageIndex++;
    }

    // Now handle formatting on the text (images are protected)
    const segments = [];
    let currentPos = 0;

    // Combined pattern to find all formatting markers
    // Only match underscores/asterisks that are NOT inside our placeholders
    const formattingPattern = /(\*\*|__)((?:(?!\1).)+?)\1|(\*|_)((?:(?!\3).)+?)\3/g;

    while ((match = formattingPattern.exec(textWithPlaceholders)) !== null) {
      // Skip if this is inside an image placeholder
      if (match[0].includes('__IMAGE_PLACEHOLDER_')) {
        continue;
      }

      // Add text before the match
      if (match.index > currentPos) {
        segments.push({
          type: 'text',
          content: textWithPlaceholders.substring(currentPos, match.index)
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
    if (currentPos < textWithPlaceholders.length) {
      segments.push({
        type: 'text',
        content: textWithPlaceholders.substring(currentPos)
      });
    }

    // Render segments
    if (segments.length === 0 && images.length === 0) {
      return text;
    }

    const finalSegments = segments.length > 0 ? segments : [{ type: 'text', content: textWithPlaceholders }];

    return finalSegments.map((segment, idx) => {
      let content = segment.content;

      // Replace image placeholders with actual img tags
      images.forEach((img, imgIdx) => {
        if (content && content.includes(img.placeholder)) {
          const parts = content.split(img.placeholder);
          content = parts.map((part, partIdx) => (
            <React.Fragment key={`part-${idx}-${partIdx}`}>
              {part}
              {partIdx < parts.length - 1 && (
                <img 
                  src={img.url} 
                  alt={img.alt}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '16px 0',
                    borderRadius: '8px'
                  }}
                  key={`img-${idx}-${imgIdx}`}
                />
              )}
            </React.Fragment>
          ));
        }
      });

      if (segment.type === 'bold') {
        return <strong key={`bold-${idx}`}>{content}</strong>;
      } else if (segment.type === 'italic') {
        return <em key={`italic-${idx}`}>{content}</em>;
      } else {
        return <span key={`text-${idx}`}>{content}</span>;
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

