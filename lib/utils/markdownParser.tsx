'use client';

import React, { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Premium interactive copy button for code blocks
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-[10px] font-bold text-slate-300 hover:text-white transition active:scale-95 flex items-center gap-1 select-none"
    >
      {copied ? (
        <span className="text-emerald-400 flex items-center gap-0.5">✓ Tersalin</span>
      ) : (
        <span>Salin Kode</span>
      )}
    </button>
  );
}

// Robust heading cleaner to prevent duplicated tags and format anomalies
const cleanHeadingText = (str: string) => {
  // Strip all leading # characters and spaces at the start of the heading content
  let text = str.replace(/^[#\s]+/, '').trim();
  // Remove trailing # characters if any
  text = text.replace(/#+$/, '').trim();
  return text;
};

export function parseInlineText(text: string): React.ReactNode[] {
  if (!text) return [];
  let index = 0;
  const tokens: React.ReactNode[] = [];
  let keyCounter = 0;
  
  while (index < text.length) {
    // 1. Inline Math: $mathContent$
    if (text[index] === '$' && text[index + 1] !== '$') {
      const closingIndex = text.indexOf('$', index + 1);
      if (closingIndex !== -1) {
        const mathContent = text.substring(index + 1, closingIndex);
        try {
          const html = katex.renderToString(mathContent, { displayMode: false, throwOnError: false });
          tokens.push(
            <span
              key={`math_${keyCounter++}`}
              className="inline-math font-serif text-violet-300 bg-violet-950/20 border border-violet-850 px-1 py-0.5 rounded text-sm md:text-base select-all inline-block align-middle my-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          tokens.push(<span key={`math_err_${keyCounter++}`} className="text-red-400">${mathContent}$</span>);
        }
        index = closingIndex + 1;
        continue;
      }
    }
    
    // 2. Bold: **boldContent**
    if (text.startsWith('**', index)) {
      const closingIndex = text.indexOf('**', index + 2);
      if (closingIndex !== -1) {
        tokens.push(
          <strong key={`bold_${keyCounter++}`} className="font-extrabold text-white">
            {parseInlineText(text.substring(index + 2, closingIndex))}
          </strong>
        );
        index = closingIndex + 2;
        continue;
      }
    }
    
    // 3. Italic: *italicContent*
    if (text.startsWith('*', index)) {
      const closingIndex = text.indexOf('*', index + 1);
      if (closingIndex !== -1) {
        tokens.push(
          <em key={`italic_${keyCounter++}`} className="italic text-slate-200">
            {parseInlineText(text.substring(index + 1, closingIndex))}
          </em>
        );
        index = closingIndex + 1;
        continue;
      }
    }
    
    // 4. Underline: <u>underlineContent</u>
    if (text.toLowerCase().startsWith('<u>', index)) {
      const closingIndex = text.toLowerCase().indexOf('</u>', index + 3);
      if (closingIndex !== -1) {
        tokens.push(
          <span key={`underline_${keyCounter++}`} className="underline decoration-violet-500/80 decoration-1.5 underline-offset-2">
            {parseInlineText(text.substring(index + 3, closingIndex))}
          </span>
        );
        index = closingIndex + 4;
        continue;
      }
    }
    
    // 5. Inline Code: `codeContent`
    if (text[index] === '`') {
      const closingIndex = text.indexOf('`', index + 1);
      if (closingIndex !== -1) {
        tokens.push(
          <code key={`code_${keyCounter++}`} className="px-1.5 py-0.5 rounded bg-slate-800 text-pink-400 font-mono text-xs border border-slate-700/60 select-all">
            {text.substring(index + 1, closingIndex)}
          </code>
        );
        index = closingIndex + 1;
        continue;
      }
    }
    
    // 6. Non-matched: find next special marker to chunk plain text
    let nextSpecial = text.length;
    const specialChars = ['$', '*', '`', '<'];
    for (const char of specialChars) {
      const nextIdx = text.indexOf(char, index + 1);
      if (nextIdx !== -1 && nextIdx < nextSpecial) {
        if (char === '<' && !text.toLowerCase().startsWith('<u>', nextIdx)) continue;
        nextSpecial = nextIdx;
      }
    }
    
    tokens.push(<span key={`text_${keyCounter++}`}>{text.substring(index, nextSpecial)}</span>);
    index = nextSpecial;
  }
  
  return tokens;
}

export function renderMarkdownAndKatex(
  markdownText: string,
  onToggleCheckbox?: (lineIndex: number) => void
): React.ReactNode {
  if (!markdownText || markdownText.trim() === '') {
    return <p className="text-slate-500 italic">Konten kosong...</p>;
  }

  const lines = markdownText.split('\n');
  const blocks: React.ReactNode[] = [];
  let keyCounter = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Triple-Backtick Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.replace('```', '').trim() || 'text';
      let codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeString = codeLines.join('\n');
      blocks.push(
        <div key={`code_${keyCounter++}`} className="my-4 rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-[10px] text-slate-400 font-mono select-none">
            <span>{lang.toUpperCase()}</span>
            <CopyButton text={codeString} />
          </div>
          <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-sm text-green-400 leading-relaxed whitespace-pre">
            {codeString}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // 2. Block LaTeX Mathematical Equation: $$formula$$
    if (trimmed.startsWith('$$')) {
      let formula = '';
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        formula = trimmed.slice(2, -2).trim();
      } else {
        let mathLines: string[] = [];
        mathLines.push(trimmed.slice(2));
        i++;
        while (i < lines.length && !lines[i].trim().includes('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          const endingLine = lines[i].trim();
          mathLines.push(endingLine.slice(0, endingLine.indexOf('$$')));
        }
        formula = mathLines.join('\n').trim();
      }
      
      try {
        const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
        blocks.push(
          <div
            key={`math_block_${keyCounter++}`}
            className="my-6 p-6 rounded-2xl border border-violet-800/30 bg-violet-950/20 text-center shadow-lg overflow-x-auto select-all"
          >
            <div className="text-violet-300 font-serif text-base md:text-lg tracking-wider overflow-x-auto py-2" dangerouslySetInnerHTML={{ __html: html }} />
            <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400 opacity-60 mt-2 block select-none">Matematika LaTeX</span>
          </div>
        );
      } catch (err) {
        blocks.push(
          <div key={`math_block_err_${keyCounter++}`} className="my-6 p-6 rounded-2xl border border-red-800/30 bg-red-950/20 text-center text-red-400 font-mono text-sm">
            {formula}
          </div>
        );
      }
      i++;
      continue;
    }

    // 3. HTML Tables: | Col 1 | Col 2 |
    if (trimmed.startsWith('|')) {
      let tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 1) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .map((cell) => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            
        const headers = parseRow(tableLines[0]);
        // Check if index 1 is separator row e.g. |---|---|
        const hasSeparator = tableLines[1]?.includes('---');
        const rows = tableLines
          .slice(hasSeparator ? 2 : 1)
          .map(parseRow);
          
        blocks.push(
          <div key={`table_${keyCounter++}`} className="my-6 overflow-x-auto rounded-xl border border-slate-700 shadow-xl bg-slate-900/40">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800/70 border-b border-slate-700">
                  {headers.map((h, idx) => (
                    <th key={`th_${idx}`} className="px-4 py-3 font-bold text-white border-r border-slate-800 last:border-r-0">
                      {parseInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row, rIdx) => (
                  <tr key={`tr_${rIdx}`} className="hover:bg-slate-800/30 transition-colors odd:bg-slate-950/10">
                    {row.map((cell, cIdx) => (
                      <td key={`td_${cIdx}`} className="px-4 py-3 text-slate-300 font-sans border-r border-slate-800 last:border-r-0">
                        {parseInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 4. Horizontal Rules: ---, ***, ___
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push(<hr key={`hr_${keyCounter++}`} className="my-6 border-t border-slate-800" />);
      i++;
      continue;
    }

    // 5. Headings: H1, H2, H3
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1 key={`h1_${keyCounter++}`} className="text-2xl sm:text-3xl font-extrabold text-white mt-8 mb-4 border-b border-slate-850 pb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {parseInlineText(cleanHeadingText(trimmed))}
        </h1>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h2 key={`h2_${keyCounter++}`} className="text-xl sm:text-2xl font-bold text-violet-300 mt-6 mb-3">
          {parseInlineText(cleanHeadingText(trimmed))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3 key={`h3_${keyCounter++}`} className="text-lg sm:text-xl font-bold text-blue-300 mt-5 mb-2.5">
          {parseInlineText(cleanHeadingText(trimmed))}
        </h3>
      );
      i++;
      continue;
    }

    // 6. Inline Image parser blocks: ![caption](imageUrl)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const caption = imgMatch[1];
      const url = imgMatch[2];
      blocks.push(
        <div key={`image_${keyCounter++}`} className="my-6 space-y-2 text-center group select-none">
          <div className="relative inline-block overflow-hidden rounded-xl border border-slate-700 shadow-2xl bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption}
              className="max-h-[350px] w-auto max-w-full object-contain mx-auto transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
          {caption && <p className="text-xs text-slate-400 italic">“ {caption} ”</p>}
        </div>
      );
      i++;
      continue;
    }

    // 7. Grouped Lists & Checklists Parser
    const isBulletItem = (str: string) => str.startsWith('- ') || str.startsWith('* ');
    const isNumberedItem = (str: string) => /^\d+\.\s+/.test(str);
    const isChecklistItem = (str: string) =>
      str.startsWith('- [ ]') || str.startsWith('- [x]') || str.startsWith('- [X]') ||
      str.startsWith('□') || str.startsWith('✅') ||
      str.startsWith('[ ]') || str.startsWith('[x]') || str.startsWith('[X]');

    if (isChecklistItem(trimmed) || isBulletItem(trimmed) || isNumberedItem(trimmed)) {
      const listItems: { type: 'bullet' | 'numbered' | 'checklist'; checked?: boolean; text: string; originalLineIndex?: number }[] = [];
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (isChecklistItem(nextLine)) {
          let checked = false;
          let text = nextLine;
          if (nextLine.startsWith('- [x]') || nextLine.startsWith('- [X]')) {
            checked = true;
            text = nextLine.replace(/^- \[[xX]\]\s*/, '');
          } else if (nextLine.startsWith('- [ ]')) {
            checked = false;
            text = nextLine.replace(/^- \[[ ]\]\s*/, '');
          } else if (nextLine.startsWith('✅')) {
            checked = true;
            text = nextLine.replace(/^✅\s*/, '');
          } else if (nextLine.startsWith('□')) {
            checked = false;
            text = nextLine.replace(/^□\s*/, '');
          } else if (nextLine.startsWith('[x]') || nextLine.startsWith('[X]')) {
            checked = true;
            text = nextLine.replace(/^\[[xX]\]\s*/, '');
          } else if (nextLine.startsWith('[ ]')) {
            checked = false;
            text = nextLine.replace(/^\[[ ]\]\s*/, '');
          }
          listItems.push({
            type: 'checklist',
            checked,
            text,
            originalLineIndex: i,
          });
        } else if (isBulletItem(nextLine)) {
          listItems.push({
            type: 'bullet',
            text: nextLine.replace(/^[-\*]\s*/, ''),
          });
        } else if (isNumberedItem(nextLine)) {
          const match = nextLine.match(/^(\d+)\.\s*(.*)/);
          listItems.push({
            type: 'numbered',
            text: match ? match[2] : nextLine,
          });
        } else {
          break;
        }
        i++;
      }

      const renderedItems = listItems.map((item, idx) => {
        if (item.type === 'checklist') {
          return (
            <div key={`li_item_${idx}`} className="flex items-start gap-2.5 my-2 pl-1 select-none">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggleCheckbox?.(item.originalLineIndex!)}
                className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span
                onClick={() => onToggleCheckbox?.(item.originalLineIndex!)}
                className={`text-sm leading-relaxed cursor-pointer select-none ${item.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}
              >
                {parseInlineText(item.text)}
              </span>
            </div>
          );
        } else if (item.type === 'bullet') {
          return (
            <li key={`li_item_${idx}`} className="list-disc list-inside text-sm text-slate-200 ml-4 my-1.5 leading-relaxed pl-1">
              {parseInlineText(item.text)}
            </li>
          );
        } else {
          return (
            <li key={`li_item_${idx}`} className="list-decimal list-inside text-sm text-slate-200 ml-4 my-1.5 leading-relaxed pl-1">
              {parseInlineText(item.text)}
            </li>
          );
        }
      });

      if (listItems[0].type === 'checklist') {
        blocks.push(<div key={`checklist_group_${keyCounter++}`} className="space-y-1 my-3">{renderedItems}</div>);
      } else if (listItems[0].type === 'bullet') {
        blocks.push(<ul key={`bullet_group_${keyCounter++}`} className="space-y-0.5 my-3 pl-2">{renderedItems}</ul>);
      } else {
        blocks.push(<ol key={`numbered_group_${keyCounter++}`} className="space-y-0.5 my-3 pl-2">{renderedItems}</ol>);
      }
      continue;
    }

    // 8. Blockquotes: > quoteContent
    if (trimmed.startsWith('>')) {
      let quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={`quote_${keyCounter++}`} className="border-l-4 border-violet-500 bg-slate-900/40 px-4 py-3 my-4 rounded-r-xl text-slate-300 italic leading-relaxed text-sm">
          {parseInlineText(quoteLines.join('\n'))}
        </blockquote>
      );
      continue;
    }

    // 9. Standard paragraphs or empty spacing
    if (trimmed === '') {
      blocks.push(<div key={`space_${keyCounter++}`} className="h-4" />);
    } else {
      blocks.push(
        <p key={`p_${keyCounter++}`} className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans mb-3 text-justify pr-1">
          {parseInlineText(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-1">{blocks}</div>;
}
