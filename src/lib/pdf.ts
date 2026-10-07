/**
 * A small PDF writer for the documents the admin downloads in the mock (shipping label, certificate,
 * invoice): one A4 or label-sized page of text lines in a built-in monospace font, so no font file or
 * library is shipped to the browser. The live adapters return the vendor's PDF instead (Boxtal label,
 * invoice service). Text is Latin-1; characters outside it are replaced.
 */

export interface PdfLine {
  text: string;
  /** Points; default 10. */
  size?: number;
  /** Extra space above, in points. */
  gap?: number;
}

/** "N°07 — Print" in WinAnsi: keep Latin-1, map the few typographic marks, drop the rest. */
function latin1(s: string): string {
  return s
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/·/g, "·")
    .replace(/×/g, "x")
    .replace(/€/g, "EUR")
    .replace(/[^\u0000-ÿ]/g, "?");
}

const escape = (s: string) => latin1(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** A one-page PDF. `size`: A4 (595 × 842 pt) or a 4 × 6 in shipping label (288 × 432 pt). */
export function textPdf(lines: PdfLine[], size: "a4" | "label" = "a4"): Uint8Array {
  const [w, h] = size === "a4" ? [595, 842] : [288, 432];
  const margin = size === "a4" ? 56 : 20;
  let y = h - margin;
  const ops: string[] = ["BT"];
  for (const l of lines) {
    const pt = l.size ?? 10;
    y -= (l.gap ?? 0) + pt * 1.35;
    ops.push(`/F1 ${pt} Tf 1 0 0 1 ${margin} ${y.toFixed(1)} Tm (${escape(l.text)}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Every character is Latin-1: one byte each.
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
}
