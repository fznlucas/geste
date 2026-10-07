"use client";

/**
 * "Export CSV" and GDPR exports in the mock: the file is built in the browser and downloaded.
 * Later the route handlers stream it (and the GDPR export is emailed to the customer).
 */

/** RFC 4180: quotes around every cell, doubled inner quotes, CRLF rows. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function downloadFile(filename: string, content: string | Uint8Array, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
