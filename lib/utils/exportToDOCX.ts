/**
 * DOCX Export Utility
 * Converts markdown content to native Word document with premium styling and embedded resources
 */

import {
  Document,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  BorderStyle,
  WidthType,
  convertInchesToTwip,
  Packer,
  ImageRun,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  StructuredDocument,
  BlockElement,
  InlineElement,
  inlineElementsToText,
} from './markdownToStructured';

// DOCX styling constants
const DOCX_COLORS = {
  heading1: '1e1b4b',
  heading2: '4338ca',
  heading3: '1d4ed8',
  text: '1e293b',
  code_bg: 'f8fafc',
  code_text: '0f172a',
  code_border: 'cbd5e1',
  quote_border: '6366f1',
  quote_text: '475569',
};

const DOCX_SIZES = {
  heading1: 24,
  heading2: 18,
  heading3: 14,
  paragraph: 11,
  code: 9.5,
};

/**
 * Robust LaTeX-to-Unicode Mathematical Text Converter
 */
function cleanLatexToMathText(latex: string): string {
  if (!latex) return '';
  let text = latex;

  // Replace \frac{a}{b} -> (a)/(b)
  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)');
  text = text.replace(/\\frac\s*([a-zA-Z0-9])\s*([a-zA-Z0-9])/g, '$1/$2');

  // Replace power and subscripts curly braces, e.g. ^{2} -> ^2
  text = text.replace(/\^\{([^{}]+)\}/g, '^$1');
  text = text.replace(/_\{([^{}]+)\}/g, '_$1');

  // Mathematical LaTeX constants and symbols
  const macros: { [key: string]: string } = {
    '\\int': '∫',
    '\\sum': '∑',
    '\\sqrt': '√',
    '\\partial': '∂',
    '\\nabla': '∇',
    '\\pm': '±',
    '\\times': '×',
    '\\div': '÷',
    '\\le': '≤',
    '\\ge': '≥',
    '\\ne': '≠',
    '\\approx': '≈',
    '\\to': '→',
    '\\rightarrow': '→',
    '\\infty': '∞',
    '\\pi': 'π',
    '\\theta': 'θ',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\lambda': 'λ',
    '\\sigma': 'σ',
    '\\delta': 'δ',
    '\\Delta': 'Δ',
    '\\cdot': '·',
    '\\quad': '  ',
    '\\qquad': '    ',
  };

  // Replace mathematical macros
  Object.keys(macros).forEach((macro) => {
    const escapedMacro = macro.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    text = text.replace(new RegExp(escapedMacro, 'g'), macros[macro]);
  });

  // Strip remaining formatting braces
  text = text.replace(/\{([^{}]+)\}/g, '$1');

  // Unicode subscripts
  const subscripts: { [key: string]: string } = {
    '_0': '₀', '_1': '₁', '_2': '₂', '_3': '₃', '_4': '₄',
    '_5': '₅', '_6': '₆', '_7': '₇', '_8': '₈', '_9': '₉',
    '_a': 'ₐ', '_e': 'ₑ', '_i': 'ᵢ', '_o': 'ₒ', '_x': 'ₓ',
    '_n': 'ₙ', '_m': 'ₘ', '_p': 'ₚ', '_k': 'ₖ', '_t': 'ₜ'
  };
  Object.keys(subscripts).forEach((sub) => {
    text = text.replace(new RegExp(sub, 'g'), subscripts[sub]);
  });

  // Unicode superscripts
  const superscripts: { [key: string]: string } = {
    '^0': '⁰', '^1': '¹', '^2': '²', '^3': '³', '^4': '⁴',
    '^5': '⁵', '^6': '⁶', '^7': '⁷', '^8': '⁸', '^9': '⁹',
    '^a': 'ᵃ', '^b': 'ᵇ', '^c': 'ᶜ', '^d': 'ᵈ', '^e': 'ᵉ',
    '^f': 'ᶠ', '^g': 'ᵍ', '^h': 'ʰ', '^i': 'ⁱ', '^j': 'ʲ',
    '^k': 'ᵏ', '^l': 'ˡ', '^m': 'ᵐ', '^n': 'ⁿ', '^o': 'ᵒ',
    '^p': 'ᵖ', '^r': 'ʳ', '^s': 'ˢ', '^t': 'ᵗ', '^u': 'ᵘ',
    '^v': 'ᵛ', '^w': 'ʷ', '^x': 'ˣ', '^y': 'ʸ', '^z': 'ᶻ',
    '^+': '⁺', '^-': '⁻', '^=': '⁼', '^(': '⁽', '^)': '⁾'
  };
  Object.keys(superscripts).forEach((sup) => {
    text = text.replace(new RegExp('\\' + sup, 'g'), superscripts[sup]);
  });

  return text.trim();
}

/**
 * Fetch remote image as Uint8Array (wrapped with CORS safeguard)
 */
async function fetchImageAsUint8Array(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('Error fetching remote image for Word document:', e);
    return null;
  }
}

/**
 * Read image natural dimensions asynchronously
 */
async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 350, height: 220 }); // Fallback dimensions
    };
    img.src = url;
  });
}

/**
 * Convert inline elements to docx TextRun array
 */
function inlineElementsToRuns(
  elements: InlineElement[],
  baseBold = false,
  baseItalic = false,
  baseUnderline = false,
  baseStrike = false,
  baseColor?: string,
  baseSize?: number
): TextRun[] {
  const runs: TextRun[] = [];

  elements.forEach((el) => {
    switch (el.type) {
      case 'text':
        runs.push(
          new TextRun({
            text: el.content,
            bold: baseBold,
            italics: baseItalic,
            underline: baseUnderline ? { type: UnderlineType.SINGLE } : undefined,
            color: baseStrike ? '94a3b8' : (baseColor || DOCX_COLORS.text),
            size: baseSize || (DOCX_SIZES.paragraph * 2),
            strike: baseStrike || undefined,
          })
        );
        break;

      case 'bold':
        runs.push(...inlineElementsToRuns(el.children, true, baseItalic, baseUnderline, baseStrike, baseColor, baseSize));
        break;

      case 'italic':
        runs.push(...inlineElementsToRuns(el.children, baseBold, true, baseUnderline, baseStrike, baseColor, baseSize));
        break;

      case 'underline':
        runs.push(...inlineElementsToRuns(el.children, baseBold, baseItalic, true, baseStrike, baseColor, baseSize));
        break;

      case 'code':
        runs.push(
          new TextRun({
            text: el.content,
            font: 'Courier New',
            color: baseStrike ? '94a3b8' : 'db2777', // Modern pinkish code text color
            size: (baseSize ? (baseSize * 0.85) : DOCX_SIZES.code) * 2,
            highlight: baseStrike ? undefined : 'lightGray',
            bold: true,
            strike: baseStrike || undefined,
          })
        );
        break;

      case 'math_inline':
        runs.push(
          new TextRun({
            text: ` ${cleanLatexToMathText(el.content)} `,
            font: 'Cambria Math',
            italics: true,
            color: baseStrike ? '94a3b8' : '6b21a8',
            size: (baseSize || DOCX_SIZES.paragraph) * 2,
            bold: baseBold,
            strike: baseStrike || undefined,
          })
        );
        break;

      case 'link':
        runs.push(
          new TextRun({
            text: el.text,
            color: baseStrike ? '94a3b8' : '2563eb',
            underline: baseStrike ? undefined : { type: UnderlineType.SINGLE },
            size: (baseSize || DOCX_SIZES.paragraph) * 2,
            bold: true,
            strike: baseStrike || undefined,
          })
        );
        break;

      default:
        break;
    }
  });

  return runs;
}

/**
 * Helper to identify and strip callout tags recursively from inline elements
 */
function findAndStripCalloutTag(elements: InlineElement[]): { tag: string | null; cleaned: InlineElement[] } {
  if (elements.length === 0) return { tag: null, cleaned: elements };

  const first = elements[0];
  if (first.type === 'text') {
    const match = first.content.match(/^\[!(NOTE|INFO|TIP|SUCCESS|WARNING|CAUTION|DANGER|BUG)\]/i);
    if (match) {
      const tag = match[1].toUpperCase();
      const strippedText = first.content.substring(match[0].length).replace(/^\s+/, '');
      const cleaned = [...elements];
      if (strippedText === '') {
        cleaned.shift();
      } else {
        cleaned[0] = { ...first, content: strippedText };
      }
      return { tag, cleaned };
    }
  } else if ((first.type === 'bold' || first.type === 'italic' || first.type === 'underline') && first.children) {
    const res = findAndStripCalloutTag(first.children);
    if (res.tag) {
      const cleaned = [...elements];
      if (res.cleaned.length === 0) {
        cleaned.shift();
      } else {
        cleaned[0] = { ...first, children: res.cleaned } as any;
      }
      return { tag: res.tag, cleaned };
    }
  }

  return { tag: null, cleaned: elements };
}

/**
 * Identify callout blocks inside a blockquote and strip their raw tags.
 */
function detectAndStripCallout(block: BlockElement): { tag: string | null; cleanedBlocks: BlockElement[] } {
  if (block.type !== 'blockquote') {
    return { tag: null, cleanedBlocks: [] };
  }

  if (block.children.length === 0) {
    return { tag: null, cleanedBlocks: [] };
  }

  const firstBlock = block.children[0];
  if (firstBlock.type !== 'paragraph' || !firstBlock.children || firstBlock.children.length === 0) {
    return { tag: null, cleanedBlocks: block.children };
  }

  const res = findAndStripCalloutTag(firstBlock.children);
  if (!res.tag) {
    return { tag: null, cleanedBlocks: block.children };
  }

  const cleanedChildren = [...block.children];
  const cleanedFirstBlock = { ...firstBlock, children: res.cleaned };

  if (cleanedFirstBlock.children.length === 0) {
    cleanedChildren.shift();
  } else {
    cleanedChildren[0] = cleanedFirstBlock;
  }

  return { tag: res.tag, cleanedBlocks: cleanedChildren };
}

/**
 * Convert block elements to docx Paragraph/Table array asynchronously
 */
async function blockElementsToParagraphs(blocks: BlockElement[], inQuote = false): Promise<Array<Paragraph | Table>> {
  const paragraphs: Array<Paragraph | Table> = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const level = block.level as 1 | 2 | 3;
        const headingLevels = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
        };
        const colors = {
          1: DOCX_COLORS.heading1,
          2: DOCX_COLORS.heading2,
          3: DOCX_COLORS.heading3,
        };
        const sizes = {
          1: DOCX_SIZES.heading1,
          2: DOCX_SIZES.heading2,
          3: DOCX_SIZES.heading3,
        };

        paragraphs.push(
          new Paragraph({
            heading: headingLevels[level],
            alignment: AlignmentType.LEFT,
            spacing: {
              before: level === 1 ? (inQuote ? 140 : 280) : level === 2 ? 200 : 140,
              after: level === 1 ? 140 : level === 2 ? 100 : 80,
            },
            children: inlineElementsToRuns(
              block.children,
              true, // baseBold
              false,
              false,
              false,
              inQuote ? '475569' : colors[level],
              sizes[level] * 2 // baseSize
            ),
            border: !inQuote && level === 1 ? {
              bottom: { color: colors[level], space: 2, style: BorderStyle.SINGLE, size: 18 }
            } : undefined,
          })
        );
        break;
      }

      case 'paragraph':
        paragraphs.push(
          new Paragraph({
            children: inlineElementsToRuns(block.children, false, inQuote, false, false, inQuote ? DOCX_COLORS.quote_text : undefined),
            alignment: AlignmentType.JUSTIFIED,
            spacing: inQuote ? { before: 120, after: 120, line: 360 } : { after: 120, line: 360 },
          })
        );
        break;

      case 'code_block':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.language ? `📁 CODE [${block.language.toUpperCase()}]` : '📁 CODE',
                bold: true,
                color: '475569',
                size: (DOCX_SIZES.code - 1) * 2,
              })
            ],
            spacing: { before: 140, after: 60 },
          })
        );
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.content,
                font: 'Courier New',
                color: DOCX_COLORS.code_text,
                size: DOCX_SIZES.code * 2,
              })
            ],
            spacing: { before: 120, after: 120 },
            indent: { left: 120, right: 120 },
            border: {
              top: { color: DOCX_COLORS.code_border, space: 4, style: BorderStyle.SINGLE, size: 6 },
              bottom: { color: DOCX_COLORS.code_border, space: 4, style: BorderStyle.SINGLE, size: 6 },
              left: { color: DOCX_COLORS.code_border, space: 4, style: BorderStyle.SINGLE, size: 6 },
              right: { color: DOCX_COLORS.code_border, space: 4, style: BorderStyle.SINGLE, size: 6 },
            },
          })
        );
        break;

      case 'math_block':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanLatexToMathText(block.content),
                font: 'Cambria Math',
                color: '6b21a8',
                size: 12.5 * 2,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 140 },
            border: {
              top: { color: 'c084fc', space: 6, style: BorderStyle.SINGLE, size: 8 },
              bottom: { color: 'c084fc', space: 6, style: BorderStyle.SINGLE, size: 8 },
              left: { color: 'c084fc', space: 6, style: BorderStyle.SINGLE, size: 8 },
              right: { color: 'c084fc', space: 6, style: BorderStyle.SINGLE, size: 8 },
            },
          })
        );
        break;

      case 'blockquote': {
        const { tag, cleanedBlocks } = detectAndStripCallout(block);
        
        let color = '6366f1'; // default indigo
        let bg = 'f8fafc';    // light slate
        let title = '';
        let icon = '';

        if (tag === 'NOTE' || tag === 'INFO') {
          color = '3b82f6';
          bg = 'f0f9ff';
          title = tag === 'NOTE' ? 'CATATAN' : 'INFO';
          icon = '💡';
        } else if (tag === 'TIP' || tag === 'SUCCESS') {
          color = '10b981';
          bg = 'f0fdf4';
          title = tag === 'TIP' ? 'TIPS' : 'SUKSES';
          icon = '✨';
        } else if (tag === 'WARNING' || tag === 'CAUTION') {
          color = 'f59e0b';
          bg = 'fffbeb';
          title = tag === 'WARNING' ? 'PERINGATAN' : 'PERHATIAN';
          icon = '⚠️';
        } else if (tag === 'DANGER' || tag === 'BUG') {
          color = 'ef4444';
          bg = 'fef2f2';
          title = tag === 'DANGER' ? 'BAHAYA' : 'BUG';
          icon = '🚫';
        }

        const cellChildren: Array<Paragraph | Table> = [];
        
        if (title) {
          cellChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${icon} ${title}`,
                  bold: true,
                  color: color,
                  size: DOCX_SIZES.paragraph * 2,
                })
              ],
              spacing: { before: 80, after: 120 },
            })
          );
        }

        const childParas = await blockElementsToParagraphs(cleanedBlocks, true);
        cellChildren.push(...childParas);

        paragraphs.push(
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: cellChildren,
                    shading: { type: ShadingType.CLEAR, fill: bg },
                    borders: {
                      left: { color: color, style: BorderStyle.SINGLE, size: 24 },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: {
                      top: 140,
                      bottom: 140,
                      left: 180,
                      right: 180,
                    },
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          })
        );
        break;
      }

      case 'bullet_list':
        block.items.forEach((item) => {
          paragraphs.push(
            new Paragraph({
              children: inlineElementsToRuns(item, false, false, false, false, inQuote ? DOCX_COLORS.quote_text : undefined),
              style: 'ListBullet',
              alignment: AlignmentType.LEFT,
              spacing: { after: 60, line: 300 },
            })
          );
        });
        break;

      case 'numbered_list':
        block.items.forEach((item) => {
          paragraphs.push(
            new Paragraph({
              children: inlineElementsToRuns(item, false, false, false, false, inQuote ? DOCX_COLORS.quote_text : undefined),
              style: 'ListNumber',
              alignment: AlignmentType.LEFT,
              spacing: { after: 60, line: 300 },
            })
          );
        });
        break;

      case 'checklist':
        block.items.forEach((item) => {
          const itemRuns = inlineElementsToRuns(item.children, false, false, false, item.checked, inQuote ? DOCX_COLORS.quote_text : undefined);
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.checked ? '☑  ' : '☐  ',
                  bold: true,
                  font: 'Arial',
                  color: item.checked ? '6366f1' : 'cbd5e1',
                  size: DOCX_SIZES.paragraph * 2,
                }),
                ...itemRuns
              ],
              spacing: { after: 60, line: 300 },
              indent: { left: 240 },
            })
          );
        });
        break;

      case 'table': {
        const rows = [
          new TableRow({
            children: block.headers.map(
              (header) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        ...inlineElementsToRuns(header).map(run => new TextRun({...run, bold: true, color: DOCX_COLORS.heading2}))
                      ],
                    }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                  margins: { top: 120, bottom: 120, left: 120, right: 120 },
                })
            ),
            height: { value: 420, rule: 'atLeast' },
          }),
          ...block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell, idx) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: inlineElementsToRuns(cell),
                        }),
                      ],
                      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? 'ffffff' : 'f8fafc' },
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    })
                ),
              })
          ),
        ];

        paragraphs.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { color: 'cbd5e1', space: 1, style: BorderStyle.SINGLE, size: 6 },
              bottom: { color: 'cbd5e1', space: 1, style: BorderStyle.SINGLE, size: 6 },
              left: { color: 'cbd5e1', space: 1, style: BorderStyle.SINGLE, size: 6 },
              right: { color: 'cbd5e1', space: 1, style: BorderStyle.SINGLE, size: 6 },
              insideHorizontal: { color: 'e2e8f0', space: 1, style: BorderStyle.SINGLE, size: 6 },
              insideVertical: { color: 'e2e8f0', space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
          })
        );
        break;
      }

      case 'image': {
        let imageData: Uint8Array | null = null;
        const isBase64 = block.url.startsWith('data:');

        if (isBase64) {
          try {
            const matches = block.url.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const base64Data = matches[2];
              const binaryString = atob(base64Data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let idx = 0; idx < len; idx++) {
                bytes[idx] = binaryString.charCodeAt(idx);
              }
              imageData = bytes;
            }
          } catch (e) {
            console.error('Error decoding base64 image data for Word:', e);
          }
        } else {
          imageData = await fetchImageAsUint8Array(block.url);
        }

        if (imageData) {
          try {
            let width = 360;
            let height = 220;
            const dims = await getImageDimensions(block.url).catch(() => ({ width: 360, height: 220 }));
            const maxWidth = 480;
            
            if (dims.width > maxWidth) {
              width = maxWidth;
              height = Math.round((dims.height * maxWidth) / dims.width);
            } else {
              width = dims.width;
              height = dims.height;
            }

            let imageType: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg' = 'png';
            if (isBase64) {
              const typeMatch = block.url.match(/^data:image\/([a-zA-Z+]+);base64,/);
              if (typeMatch && ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(typeMatch[1].toLowerCase())) {
                const rawType = typeMatch[1].toLowerCase();
                imageType = (rawType === 'jpeg' ? 'jpg' : rawType) as any;
              }
            } else {
              const extMatch = block.url.match(/\.(png|jpg|jpeg|gif|bmp|svg)(?:\?|$)/i);
              if (extMatch) {
                const rawType = extMatch[1].toLowerCase();
                imageType = (rawType === 'jpeg' ? 'jpg' : rawType) as any;
              }
            }

            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageData,
                    transformation: {
                      width,
                      height,
                    },
                    type: imageType,
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 140, after: 60 },
              })
            );

            if (block.caption) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `“ ${block.caption} ”`,
                      italics: true,
                      color: '64748b',
                      size: 9.5 * 2,
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 140 },
                })
              );
            }
          } catch (e) {
            console.error('Error building docx ImageRun:', e);
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Gambar: ${block.caption || 'Tanpa Judul'}] (${block.url})`,
                    italics: true,
                    color: '64748b',
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 100 },
              })
            );
          }
        } else {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Gambar: ${block.caption || 'Tanpa Judul'}]`,
                  italics: true,
                  color: '64748b',
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
            })
          );
        }
        break;
      }

      case 'horizontal_rule':
        paragraphs.push(
          new Paragraph({
            border: {
              bottom: { color: 'cbd5e1', space: 2, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { before: 140, after: 140 },
          })
        );
        break;

      default:
        break;
    }
  }

  return paragraphs;
}

/**
 * Generate native DOCX from structured document
 */
export async function generateDocxFromStructured(
  doc: StructuredDocument,
  fileName: string = 'export.docx'
): Promise<void> {
  try {
    const metadataParagraphs = [];

    if (doc.metadata?.category || doc.metadata?.createdAt || doc.metadata?.author) {
      const metaRuns: TextRun[] = [];
      
      if (doc.metadata?.category) {
        metaRuns.push(
          new TextRun({
            text: 'Kategori: ',
            bold: true,
            color: '475569',
            size: 9.5 * 2,
          }),
          new TextRun({
            text: doc.metadata.category,
            color: DOCX_COLORS.quote_text,
            size: 9.5 * 2,
          })
        );
      }

      if (doc.metadata?.createdAt) {
        if (metaRuns.length > 0) {
          metaRuns.push(new TextRun({ text: '  •  ', color: '94a3b8', size: 9.5 * 2 }));
        }
        metaRuns.push(
          new TextRun({
            text: 'Dibuat: ',
            bold: true,
            color: '475569',
            size: 9.5 * 2,
          }),
          new TextRun({
            text: new Date(doc.metadata.createdAt).toLocaleDateString('id-ID', {
              dateStyle: 'long',
            }),
            color: DOCX_COLORS.quote_text,
            size: 9.5 * 2,
          })
        );
      }

      if (doc.metadata?.author) {
        if (metaRuns.length > 0) {
          metaRuns.push(new TextRun({ text: '  •  ', color: '94a3b8', size: 9.5 * 2 }));
        }
        metaRuns.push(
          new TextRun({
            text: 'Penulis: ',
            bold: true,
            color: '475569',
            size: 9.5 * 2,
          }),
          new TextRun({
            text: doc.metadata.author,
            color: DOCX_COLORS.quote_text,
            size: 9.5 * 2,
          })
        );
      }

      metadataParagraphs.push(
        new Paragraph({
          children: metaRuns,
          spacing: { after: 180 },
        })
      );
    }

    // Prevent title duplication if first block element is a Heading 1 matching the document title
    let finalContent = [...doc.content];
    if (finalContent.length > 0 && finalContent[0].type === 'heading' && finalContent[0].level === 1) {
      const headingText = inlineElementsToText(finalContent[0].children);
      const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (cleanString(headingText) === cleanString(doc.title)) {
        finalContent = finalContent.slice(1);
      }
    }

    // Create content paragraphs asynchronously
    const contentParagraphs = await blockElementsToParagraphs(finalContent);

    // Create summary if available
    const summaryParagraphs = [];
    if (doc.summary) {
      summaryParagraphs.push(
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: '💡 Ringkasan AI',
              bold: true,
              color: '166534',
              size: DOCX_SIZES.heading3 * 2,
            })
          ],
          spacing: { before: 240, after: 100 },
        }),
        new Paragraph({
          text: doc.summary,
          spacing: { after: 100, line: 320 },
        })
      );
    }

    // Create footer paragraph
    const footerParagraph = new Paragraph({
      children: [
        new TextRun({
          text: `Dicetak dari Focus OS • ${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`,
          size: 8.5 * 2,
          color: '94a3b8',
          italics: true,
        })
      ],
      spacing: { before: 240 },
      border: { top: { color: 'e2e8f0', space: 2, style: BorderStyle.SINGLE, size: 6 } },
      alignment: AlignmentType.CENTER,
    });

    // Create Word document with premium properties
    const docxDocument = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.75),
                right: convertInchesToTwip(0.75),
                bottom: convertInchesToTwip(0.75),
                left: convertInchesToTwip(0.75),
              },
            },
          },
          children: [
            // Title Heading
            new Paragraph({
              children: [
                new TextRun({
                  text: doc.title,
                  bold: true,
                  color: DOCX_COLORS.heading1,
                  size: DOCX_SIZES.heading1 * 2,
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.LEFT,
              spacing: { before: 0, after: 200 },
              border: {
                bottom: {
                  color: DOCX_COLORS.heading1,
                  space: 4,
                  style: BorderStyle.SINGLE,
                  size: 24,
                },
              },
            }),

            // Metadata
            ...metadataParagraphs,

            // Main Body Content
            ...contentParagraphs,

            // Summary
            ...summaryParagraphs,

            // Footer
            footerParagraph,
          ],
        },
      ],
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: DOCX_SIZES.paragraph * 2,
              color: DOCX_COLORS.text,
            },
            paragraph: {
              spacing: { line: 360, lineRule: 'auto' },
            },
          },
        },
        paragraphStyles: [
          {
            id: 'ListBullet',
            name: 'List Bullet',
            basedOn: 'Normal',
            next: 'ListBullet',
            run: { size: DOCX_SIZES.paragraph * 2 },
          },
          {
            id: 'ListNumber',
            name: 'List Number',
            basedOn: 'Normal',
            next: 'ListNumber',
            run: { size: DOCX_SIZES.paragraph * 2 },
          },
        ],
      },
    });

    // Generate blob and download native docx
    const blob = await Packer.toBlob(docxDocument);
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Gagal membuat DOCX. Silakan coba lagi.');
  }
}

/**
 * Export markdown to DOCX directly
 */
export async function exportMarkdownToDocx(
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
  await generateDocxFromStructured(doc, fileName || `${title.replace(/\s+/g, '_')}.docx`);
}
