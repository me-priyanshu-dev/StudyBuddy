import React from 'react';

interface Props {
  content: string;
  variant?: 'standard' | 'handwritten';
}

const MarkdownContent: React.FC<Props> = ({ content, variant = 'standard' }) => {
  
  const isHandwritten = variant === 'handwritten';
  // STRICT RULE: Only use handwritten font if variant is handwritten.
  // Standard variant defaults to system sans-serif (via parent or default).
  const baseClass = isHandwritten ? "font-hand text-slate-800 dark:text-slate-200" : "text-slate-700 dark:text-slate-300";

  const formatInline = (text: string) => {
    // Bold: **text** -> Highlighted in handwritten mode
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanText = part.slice(2, -2);
        if (isHandwritten) {
           // Random highlighter colors for fun
           const colors = ['bg-marker-yellow', 'bg-marker-pink', 'bg-marker-green', 'bg-marker-blue'];
           // Deterministic color based on text length to avoid hydration mismatches if using random
           const colorIndex = cleanText.length % colors.length;
           const randomColor = colors[colorIndex];
           // Highlighters are light colors, so we keep text dark for contrast even in dark mode
           return <span key={i} className={`${randomColor} px-1 rounded-sm font-bold text-slate-900 mx-0.5 box-decoration-clone transform -rotate-1 inline-block`}>{cleanText}</span>;
        }
        return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{cleanText}</strong>;
      }
      return part;
    });
  };

  const renderLine = (line: string, index: number) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-4" />;

    // Headers (Regex to catch #, ##, ### with optional space)
    // We strictly capture the text AFTER the hashes to avoid showing ###
    const headerMatch = trimmed.match(/^(#{1,6})\s*(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim(); // Trim the text again to remove leading spaces
      
      if (level === 3) return <h3 key={index} className={`text-xl font-bold mt-4 mb-2 ${isHandwritten ? 'text-primary-700 dark:text-primary-300 decoration-wavy underline decoration-marker-pink' : 'text-slate-800 dark:text-slate-100'}`}>{text}</h3>;
      if (level === 2) return <h2 key={index} className={`text-2xl font-bold mt-5 mb-3 ${isHandwritten ? 'text-primary-800 dark:text-primary-200' : 'text-slate-800 dark:text-slate-100'}`}>{text}</h2>;
      return <h1 key={index} className={`text-3xl font-bold mt-6 mb-4 ${isHandwritten ? 'text-primary-900 dark:text-primary-100 uppercase tracking-wide' : 'text-slate-900 dark:text-white'}`}>{text}</h1>;
    }
    
    // List items (Regex to catch - or * with optional space)
    const listMatch = trimmed.match(/^(\*|-)\s*(.+)/);
    if (listMatch) {
      const text = listMatch[2].trim();
      return (
        <li key={index} className={`ml-6 mb-1 ${isHandwritten ? 'list-none relative pl-2' : 'list-disc marker:text-slate-400 dark:marker:text-slate-500'}`}>
          {isHandwritten && <span className="absolute -left-2 text-primary-500 font-bold transform -rotate-12">★</span>}
          {formatInline(text)}
        </li>
      );
    }

    // Paragraphs - cleanup any accidental markdown that wasn't caught or inline formatting display issues
    return <p key={index} className="leading-relaxed mb-2">{formatInline(trimmed)}</p>;
  };

  return (
    <div className={`${baseClass} p-2`}>
      {content.split('\n').map((line, i) => renderLine(line, i))}
    </div>
  );
};

export default MarkdownContent;