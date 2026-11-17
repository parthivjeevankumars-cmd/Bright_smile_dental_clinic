import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Download, FileText, Printer, Search, Trash2 } from 'lucide-react';
import type { ClinicSettings, SignedConsent } from '@/lib/types';
import { deleteSignedRecord, saveSignedRecord } from '@/lib/db';
import { downloadPdf, generateConsentPdf } from '@/lib/pdf';
import ConfirmDialog from '@/components/ConfirmDialog';

interface LibraryProps {
  records: SignedConsent[];
  clinic: ClinicSettings;
  onRecordsChange: () => void;
}

export default function Library({ records, clinic, onRecordsChange }: LibraryProps) {
  const [query, setQuery] = useState('');
  const [treatment, setTreatment] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<SignedConsent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const treatments = useMemo(
    () => Array.from(new Set(records.map((r) => r.treatmentName))).sort(),
    [records],
  );

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (query && !r.patientName.toLowerCase().includes(query.trim().toLowerCase())) return false;
        if (treatment && r.treatmentName !== treatment) return false;
        const day = new Date(r.signedAt).toISOString().slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
        return true;
      }),
    [records, query, treatment, fromDate, toDate],
  );

  const pdfFor = async (record: SignedConsent, action: 'download' | 'print') => {
    setBusyId(record.id);
    setError(null);
    try {
      const pdf = await generateConsentPdf(record, clinic);
      if (action === 'download') {
        downloadPdf(record, clinic, pdf);
      } else {
        const w = window.open(pdf.url, '_blank');
        if (!w) downloadPdf(record, clinic, pdf);
      }
      setTimeout(() => URL.revokeObjectURL(pdf.url), 60_000);
    } catch (err) {
      console.error(err);
      setError('The PDF could not be created. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = async (record: SignedConsent) => {
    try {
      await saveSignedRecord({ ...record, archived: !record.archived });
      onRecordsChange();
    } catch (err) {
      console.error(err);
      setError('The document could not be updated on this device.');
    }
  };

  const remove = async (record: SignedConsent) => {
    try {
      await deleteSignedRecord(record.id);
      onRecordsChange();
    } catch (err) {
      console.error(err);
      setError('The document could not be deleted from this device.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h2 className="text-2xl font-semibold text-slate-900">Signed Documents Library</h2>
      <p className="mt-1 text-sm text-slate-500">
        {records.length} signed {records.length === 1 ? 'document' : 'documents'} stored on this device
      </p>

      <div className="card mt-4 space-y-3 p-4 sm:p-5">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by patient name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="input" value={treatment} onChange={(e) => setTreatment(e.target.value)}>
            <option value="">All treatments</option>
            {treatments.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div>
            <label className="sr-only" htmlFor="from-date">From date</label>
            <input id="from-date" className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Signed from date" />
          </div>
          <div>
            <label className="sr-only" htmlFor="to-date">To date</label>
            <input id="to-date" className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Signed to date" />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 space-y-3 pb-10">
        {filtered.length === 0 && (
          <div className="card p-10 text-center">
            <FileText size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 text-slate-500">
              {records.length === 0
                ? 'No signed documents yet. Signed consents will appear here.'
                : 'No documents match these filters.'}
            </p>
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className={`card p-4 sm:p-5 ${r.archived ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{r.patientName}</p>
                <p className="text-sm text-slate-500">{r.treatmentName}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Signed {new Date(r.signedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' - '}Treatment {new Date(r.treatmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => pdfFor(r, 'download')}
                  disabled={busyId === r.id}
                  className="btn-primary min-h-[40px] px-3 text-sm"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={() => pdfFor(r, 'print')}
                  disabled={busyId === r.id}
                  className="btn-secondary min-h-[40px] px-3 text-sm"
                  aria-label="Print document"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => toggleArchive(r)}
                  disabled={busyId === r.id}
                  className="btn-secondary min-h-[40px] px-3 text-sm"
                  aria-label={r.archived ? 'Unarchive document' : 'Archive document'}
                >
                  {r.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
                <button
                  onClick={() => setConfirmTarget(r)}
                  className="btn-secondary min-h-[40px] px-3 text-sm text-red-600"
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {r.archived && (
              <p className="mt-2 text-xs font-medium text-amber-600">Archived</p>
            )}
          </div>
        ))}
      </div>

      {confirmTarget && (
        <ConfirmDialog
          title="Delete signed document?"
          message={`The signed consent for ${confirmTarget.patientName} will be permanently removed from this device. This cannot be undone.`}
          confirmLabel="Delete document"
          destructive
          onConfirm={() => {
            const target = confirmTarget;
            setConfirmTarget(null);
            void remove(target);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
