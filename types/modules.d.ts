/* eslint-disable */
// Module declarations for packages without bundled TypeScript types

declare module 'pdfjs-dist/build/pdf.mjs';

declare module 'mammoth' {
  interface ConvertResult {
    value: string;
    messages: unknown[];
  }
  function convertArrayBuffer(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  const mammoth: {
    convertArrayBuffer: typeof convertArrayBuffer;
    convertToHtml: typeof convertToHtml;
  };
  export = mammoth;
}
