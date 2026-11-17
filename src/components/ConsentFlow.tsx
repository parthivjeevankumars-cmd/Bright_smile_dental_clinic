import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileSignature, Printer, Share2, X } from 'lucide-react';
import type { ClinicSettings, ConsentTemplate, SignedConsent } from '@/lib/types';
import { uid } from '@/lib/types';
import { saveSignedRecord } from '@/lib/db';
import { generateConsentPdf, safeFileName } from '@/lib/pdf';
import SignaturePad from '@/components/SignaturePad';

interface ConsentFlowProps {
  template: ConsentTemplate;
  clinic: ClinicSettings;
  onBack: () => void;
  onSigned: (record: SignedConsent) => void;
}

type Phase = 'form' | 'generating' | 'done';

export default function ConsentFlow({ template, clinic, onBack, onSigned }: ConsentFlowProps) {
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [treatmentDate, setTreatmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<SignedConsent | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const pdfName = useRef<string>('consent.pdf');

  const canSubmit = useMemo(
    () => patientName.trim().length > 0 && patientAge.trim().length > 0 && agreed && !!signature,
    [patientName, patientAge, agreed, signature],
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    if (!canSubmit || !signature) return;
    setPhase('generating');
    setError(null);
    const newRecord: SignedConsent = {
      id: uid(),
      templateId: template.id,
      templateTitle: template.title,
      treatmentName: template.treatmentName || template.title,
      patientName: patientName.trim(),
      patientAge: patientAge.trim(),
      patientGender: patientGender.trim(),
      patientPhone: patientPhone.trim(),
      treatmentDate,
      agreementSnapshot: {
        intro: template.intro,
        sections: template.sections.map((s) => ({ ...s })),
        acknowledgment: template.acknowledgment,
      },
      signatureDataUrl: signature,
      signedAt: Date.now(),
      archived: false,
    };
    try {
      await saveSignedRecord(newRecord);
      const pdf = await generateConsentPdf(newRecord, clinic);
      pdfName.current = safeFileName(newRecord);
      setRecord(newRecord);
      setPdfUrl(pdf.url);
      setPdfBlob(pdf.blob);
      setPhase('done');
      onSigned(newRecord);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving or creating the PDF. Please try again.',
      );
      setPhase('form');
    }
  };

  if (phase === 'done' && record && pdfUrl) {
    const shareFile =
      pdfBlob &&
      navigator.canShare?.({ files: [new File([pdfBlob], pdfName.current, { type: 'application/pdf' })] });
    const share = () => {
      if (!pdfBlob) return;
      const file = new File([pdfBlob], pdfName.current, { type: 'application/pdf' });
      navigator.share({ title: pdfName.current, files: [file] }).catch(() => {});
    }
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="card p-6 text-center sm:p-10">
          <CheckCircle2 size={56} className="mx-auto text-teal-600" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">Consent signed</h2>
          <p className="mt-2 text-slate-600">
            The signed consent for {record.patientName} has been saved on this device and the PDF is
            ready.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <a href={pdfUrl} download={pdfName.current} className="btn-primary w-full">
              <Download size={20} /> Download PDF
            </a>
            <div className="flex gap-3">
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary flex-1">
                <Printer size={18} /> Print
              </a>
              {shareFile ? (
                <button type="button" className="btn-secondary flex-1" onClick={share}>
                  <Share2 size={18} /> Share
                </button>
              ) : (
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary flex-1">
                  Open
                </a>
              )}
            </div>
            <button type="button" onClick={onBack} className="btn-ghost w-full">
              Back to dashboard
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Saved locally on this device only. You can find it any time in the Signed Documents
            Library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={onBack} className="btn-ghost -ml-2">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="card mt-4 p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <FileSignature size={28} className="shrink-0 text-teal-600" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{template.treatmentName || template.title}</h2>
            <p className="text-sm text-slate-500">{clinic.name}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pt-name">Patient full name *</label>
            <input id="pt-name" className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="label" htmlFor="pt-age">Age *</label>
            <input id="pt-age" className="input" type="number" inputMode="numeric" min={0} value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="e.g. 34" />
          </div>
          <div>
            <label className="label" htmlFor="pt-gender">Gender (optional)</label>
            <select id="pt-gender" className="input" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pt-phone">Contact number (optional)</label>
            <input id="pt-phone" className="input" type="tel" inputMode="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label className="label" htmlFor="pt-date">Date of treatment *</label>
            <input id="pt-date" className="input" type="date" max={todayIso} value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Consent agreement</h3>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 leading-relaxed text-slate-700">
            <p className="whitespace-pre-wrap">{template.intro}</p>
            {template.sections.map((s) => (
              <div key={s.id} className="mt-5">
                <h4 className="font-semibold text-slate-900">{s.heading}</h4>
                <p className="mt-1 whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
            <div className="mt-5">
              <h4 className="font-semibold text-slate-900">Acknowledgement</h4>
              <p className="mt-1 whitespace-pre-wrap">{template.acknowledgment}</p>
            </div>
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-300 accent-teal-600"
          />
          <span className="text-sm leading-relaxed text-slate-700">
            I confirm that I have read and understood this agreement.
          </span>
        </label>

        <div className="mt-6">
          <p className="label">Patient signature *</p>
          <SignaturePad onChange={setSignature} />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmit || phase === 'generating'}
          onClick={submit}
          className="btn-primary mt-6 w-full text-lg"
        >
          {phase === 'generating' ? 'Creating PDF...' : 'Submit & generate PDF'}
        </button>
        {!canSubmit && phase === 'form' && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Name, age, the confirmation tick and a signature are required.
          </p>
        )}
      </div>
    </div>
  );
}
