import { useRef, useState } from 'react';
import { ArrowLeft, Database, Download, KeyRound, Lock, Save, ShieldCheck, Upload } from 'lucide-react';
import type { ClinicSettings } from '@/lib/types';
import type { BackupPayload } from '@/lib/db';
import { exportBackup, getSettings, importBackup, saveSettings } from '@/lib/db';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AdminProps {
  settings: ClinicSettings;
  onSettingsChange: (s: ClinicSettings) => void;
  onBack: () => void;
}

type PinMode = 'locked' | 'unlocked';

export default function Admin({ settings, onSettingsChange, onBack }: AdminProps) {
  const isSetup = !settings.pin;
  const [pinMode, setPinMode] = useState<PinMode>(isSetup ? 'unlocked' : 'locked');
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [draft, setDraft] = useState<ClinicSettings>(settings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState<BackupPayload | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [logoData, setLogoData] = useState<string | null>(settings.logo);

  const tryUnlock = () => {
    if (pinInput === settings.pin) {
      setPinMode('unlocked');
      setPinInput('');
      setError(null);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  const persist = async (next: ClinicSettings) => {
    setDraft(next);
    try {
      await saveSettings(next);
      onSettingsChange(next);
      setStatus('Settings saved on this device.');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Settings could not be saved on this device.');
    }
  };

  const handleLogo = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file for the logo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setLogoData(result);
      void persist({ ...draft, logo: result });
    };
    reader.onerror = () => setError('The logo could not be read.');
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    try {
      const payload = await exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dental-consent-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus('Backup file created. Store it somewhere safe.');
    } catch (err) {
      console.error(err);
      setError('The backup could not be created on this device.');
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as BackupPayload;
        setConfirmImport(payload);
      } catch {
        setError('This file could not be read as a backup.');
      }
    };
    reader.onerror = () => setError('This file could not be read.');
    reader.readAsText(file);
  };

  const confirmImportNow = async () => {
    const payload = confirmImport;
    setConfirmImport(null);
    if (!payload) return;
    try {
      const result = await importBackup(payload);
      setStatus(`Backup restored: ${result.templates} templates and ${result.signed} signed documents.`);
      const fresh = await getSettings();
      setDraft(fresh);
      setLogoData(fresh.logo);
      onSettingsChange(fresh);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'The backup could not be restored.');
    }
  };

  if (pinMode === 'locked') {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <button onClick={onBack} className="btn-ghost -ml-2">
          <ArrowLeft size={20} /> Back to dashboard
        </button>
        <div className="card mt-4 p-8 text-center">
          <Lock size={40} className="mx-auto text-teal-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Admin area</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the admin PIN to manage templates and clinic settings.
          </p>
          <input
            className="input mt-6 text-center text-2xl tracking-[0.4em]"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            placeholder="••••"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
            aria-label="Admin PIN"
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button onClick={tryUnlock} disabled={pinInput.length === 0} className="btn-primary mt-4 w-full">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={onBack} className="btn-ghost -ml-2">
        <ArrowLeft size={20} /> Back to dashboard
      </button>

      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin & Clinic Settings</h2>

      {status && (
        <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{status}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <div className="card mt-4 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheck size={20} className="text-teal-600" /> Clinic details
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="clinic-name">Clinic name</label>
            <input
              id="clinic-name"
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="clinic-phone">Phone</label>
            <input
              id="clinic-phone"
              className="input"
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="clinic-email">Email</label>
            <input
              id="clinic-email"
              className="input"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="clinic-address">Address</label>
            <textarea
              id="clinic-address"
              className="input min-h-[80px] py-3"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {logoData ? (
            <img src={logoData} alt="Clinic logo" className="h-16 w-16 rounded-xl border border-slate-200 object-contain p-1" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
              No logo
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary min-h-[40px] cursor-pointer px-3 text-sm">
              <Upload size={16} /> Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogo(f);
                  e.target.value = '';
                }}
              />
            </label>
            {logoData && (
              <button
                onClick={() => {
                  setLogoData(null);
                  void persist({ ...draft, logo: null });
                }}
                className="btn-secondary min-h-[40px] px-3 text-sm text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => void persist(draft)}
          className="btn-primary mt-5 w-full sm:w-auto"
          type="button"
        >
          <Save size={18} /> Save clinic details
        </button>
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <KeyRound size={20} className="text-teal-600" /> Admin PIN
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          The PIN protects template editing and these settings. The patient signing screen stays
          simple and PIN-free.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="new-pin">New 4-8 digit PIN</label>
            <input
              id="new-pin"
              className="input tracking-widest"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-pin">Repeat PIN</label>
            <input
              id="confirm-pin"
              className="input tracking-widest"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (newPin.length < 4) {
              setError('The PIN must be at least 4 digits.');
              return;
            }
            if (newPin !== confirmPin) {
              setError('The two PINs do not match.');
              return;
            }
            void persist({ ...draft, pin: newPin });
            setNewPin('');
            setConfirmPin('');
          }}
          className="btn-secondary mt-4"
          type="button"
        >
          Update PIN
        </button>
      </div>

      <div className="card mb-10 mt-4 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Database size={20} className="text-teal-600" /> Backup & restore
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          All data lives only on this device. Export a backup file regularly and keep it somewhere
          safe - local storage is not a guaranteed permanent backup and can be lost if browser data
          is cleared.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => void handleExport()} className="btn-primary flex-1" type="button">
            <Download size={18} /> Export backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary flex-1" type="button">
            <Upload size={18} /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {confirmImport && (
        <ConfirmDialog
          title="Restore this backup?"
          message={`This will merge ${confirmImport.templates?.length ?? 0} templates and ${confirmImport.signed?.length ?? 0} signed documents into what is stored on this device. Existing records with the same IDs will be replaced.`}
          confirmLabel="Restore backup"
          onConfirm={() => void confirmImportNow()}
          onCancel={() => setConfirmImport(null)}
        />
      )}
    </div>
  );
}
