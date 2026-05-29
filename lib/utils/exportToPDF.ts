/**
 * PDF Export Utility
 * Converts markdown content to professional PDF with proper styling and LaTeX math
 */

import katex from 'katex';
import {
  StructuredDocument,
  BlockElement,
  InlineElement,
  inlineElementsToText,
} from './markdownToStructured';

// PDF styling constants
const PDF_COLORS = {
  heading1: '#1e1b4b',
  heading2: '#4338ca',
  heading3: '#1d4ed8',
  text: '#1e293b',
  code_bg: '#f8fafc',
  code_text: '#0f172a',
  code_border: '#e2e8f0',
  quote_border: '#6366f1',
  quote_text: '#475569',
  quote_bg: '#f8fafc',
};

const PDF_SPACING = {
  page_margin: 15,
  line_height: 1.6,
};

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Convert inline elements to HTML string with styling
 */
function inlineElementsToHtml(elements: InlineElement[]): string {
  return elements
    .map((el) => {
      switch (el.type) {
        case 'text':
          return escapeHtml(el.content);
        case 'bold':
          return `<strong style="font-weight: 800; color: #0f172a;">${inlineElementsToHtml(el.children)}</strong>`;
        case 'italic':
          return `<em style="font-style: italic; color: #334155;">${inlineElementsToHtml(el.children)}</em>`;
        case 'underline':
          return `<span style="text-decoration: underline; text-underline-offset: 3px; decoration-color: #6366f1;">${inlineElementsToHtml(el.children)}</span>`;
        case 'code':
          return `<code style="background-color: #f1f5f9; color: #db2777; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 0.9em; border: 1px solid #e2e8f0; font-weight: 500;">${escapeHtml(el.content)}</code>`;
        case 'math_inline':
          try {
            const html = katex.renderToString(el.content, { displayMode: false, throwOnError: false });
            return `<span class="inline-math" style="color: #6b21a8; background-color: #f5f3ff; border: 1px solid #e9d5ff; padding: 1px 4px; border-radius: 4px; display: inline-block; vertical-align: middle; margin: 0 2px; font-size: 0.95em;">${html}</span>`;
          } catch (e) {
            return `<code style="color: #7e22ce; font-style: italic;">$${escapeHtml(el.content)}$</code>`;
          }
        case 'link':
          return `<a href="${escapeHtml(el.url)}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${escapeHtml(el.text)}</a>`;
        default:
          return '';
      }
    })
    .join('');
}

/**
 * Convert block elements to HTML string with styling
 */
function blockElementsToHtml(blocks: BlockElement[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const headingTag = `h${block.level}`;
          let headingStyle = '';
          if (block.level === 1) {
            headingStyle = `style="font-family: 'Outfit', sans-serif; font-size: 20pt; font-weight: 800; color: ${PDF_COLORS.heading1}; margin-top: 24pt; margin-bottom: 12pt; border-bottom: 2px solid ${PDF_COLORS.heading1}; padding-bottom: 6pt; break-after: avoid; page-break-after: avoid;"`;
          } else if (block.level === 2) {
            headingStyle = `style="font-family: 'Outfit', sans-serif; font-size: 15pt; font-weight: 700; color: ${PDF_COLORS.heading2}; margin-top: 18pt; margin-bottom: 10pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; break-after: avoid; page-break-after: avoid;"`;
          } else {
            headingStyle = `style="font-family: 'Outfit', sans-serif; font-size: 12pt; font-weight: 700; color: ${PDF_COLORS.heading3}; margin-top: 14pt; margin-bottom: 8pt; break-after: avoid; page-break-after: avoid;"`;
          }
          return `<${headingTag} ${headingStyle}>${inlineElementsToHtml(block.children)}</${headingTag}>`;
        }

        case 'paragraph':
          return `<p style="font-size: 10.5pt; line-height: ${PDF_SPACING.line_height}; color: ${PDF_COLORS.text}; margin-bottom: 10pt; text-align: justify;">${inlineElementsToHtml(block.children)}</p>`;

        case 'code_block':
          return `<div style="margin: 12pt 0; break-inside: avoid; page-break-inside: avoid;"><pre style="background-color: ${PDF_COLORS.code_bg}; border: 1px solid ${PDF_COLORS.code_border}; padding: 12pt; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 9pt; overflow-x: auto; line-height: 1.5;"><code style="color: ${PDF_COLORS.code_text};">${escapeHtml(block.content)}</code></pre></div>`;

        case 'math_block':
          try {
            const html = katex.renderToString(block.content, { displayMode: true, throwOnError: false });
            return `<div class="math-block" style="background-color: #f5f3ff; border: 1px solid #c084fc; padding: 14pt; border-radius: 8px; text-align: center; color: #6b21a8; margin: 14pt 0; overflow-x: auto; break-inside: avoid; page-break-inside: avoid;">${html}</div>`;
          } catch (e) {
            return `<div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 12pt; border-radius: 6px; text-align: center; font-family: monospace; color: #c53030; margin: 12pt 0; break-inside: avoid; page-break-inside: avoid;">${escapeHtml(block.content)}</div>`;
          }

        case 'blockquote':
          return `<blockquote style="border-left: 4px solid ${PDF_COLORS.quote_border}; background-color: ${PDF_COLORS.quote_bg}; padding: 10pt 0 10pt 14pt; color: ${PDF_COLORS.quote_text}; font-style: italic; margin: 14pt 0; border-radius: 0 8px 8px 0; break-inside: avoid; page-break-inside: avoid;">${blockElementsToHtml(block.children)}</blockquote>`;

        case 'bullet_list':
          return `<ul style="margin: 10pt 0; padding-left: 20pt; list-style-type: disc;">${block.items.map((item) => `<li style="margin: 5pt 0; font-size: 10.5pt; color: ${PDF_COLORS.text}; line-height: 1.5;">${inlineElementsToHtml(item)}</li>`).join('')}</ul>`;

        case 'numbered_list':
          return `<ol style="margin: 10pt 0; padding-left: 20pt; list-style-type: decimal;">${block.items.map((item) => `<li style="margin: 5pt 0; font-size: 10.5pt; color: ${PDF_COLORS.text}; line-height: 1.5;">${inlineElementsToHtml(item)}</li>`).join('')}</ol>`;

        case 'checklist':
          return `<div style="margin: 10pt 0; padding-left: 4pt; break-inside: avoid; page-break-inside: avoid;">${block.items.map((item) => `
            <div style="margin: 6pt 0; font-size: 10.5pt; display: flex; align-items: flex-start; gap: 8px;">
              <span style="font-family: Arial, sans-serif; font-size: 12pt; color: ${item.checked ? '#6366f1' : '#cbd5e1'}; font-weight: bold; line-height: 1; user-select: none;">${item.checked ? '☑' : '☐'}</span>
              <span style="color: ${item.checked ? '#94a3b8; text-decoration: line-through;' : PDF_COLORS.text}; line-height: 1.4;">${inlineElementsToHtml(item.children)}</span>
            </div>
          `).join('')}</div>`;

        case 'table':
          return `<div style="margin: 14pt 0; break-inside: avoid; page-break-inside: avoid; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; text-align: left; background: white;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid ${PDF_COLORS.heading2};">
                  ${block.headers.map((header) => `<th style="border: 1px solid #e2e8f0; padding: 8pt 10pt; font-weight: 700; color: ${PDF_COLORS.heading2}; font-family: 'Outfit', sans-serif;">${inlineElementsToHtml(header)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${block.rows
                  .map(
                    (row, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                    ${row.map((cell) => `<td style="border: 1px solid #e2e8f0; padding: 8pt 10pt; color: ${PDF_COLORS.text}; line-height: 1.4;">${inlineElementsToHtml(cell)}</td>`).join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>`;

        case 'image':
          return `<div style="text-align: center; margin: 18pt 0; break-inside: avoid; page-break-inside: avoid;">
            <img src="${escapeHtml(block.url)}" style="max-width: 100%; max-height: 380px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" alt="${escapeHtml(block.caption)}" />
            ${block.caption ? `<p style="font-size: 9pt; color: #64748b; margin-top: 6pt; font-style: italic; font-family: 'Plus Jakarta Sans', sans-serif;">“ ${escapeHtml(block.caption)} ”</p>` : ''}
          </div>`;

        case 'horizontal_rule':
          return `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20pt 0;" />`;

        default:
          return '';
      }
    })
    .join('');
}

/**
 * Generate professional PDF from structured document
 */
export async function generatePDFFromStructured(
  doc: StructuredDocument,
  fileName: string = 'export.pdf'
): Promise<void> {
  try {
    // Prevent title duplication if first block element is a Heading 1 matching the document title
    let finalContent = [...doc.content];
    if (finalContent.length > 0 && finalContent[0].type === 'heading' && finalContent[0].level === 1) {
      const headingText = inlineElementsToText(finalContent[0].children);
      const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (cleanString(headingText) === cleanString(doc.title)) {
        finalContent = finalContent.slice(1);
      }
    }

    // Create HTML wrapper with beautiful styling and responsive web fonts
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(doc.title)}</title>
          
          <!-- Modern Google Fonts -->
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
          
          <!-- Production-grade KaTeX stylesheet -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: ${PDF_SPACING.line_height};
              color: ${PDF_COLORS.text};
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pdf-container {
              padding: 0;
              max-width: 100%;
              background: white;
            }
            .pdf-header {
              margin-bottom: 24pt;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16pt;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pdf-title {
              font-family: 'Outfit', sans-serif;
              font-size: 26pt;
              font-weight: 800;
              color: ${PDF_COLORS.heading1};
              margin-bottom: 12pt;
              line-height: 1.25;
            }
            .pdf-metadata {
              font-size: 10pt;
              color: #64748b;
              display: flex;
              gap: 16pt;
              flex-wrap: wrap;
            }
            .pdf-metadata span {
              display: inline-flex;
              align-items: center;
            }
            .pdf-content {
              margin-top: 16pt;
            }
            .pdf-summary {
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              padding: 14pt;
              margin-top: 24pt;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pdf-summary h3 {
              color: #166534;
              font-family: 'Outfit', sans-serif;
              font-size: 12pt;
              font-weight: 700;
              margin-bottom: 6pt;
            }
            .pdf-summary p {
              font-size: 10pt;
              color: #14532d;
              line-height: 1.55;
            }
            .pdf-footer {
              margin-top: 40pt;
              padding-top: 14pt;
              border-top: 1px solid #e2e8f0;
              font-size: 8.5pt;
              color: #94a3b8;
              text-align: center;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            /* Defensive Page Break Rules */
            @page {
              size: A4;
              margin: 20mm 15mm 20mm 15mm;
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
            pre, blockquote, table, img, .math-block, .pdf-summary, .inline-math {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            @media print {
              body {
                background: white;
                color: ${PDF_COLORS.text};
              }
              .pdf-container {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="pdf-header">
              <h1 class="pdf-title">${escapeHtml(doc.title)}</h1>
              <div class="pdf-metadata">
                ${doc.metadata?.category ? `<span><strong style="color: #334155; margin-right: 4px;">Kategori:</strong> ${escapeHtml(doc.metadata.category)}</span>` : ''}
                ${doc.metadata?.createdAt ? `<span><strong style="color: #334155; margin-right: 4px;">Dibuat:</strong> ${new Date(doc.metadata.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>` : ''}
                ${doc.metadata?.author ? `<span><strong style="color: #334155; margin-right: 4px;">Penulis:</strong> ${escapeHtml(doc.metadata.author)}</span>` : ''}
              </div>
            </div>
            
            <div class="pdf-content">
              ${blockElementsToHtml(finalContent)}
            </div>
            
            ${doc.summary ? `
              <div class="pdf-summary">
                <h3>💡 Ringkasan AI</h3>
                <p>${escapeHtml(doc.summary).replace(/\n/g, '<br>')}</p>
              </div>
            ` : ''}
            
            <div class="pdf-footer">
              <p>Dicetak dari Focus OS &middot; ${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Initialize hidden printing iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Gagal mengakses iframe pencetakan.');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Give browser sufficient time to fetch remote web fonts, CDN styles, and images
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Focus and fire system print dialog
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Graceful garbage collection
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Gagal mencetak PDF. Silakan coba lagi.');
  }
}

/**
 * Export markdown to PDF directly
 */
export async function exportMarkdownToPDF(
  markdown: string,
  title: string,
  fileName?: string,
  metadata?: {
    category?: string;
    createdAt?: Date;
    author?: string;
  },
  summary?: string
): Promise<void> {
  const { markdownToStructuredDocument } = await import('./markdownToStructured');
  const doc = markdownToStructuredDocument(markdown, title, metadata, summary);
  await generatePDFFromStructured(doc, fileName || `${title.replace(/\s+/g, '_')}.pdf`);
}
