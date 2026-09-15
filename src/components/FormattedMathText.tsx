import React from 'react';

interface FormattedMathTextProps {
  text: string;
  className?: string;
}

/**
 * Converts chemical formula numbers and ion charges to unicode subscripts & superscripts
 * Example: H2SO4 -> H₂SO₄, Fe3+ -> Fe³⁺, SO4 2- -> SO₄²⁻
 */
export function formatChemAndMathString(raw: string): string {
  if (!raw) return '';

  let str = raw;

  // 1. Superscript mapping for ions (+, -, numbers)
  const superMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
  };

  // 2. Subscript mapping for chemical numbers
  const subMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };

  // Replace chemical ion charges like Fe3+, Cu2+, Al3+, SO4 2-, Cl-, OH-, Na+, H+
  str = str.replace(/([A-Za-z0-9\)\}])\s*([1-9]?[\+\-])/g, (_, p1, p2) => {
    const superConverted = p2.split('').map((c: string) => superMap[c] || c).join('');
    return `${p1}${superConverted}`;
  });

  // Replace chemical element sub-numbers like H2, O4, C6, H12, N2, P2, (OH)2, (SO4)3
  // Match capital letter or closing bracket followed by lowercase letters (optional) and numbers
  str = str.replace(/([A-Z][a-z]?|\))\s*([0-9]+)/g, (_, elem, nums) => {
    const subConverted = nums.split('').map((c: string) => subMap[c] || c).join('');
    return `${elem}${subConverted}`;
  });

  // Replace common LaTeX symbols if present outside $...$
  str = str
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\neq/g, '≠')
    .replace(/\\le(q)?\b/g, '≤')
    .replace(/\\ge(q)?\b/g, '≥')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\Delta/g, 'Δ');

  return str;
}

/**
 * Parses LaTeX math $...$ or \(...\) or fractions \frac{a}{b} and renders formatted HTML
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({ text, className = '' }) => {
  if (!text || typeof text !== 'string') return null;

  // Split text by $...$ or \(...\) or HTML tags
  const parts = text.split(/(\$[^$]+\$|\\\(.*?\\\)|<sub[^>]*>.*?<\/sub>|<sup[^>]*>.*?<\/sup>|<b[^>]*>.*?<\/b>|<i[^>]*>.*?<\/i>)/gi);

  return (
    <span className={`inline-wrap ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Is it LaTeX math wrapped in $...$ or \(...\)?
        const isLatex = (part.startsWith('$') && part.endsWith('$') && part.length > 2) ||
                        (part.startsWith('\\(') && part.endsWith('\\)'));

        if (isLatex) {
          const rawMath = part.startsWith('$')
            ? part.slice(1, -1)
            : part.slice(2, -2);

          return (
            <span key={index} className="inline-flex items-baseline font-serif mx-0.5 text-teal-800 dark:text-teal-200 font-medium">
              {renderLatexMath(rawMath)}
            </span>
          );
        }

        // Is it <sub> or <sup> or HTML tags?
        if (/<(sub|sup|b|i)[^>]*>/i.test(part)) {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: part }}
            />
          );
        }

        // Regular text: apply chemical formula & unicode subscript formatting
        const formattedPlain = formatChemAndMathString(part);
        return <span key={index}>{formattedPlain}</span>;
      })}
    </span>
  );
};

/**
 * Render LaTeX Math internal structures like \frac{A}{B}, \sqrt{X}, X^2, X_1
 */
function renderLatexMath(math: string): React.ReactNode {
  let cleanMath = math.trim();

  // Handle \text{...}
  cleanMath = cleanMath.replace(/\\text\{([^}]+)\}/g, '$1');

  // Handle \frac{numerator}{denominator}
  const fracRegex = /\\frac\{([^}]+)\}\{([^}]+)\}/g;
  if (fracRegex.test(cleanMath)) {
    const fracParts: React.ReactNode[] = [];
    let lastIdx = 0;
    const matches = Array.from(math.matchAll(/\\frac\{([^}]+)\}\{([^}]+)\}/g));

    matches.forEach((m, idx) => {
      if (m.index! > lastIdx) {
        fracParts.push(
          <span key={`text-${idx}`}>{formatChemAndMathString(cleanMath.slice(lastIdx, m.index))}</span>
        );
      }
      const num = m[1];
      const den = m[2];
      fracParts.push(
        <span key={`frac-${idx}`} className="inline-flex flex-col text-center align-middle mx-1 px-1 bg-teal-50/80 dark:bg-teal-950/60 rounded border border-teal-200/60 dark:border-teal-800/60">
          <span className="border-b border-teal-600 dark:border-teal-400 px-1 text-[0.9em] font-bold text-teal-900 dark:text-teal-100">
            {formatChemAndMathString(num)}
          </span>
          <span className="px-1 text-[0.9em] font-bold text-teal-800 dark:text-teal-200">
            {formatChemAndMathString(den)}
          </span>
        </span>
      );
      lastIdx = m.index! + m[0].length;
    });

    if (lastIdx < cleanMath.length) {
      fracParts.push(
        <span key="text-end">{formatChemAndMathString(cleanMath.slice(lastIdx))}</span>
      );
    }
    return <>{fracParts}</>;
  }

  // Handle \sqrt{X}
  if (cleanMath.includes('\\sqrt')) {
    cleanMath = cleanMath.replace(/\\sqrt\{([^}]+)\}/g, '√($1)').replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');
  }

  // Convert superscripts ^2 or ^{23}
  cleanMath = cleanMath.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>').replace(/\^([0-9a-zA-Z\+\-]+)/g, '<sup>$1</sup>');

  // Convert subscripts _2 or _{12}
  cleanMath = cleanMath.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>').replace(/_([0-9a-zA-Z]+)/g, '<sub>$1</sub>');

  // Render processed string with HTML sup/sub support
  const formatted = formatChemAndMathString(cleanMath);
  if (/<(sub|sup)>/i.test(formatted)) {
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  }

  return <span>{formatted}</span>;
}
