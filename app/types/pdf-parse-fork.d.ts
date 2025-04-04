declare module 'pdf-parse-fork' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  function pdfParse(buffer: Buffer): Promise<PDFData>;
  
  export = pdfParse;
} 