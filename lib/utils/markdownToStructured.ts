/**
 * Markdown to Structured Format Converter
 * Converts markdown content into a structured format suitable for export
 * This intermediate format is then converted to PDF/DOCX with proper styling
 */

export type InlineElement = 
  | { type: 'text'; content: string }
  | { type: 'bold'; children: InlineElement[] }
  | { type: 'italic'; children: InlineElement[] }
  | { type: 'underline'; children: InlineElement[] }
  | { type: 'code'; content: string }
  | { type: 'math_inline'; content: string }
  | { type: 'link'; text: string; url: string };

export type BlockElement =
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineElement[] }
  | { type: 'paragraph'; children: InlineElement[] }
  | { type: 'code_block'; language: string; content: string }
  | { type: 'math_block'; content: string }
  | { type: 'blockquote'; children: BlockElement[] }
  | { type: 'bullet_list'; items: InlineElement[][] }
  | { type: 'numbered_list'; items: InlineElement[][] }
  | { type: 'checklist'; items: Array<{ checked: boolean; children: InlineElement[] }> }
  | { type: 'table'; headers: InlineElement[][]; rows: InlineElement[][][] }
  | { type: 'image'; url: string; caption: string }
  | { type: 'horizontal_rule' };

export interface StructuredDocument {
  title: string;
  metadata?: {
    category?: string;
    createdAt?: Date;
    author?: string;
  };
  content: BlockElement[];
  summary?: string;
}

/**
 * Parse inline text with markdown formatting
 */
export function parseInlineMarkdown(text: string): InlineElement[] {
  if (!text) return [];

  const elements: InlineElement[] = [];
  let i = 0;

  while (i < text.length) {
    // Inline Math: $...$ (but not $$)
    if (text[i] === '$' && text[i + 1] !== '$') {
      const endIdx = text.indexOf('$', i + 1);
      if (endIdx !== -1) {
        elements.push({
          type: 'math_inline',
          content: text.substring(i + 1, endIdx)
        });
        i = endIdx + 1;
        continue;
      }
    }

    // Bold: **...**
    if (text.startsWith('**', i)) {
      const endIdx = text.indexOf('**', i + 2);
      if (endIdx !== -1) {
        elements.push({
          type: 'bold',
          children: parseInlineMarkdown(text.substring(i + 2, endIdx))
        });
        i = endIdx + 2;
        continue;
      }
    }

    // Italic: *...* (single asterisk)
    if (text[i] === '*' && !text.startsWith('**', i)) {
      const endIdx = text.indexOf('*', i + 1);
      if (endIdx !== -1 && !text.startsWith('**', endIdx)) {
        elements.push({
          type: 'italic',
          children: parseInlineMarkdown(text.substring(i + 1, endIdx))
        });
        i = endIdx + 1;
        continue;
      }
    }

    // Underline: <u>...</u>
    if (text.toLowerCase().startsWith('<u>', i)) {
      const endIdx = text.toLowerCase().indexOf('</u>', i + 3);
      if (endIdx !== -1) {
        elements.push({
          type: 'underline',
          children: parseInlineMarkdown(text.substring(i + 3, endIdx))
        });
        i = endIdx + 4;
        continue;
      }
    }

    // Inline Code: `...`
    if (text[i] === '`') {
      const endIdx = text.indexOf('`', i + 1);
      if (endIdx !== -1) {
        elements.push({
          type: 'code',
          content: text.substring(i + 1, endIdx)
        });
        i = endIdx + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (text[i] === '[') {
      const closeIdx = text.indexOf(']', i + 1);
      if (closeIdx !== -1 && text[closeIdx + 1] === '(') {
        const parenCloseIdx = text.indexOf(')', closeIdx + 2);
        if (parenCloseIdx !== -1) {
          elements.push({
            type: 'link',
            text: text.substring(i + 1, closeIdx),
            url: text.substring(closeIdx + 2, parenCloseIdx)
          });
          i = parenCloseIdx + 1;
          continue;
        }
      }
    }

    // Plain text until next marker
    let nextMarker = text.length;
    const markers = ['$', '*', '<', '`', '['];
    for (const marker of markers) {
      const idx = text.indexOf(marker, i + 1);
      if (idx !== -1 && idx < nextMarker) {
        nextMarker = idx;
      }
    }

    const plainText = text.substring(i, nextMarker);
    if (plainText) {
      elements.push({ type: 'text', content: plainText });
    }
    i = nextMarker;
  }

  return elements;
}

/**
 * Parse block-level markdown to structured format
 */
export function parseMarkdownToStructured(markdown: string): BlockElement[] {
  const lines = markdown.split('\n');
  const blocks: BlockElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading: # ## ###
    if (trimmed.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        level: 1,
        children: parseInlineMarkdown(trimmed.substring(2))
      });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        level: 2,
        children: parseInlineMarkdown(trimmed.substring(3))
      });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        level: 3,
        children: parseInlineMarkdown(trimmed.substring(4))
      });
      i++;
      continue;
    }

    // Code Block: ```...```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.substring(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code_block',
        language: lang || 'text',
        content: codeLines.join('\n')
      });
      i++;
      continue;
    }

    // Math Block: $$...$$
    if (trimmed.startsWith('$$')) {
      let mathContent = '';
      if (trimmed.endsWith('$$') && trimmed.length > 4) {
        mathContent = trimmed.substring(2, trimmed.length - 2);
      } else {
        const mathLines: string[] = [];
        mathLines.push(trimmed.substring(2));
        i++;
        while (i < lines.length && !lines[i].trim().includes('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          const endLine = lines[i];
          mathLines.push(endLine.substring(0, endLine.indexOf('$$')));
        }
        mathContent = mathLines.join('\n').trim();
      }
      blocks.push({
        type: 'math_block',
        content: mathContent
      });
      i++;
      continue;
    }

    // Horizontal Rule: ---, ***, ___
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'horizontal_rule' });
      i++;
      continue;
    }

    // Image: ![caption](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        caption: imgMatch[1],
        url: imgMatch[2]
      });
      i++;
      continue;
    }

    // Table: |...|...|
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .map((cell) => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((cell) => parseInlineMarkdown(cell));

        const headers = parseRow(tableLines[0]);
        const hasSeparator = tableLines[1]?.includes('---');
        const rows = tableLines
          .slice(hasSeparator ? 2 : 1)
          .map(parseRow);

        blocks.push({
          type: 'table',
          headers,
          rows
        });
      }
      continue;
    }

    // Checklist: - [ ] or - [x] or [ ] or [x] or □ or ✅
    const isStructuredChecklist = (str: string) =>
      str.startsWith('- [ ]') || str.startsWith('- [x]') || str.startsWith('- [X]') ||
      str.startsWith('□') || str.startsWith('✅') ||
      str.startsWith('[ ]') || str.startsWith('[x]') || str.startsWith('[X]');

    if (isStructuredChecklist(trimmed)) {
      const checklistItems: Array<{ checked: boolean; children: InlineElement[] }> = [];
      while (i < lines.length && isStructuredChecklist(lines[i].trim())) {
        const itemTrimmed = lines[i].trim();
        let checked = false;
        let text = itemTrimmed;
        
        if (itemTrimmed.startsWith('- [x]') || itemTrimmed.startsWith('- [X]')) {
          checked = true;
          text = itemTrimmed.replace(/^- \[[xX]\]\s*/, '');
        } else if (itemTrimmed.startsWith('- [ ]')) {
          checked = false;
          text = itemTrimmed.replace(/^- \[[ ]\]\s*/, '');
        } else if (itemTrimmed.startsWith('✅')) {
          checked = true;
          text = itemTrimmed.replace(/^✅\s*/, '');
        } else if (itemTrimmed.startsWith('□')) {
          checked = false;
          text = itemTrimmed.replace(/^□\s*/, '');
        } else if (itemTrimmed.startsWith('[x]') || itemTrimmed.startsWith('[X]')) {
          checked = true;
          text = itemTrimmed.replace(/^\[[xX]\]\s*/, '');
        } else if (itemTrimmed.startsWith('[ ]')) {
          checked = false;
          text = itemTrimmed.replace(/^\[[ ]\]\s*/, '');
        }
        checklistItems.push({
          checked,
          children: parseInlineMarkdown(text)
        });
        i++;
      }
      blocks.push({ type: 'checklist', items: checklistItems });
      continue;
    }

    // Bullet List: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: InlineElement[][] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        const text = lines[i].trim().substring(2);
        listItems.push(parseInlineMarkdown(text));
        i++;
      }
      blocks.push({ type: 'bullet_list', items: listItems });
      continue;
    }

    // Numbered List: 1. 2. etc
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: InlineElement[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^\d+\.\s+(.*)/);
        const text = match ? match[1] : '';
        listItems.push(parseInlineMarkdown(text));
        i++;
      }
      blocks.push({ type: 'numbered_list', items: listItems });
      continue;
    }

    // Blockquote: >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().substring(1).trim());
        i++;
      }
      const quoteContent = quoteLines.join('\n');
      blocks.push({
        type: 'blockquote',
        children: parseMarkdownToStructured(quoteContent)
      });
      continue;
    }

    // Paragraph (default)
    blocks.push({
      type: 'paragraph',
      children: parseInlineMarkdown(line)
    });
    i++;
  }

  return blocks;
}

/**
 * Convert markdown content to structured document
 */
export function markdownToStructuredDocument(
  markdown: string,
  title: string,
  metadata?: StructuredDocument['metadata'],
  summary?: string
): StructuredDocument {
  return {
    title,
    metadata,
    content: parseMarkdownToStructured(markdown),
    summary
  };
}

/**
 * Serialize inline elements to plain text (for table of contents, etc)
 */
export function inlineElementsToText(elements: InlineElement[]): string {
  return elements
    .map((el) => {
      if (el.type === 'text') return el.content;
      if (el.type === 'math_inline') return el.content;
      if (el.type === 'code') return el.content;
      if (el.type === 'link') return el.text;
      if ('children' in el) return inlineElementsToText(el.children);
      return '';
    })
    .join('');
}
