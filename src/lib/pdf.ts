import { jsPDF } from 'jspdf';
import type { ClinicSettings, SignedConsent } from './types';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface DocState {
  y: number;
  page: number;
  doc: jsPDF;
}

const ACCENT: [number, number, number] = [15, 118, 144];

function ensureSpace(state: DocState, needed: number): void {
  if (state.y + needed > PAGE_H - 24) {
    state.doc.addPage();
    state.page += 1;
    state.y = MARGIN;
  }
}

function wrap(state: DocState, text: string, width: number, size: number): string[] {
  state.doc.setFontSize(size);
  const parts = text.split('\n');
  const out: string[] = [];
  for (const part of parts) {
    if (part.trim() === '') {
      out.push('');
    } else {
      out.push(...(state.doc.splitTextToSize(part, width) as string[]));
    }
  }
  return out;
}

function drawText(state: DocState, lines: string[], lineH: number): void {
  for (const line of lines) {
    ensureSpace(state, lineH);
    state.doc.text(line, MARGIN, state.y);
    state.y += lineH;
  }
}

export async function generateConsentPdf(
  record: SignedConsent,
  clinic: ClinicSettings,
): Promise<{ blob: Blob; url: string }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const state: DocState = { y: MARGIN, page: 1, doc };

  // Header band
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 34, 'F');

  if (clinic.logo) {
    try {
      doc.addImage(clinic.logo, 'PNG', MARGIN, 6, 22, 22);
    } catch {
      /* skip unreadable logo */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(clinic.name || 'Dental Clinic', clinic.logo ? MARGIN + 26 : MARGIN, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const contactLine = [clinic.address, clinic.phone, clinic.email].filter(Boolean).join('  |  ');
  if (contactLine) {
    doc.text(doc.splitTextToSize(contactLine, CONTENT_W - (clinic.logo ? 26 : 0)) as string[], clinic.logo ? MARGIN + 26 : MARGIN, 23);
  }
  doc.setTextColor(30, 41, 59);

  state.y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  drawText(state, wrap(state, record.treatmentName, CONTENT_W, 17), 8);

  doc.setFontSize(10.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Patient Consent Record', MARGIN, state.y);
  state.y += 7;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, state.y, PAGE_W - MARGIN, state.y);
  state.y += 9;
  doc.setTextColor(30, 41, 59);

  // Patient details grid
  const details: [string, string][] = [
    ['Patient name', record.patientName],
    ['Age', record.patientAge],
  ];
  if (record.patientGender) details.push(['Gender', record.patientGender]);
  if (record.patientPhone) details.push(['Contact number', record.patientPhone]);
  details.push(['Date of treatment', record.treatmentDate]);

  // Patient details grid: rows of two columns
  const colW = CONTENT_W / 2;
  let colY = state.y;
  doc.setFontSize(9);
  for (let i = 0; i < details.length; i += 2) {
    for (let j = 0; j < 2 && i + j < details.length; j += 1) {
      const [label, value] = details[i + j];
      const x = MARGIN + j * colW;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(label.toUpperCase(), x, colY);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(doc.splitTextToSize(value, colW - 4) as string[], x, colY + 5.5);
    }
    colY += 14;
  }
  state.y = colY + 2;

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, state.y, PAGE_W - MARGIN, state.y);
  state.y += 10;

  // Agreement content (frozen snapshot)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('Consent Agreement', MARGIN, state.y);
  state.y += 8;

  doc.setFont('helvetica', 'normal');
  drawText(state, wrap(state, record.agreementSnapshot.intro, CONTENT_W, 10), 5.4);
  state.y += 3;

  for (const s of record.agreementSnapshot.sections) {
    ensureSpace(state, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    drawText(state, wrap(state, s.heading, CONTENT_W, 11), 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    drawText(state, wrap(state, s.body, CONTENT_W, 10), 5.2);
    state.y += 3;
  }

  ensureSpace(state, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Acknowledgement', MARGIN, state.y);
  state.y += 6;
  doc.setFont('helvetica', 'normal');
  drawText(state, wrap(state, record.agreementSnapshot.acknowledgment, CONTENT_W, 10), 5.2);
  state.y += 4;

  // Signature block
  ensureSpace(state, 52);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, state.y, CONTENT_W * 0.62, 34, 'FD');
  try {
    doc.addImage(record.signatureDataUrl, 'PNG', MARGIN + 2, state.y + 2, CONTENT_W * 0.62 - 4, 30);
  } catch {
    /* signature image unreadable */
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Patient signature', MARGIN, state.y + 39);

  const rightX = MARGIN + CONTENT_W * 0.62 + 8;
  const signedDate = new Date(record.signedAt);
  const dateStr = signedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = signedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text('Date signed', rightX, state.y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr}`, rightX, state.y + 14);
  doc.text(`${timeStr}`, rightX, state.y + 20);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(doc.splitTextToSize(`Record ID: ${record.id}`, CONTENT_W - (rightX - MARGIN)) as string[], rightX, state.y + 30);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${clinic.name || 'Dental Clinic'} - Consent record - Page ${p} of ${pages}`,
      PAGE_W / 2,
      PAGE_H - 10,
      { align: 'center' },
    );
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

export function safeFileName(record: SignedConsent): string {
  const date = new Date(record.signedAt).toISOString().slice(0, 10);
  const name = record.patientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'patient';
  return `consent-${name}-${date}.pdf`;
}

export function downloadPdf(record: SignedConsent, clinic: ClinicSettings, data: { blob: Blob; url: string }): void {
  const a = document.createElement('a');
  a.href = data.url;
  a.download = safeFileName(record);
  document.body.appendChild(a);
  a.click();
  a.remove();
  void data.blob;
}
