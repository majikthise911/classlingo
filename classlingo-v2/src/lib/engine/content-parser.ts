/**
 * Content extraction and chunking.
 * Port of Python core/content_parser.py
 * Uses pdf-parse instead of PyMuPDF.
 */

export async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(fileBuffer);
  return result.text;
}

export function extractTextFromMarkdown(fileBuffer: Buffer): string {
  return fileBuffer.toString("utf-8");
}

export function extractText(filename: string, fileBuffer: Buffer): Promise<string> | string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return extractTextFromPdf(fileBuffer);
  }
  if (["md", "markdown", "txt"].includes(ext)) {
    return extractTextFromMarkdown(fileBuffer);
  }
  return fileBuffer.toString("utf-8");
}

/**
 * Split text by headings/sections, keeping conceptual units together.
 * Falls back to paragraph-based splitting for unstructured text.
 */
export function chunkBySections(text: string, maxTokens: number = 800): string[] {
  // Try heading-based splits
  const headingPattern = /(?=^#{1,3}\s|\n(?:={3,}|-{3,})\n)/m;
  let sections = text.split(headingPattern).map((s) => s.trim()).filter(Boolean);

  // If no headings found, split by double newlines
  if (sections.length <= 1) {
    sections = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }

  // Merge small sections, split large ones
  const chunks: string[] = [];
  let current = "";

  for (const section of sections) {
    // Rough token estimate: ~4 chars per token
    if (current.length + section.length < maxTokens * 4) {
      current = current ? current + "\n\n" + section : section;
    } else {
      if (current) chunks.push(current);

      if (section.length > maxTokens * 4) {
        // Section too large — split by paragraphs
        const paragraphs = section.split("\n\n");
        let sub = "";
        for (const p of paragraphs) {
          if (sub.length + p.length < maxTokens * 4) {
            sub = sub ? sub + "\n\n" + p : p;
          } else {
            if (sub) chunks.push(sub);
            sub = p;
          }
        }
        current = sub;
      } else {
        current = section;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Generate a short topic label for a chunk using the first line as fallback.
 */
export function fallbackTopicLabel(chunkText: string): string {
  const firstLine = chunkText.split("\n")[0].slice(0, 80);
  return firstLine.replace(/^[#*\-\s]+/, "") || "General";
}
