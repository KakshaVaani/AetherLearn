import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Lecture } from "@/types";

type PdfDocument = {
  title: string;
  lines: string[];
  fileName: string;
};

type PdfOutput = {
  blob: Blob;
  html: string;
  fileName: string;
};

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "");
}

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atherlearn-notes";
}

function wrapLine(line: string, max = 82) {
  const words = line.split(/\s+/);
  const output: string[] = [];
  let current = "";
  words.forEach((word) => {
    if ((current + " " + word).trim().length > max) {
      if (current) output.push(current);
      current = word;
      return;
    }
    current = (current + " " + word).trim();
  });
  if (current) output.push(current);
  return output.length > 0 ? output : [""];
}

function markdownToLines(markdown: string) {
  return markdown
    .replace(/^# /gm, "")
    .replace(/^## /gm, "")
    .split("\n")
    .flatMap((line) => wrapLine(line.trim()));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createPdfHtml(document: PdfDocument) {
  const body = document.lines
    .map((line) => {
      if (!line.trim()) return "<br />";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0F172A; padding: 32px; }
      h1 { font-size: 24px; margin: 0 0 18px; }
      p { font-size: 13px; line-height: 1.55; margin: 0 0 8px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(document.title)}</h1>
    ${body}
  </body>
</html>`;
}

export function createPdfBlob(document: PdfDocument) {
  const pageLines = [
    document.title,
    "",
    ...document.lines.flatMap((line) => wrapLine(line))
  ].slice(0, 54);
  const textCommands = pageLines
    .map((line, index) => `1 0 0 1 54 ${760 - index * 13} Tm (${escapePdfText(line)}) Tj`)
    .join("\n");
  const stream = `BT\n/F1 10 Tf\n13 TL\n${textCommands}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += String(offset).padStart(10, "0") + " 00000 n \n";
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

async function shareNativePdf(html: string, fileName: string) {
  const result = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: fileName,
      UTI: "com.adobe.pdf"
    });
    return true;
  }
  return false;
}

export async function openPdf(output: PdfOutput) {
  if (Platform.OS !== "web") {
    return shareNativePdf(output.html, output.fileName);
  }
  if (typeof window === "undefined") return false;
  const url = URL.createObjectURL(output.blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

export async function downloadPdf(output: PdfOutput) {
  if (Platform.OS !== "web") {
    return shareNativePdf(output.html, output.fileName);
  }
  if (typeof document === "undefined") return false;
  const url = URL.createObjectURL(output.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = output.fileName.endsWith(".pdf") ? output.fileName : `${output.fileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

export function generatedNotesPdf(title: string, notes: string) {
  const document = {
    title: `${title} - AtherLearn Notes`,
    lines: markdownToLines(notes),
    fileName: `${sanitizeFileName(title)}-notes.pdf`
  };
  return {
    blob: createPdfBlob(document),
    html: createPdfHtml(document),
    fileName: document.fileName
  };
}

export function uploadedSourcePdf(lecture: Lecture) {
  const fileName = lecture.teacherPdf.fileName || `${sanitizeFileName(lecture.title)}-source.pdf`;
  const document = {
    title: lecture.title,
    fileName,
    lines: [
      `Uploaded file: ${fileName}`,
      `Subject: ${lecture.subject}`,
      `Pages: ${lecture.teacherPdf.pageCount}`,
      `Uploaded: ${lecture.teacherPdf.uploadedAt}`,
      "",
      "Teacher notes:",
      ...markdownToLines(lecture.teacherNotes),
      "",
      "Source description:",
      ...markdownToLines(lecture.diagramDescription)
    ]
  };
  return {
    blob: createPdfBlob(document),
    html: createPdfHtml(document),
    fileName
  };
}
