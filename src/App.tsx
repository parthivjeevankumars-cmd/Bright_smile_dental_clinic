import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ClipboardList,
  Copy,
  FileSignature,
  FileText,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import type { ClinicSettings, ConsentTemplate, SignedConsent } from '@/lib/types';
import { uid } from '@/lib/types';
import {
  DEFAULT_SETTINGS,
  deleteTemplate,
  getSettings,
  getSignedRecords,
  getTemplates,
  saveTemplate,
} from '@/lib/db';
import ConfirmDialog from '@/components/ConfirmDialog';
import TemplateEditor from '@/components/TemplateEditor';
import ConsentFlow from '@/components/ConsentFlow';
import Library from '@/components/Library';
import Admin from '@/components/Admin';

type Screen = 'dashboard' | 'library' | 'admin' | 'editor' | 'consent';
type LoadState = 'loading' | 'ready' | 'error';

export default function App() {
  const [state, setState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [records, setRecords] = useState<SignedConsent[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>({ ...DEFAULT_SETTINGS });
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [activeTemplate, setActiveTemplate] = useState<ConsentTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ConsentTemplate | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const reloadAll = useCallback(async () => {
    const [t, r, s] = await Promise.all([getTemplates(), getSignedRecords(), getSettings()]);
    setTemplates(t);
    setRecords(r);
    setSettings(s);
  }, []);

  useEffect(() => {
    reloadAll()
      .then(() => setState('ready'))
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : 'Stored data could not be opened.');
        setState('error');
      });
  }, [reloadAll]);

  const active = showArchived ? templates : templates.filter((t) => !t.archived);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.treatmentName.toLowerCase().includes(q) ||
        t.intro.toLowerCase().includes(q),
    );
  }, [active, query]);

  const recentSigned = useMemo(() => records.slice(0, 5), [records]);

  const startNew = async () => {
    const now = Date.now();
    const blank: ConsentTemplate = {
      id: uid(),
      title: 'New Consent Form',
      treatmentName: 'New Consent Form',
      intro: '',
      sections: [{ id: uid(), heading: 'Section heading', body: 'Section text.' }],
      acknowledgment: '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveTemplate(blank);
      setTemplates((prev) => [blank, ...prev]);
      setActiveTemplate(blank);
      setScreen('editor');
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'The new template could not be created.');
    }
  };

  const duplicateTemplate = async (t: ConsentTemplate) => {
    const now = Date.now();
    const copy: ConsentTemplate = {
      ...t,
      id: uid(),
      title: `${t.title} (copy)`,
      treatmentName: t.treatmentName,
      sections: t.sections.map((s) => ({ ...s, id: uid() })),
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveTemplate(copy);
      setTemplates((prev) => [copy, ...prev]);
      setActiveTemplate(copy);
      setScreen('editor');
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'The template could not be duplicated.');
    }
  };

  const archiveTemplate = async (t: ConsentTemplate) => {
    try {
      await saveTemplate({ ...t, archived: !t.archived, updatedAt: Date.now() });
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, archived: !t.archived, updatedAt: Date.now() } : x)),
      );
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'The template could not be updated.');
    }
  };

  const removeTemplate = async (t: ConsentTemplate) => {
    try {
      await deleteTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'The template could not be deleted.');
    }
  };

  const persistTemplate = async (t: ConsentTemplate) => {
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    try {
      await saveTemplate(t);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Changes could not be saved on this device.');
    }
  };

  const requestAdmin = () => {
    if (!settings.pin || unlocked) {
      setUnlocked(true);
      setScreen('admin');
    } else {
      setPinPrompt(true);
      setPinInput('');
      setPinError(null);
    }
  };

  const tryPin = () => {
    if (pinInput === settings.pin) {
      setUnlocked(true);
      setPinPrompt(false);
      setScreen('admin');
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <ClipboardList size={44} className="mx-auto animate-pulse text-teal-600" />
          <p className="mt-4 text-slate-500">Loading your clinic data...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="font-semibold text-slate-900">Stored data could not be opened</p>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <p className="mt-4 text-sm text-slate-500">
            Try reloading the app. If the problem continues, check this device's storage settings -
            private browsing modes may block saved data.
          </p>
        </div>
      </div>
    );
  }

  const nav = (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <button onClick={() => setScreen('dashboard')} className="flex min-w-0 items-center gap-3 text-left">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-contain p-0.5" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <ClipboardList size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight text-slate-900">{settings.name}</p>
            <p className="text-xs text-slate-500">Consent Manager</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setScreen('dashboard')}
            className={`btn-ghost min-h-[44px] px-3 text-sm ${screen === 'dashboard' ? 'bg-teal-50 text-teal-700' : ''}`}
            aria-label="Dashboard"
          >
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setScreen('library')}
            className={`btn-ghost min-h-[44px] px-3 text-sm ${screen === 'library' ? 'bg-teal-50 text-teal-700' : ''}`}
            aria-label="Signed documents"
          >
            <FileText size={18} />
            <span className="hidden sm:inline">Library</span>
          </button>
          <button
            onClick={requestAdmin}
            className={`btn-ghost min-h-[44px] px-3 text-sm ${screen === 'admin' ? 'bg-teal-50 text-teal-700' : ''}`}
            aria-label="Admin settings"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );

  if (screen === 'editor' && activeTemplate) {
    return (
      <div className="min-h-screen">
        {nav}
        <TemplateEditor
          template={activeTemplate}
          onChange={(t) => {
            setActiveTemplate(t);
            void persistTemplate(t);
          }}
          onBack={() => {
            setActiveTemplate(null);
            setScreen('dashboard');
          }}
          onDuplicate={() => void duplicateTemplate(activeTemplate)}
          onDelete={() => void removeTemplate(activeTemplate).then(() => {
            setActiveTemplate(null);
            setScreen('dashboard');
          })}
        />
      </div>
    );
  }

  if (screen === 'consent' && activeTemplate) {
    return (
      <div className="min-h-screen">
        {nav}
        <ConsentFlow
          template={activeTemplate}
          clinic={settings}
          onBack={() => {
            setActiveTemplate(null);
            setScreen('dashboard');
          }}
          onSigned={(r) => setRecords((prev) => [r, ...prev])}
        />
      </div>
    );
  }

  if (screen === 'library') {
    return (
      <div className="min-h-screen">
        {nav}
        <Library
          records={records}
          clinic={settings}
          onRecordsChange={() => void getSignedRecords().then(setRecords).catch(() => {})}
        />
      </div>
    );
  }

  if (screen === 'admin') {
    return (
      <div className="min-h-screen">
        {nav}
        <Admin
          settings={settings}
          onSettingsChange={setSettings}
          onBack={() => setScreen('dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {nav}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl bg-teal-600 p-6 text-white sm:p-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-teal-100">
            {templates.filter((t) => !t.archived).length} consent templates and {records.length}{' '}
            signed {records.length === 1 ? 'document' : 'documents'} on this device.
          </p>
          <button onClick={() => void startNew()} className="btn mt-5 bg-white text-teal-700 hover:bg-teal-50">
            <Plus size={20} /> New consent form
          </button>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Consent form templates</h2>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="btn-ghost min-h-[40px] px-3 text-sm"
          >
            {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>

        <div className="relative mt-3">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search consent forms"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loadError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <div key={t.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Modified {new Date(t.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {t.archived && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                {t.intro || 'No introduction written yet.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveTemplate(t);
                    setScreen('consent');
                  }}
                  className="btn-primary min-h-[44px] flex-1 px-3 text-sm"
                >
                  <FileSignature size={16} /> Open for patient
                </button>
                <button
                  onClick={() => {
                    setActiveTemplate(t);
                    setScreen('editor');
                  }}
                  className="btn-secondary min-h-[44px] px-3"
                  aria-label={`Edit ${t.title}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => void duplicateTemplate(t)}
                  className="btn-secondary min-h-[44px] px-3"
                  aria-label={`Duplicate ${t.title}`}
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => void archiveTemplate(t)}
                  className="btn-secondary min-h-[44px] px-3"
                  aria-label={t.archived ? `Unarchive ${t.title}` : `Archive ${t.title}`}
                >
                  {t.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(t)}
                  className="btn-secondary min-h-[44px] px-3 text-red-600"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card p-10 text-center sm:col-span-2">
              <FileText size={40} className="mx-auto text-slate-300" />
              <p className="mt-3 text-slate-500">
                {query ? 'No consent forms match your search.' : 'No consent forms yet.'}
              </p>
            </div>
          )}
        </div>

        <div className="mb-10 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recently signed</h2>
            <button onClick={() => setScreen('library')} className="btn-ghost min-h-[40px] px-3 text-sm text-teal-700">
              View all
            </button>
          </div>
          <div className="card mt-3 divide-y divide-slate-100">
            {recentSigned.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">
                Signed consent forms will appear here.
              </p>
            )}
            {recentSigned.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{r.patientName}</p>
                  <p className="truncate text-sm text-slate-500">{r.treatmentName}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(r.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this template?"
          message={`"${confirmDelete.title}" will be permanently removed from this device. Signed documents already created from it are not affected.`}
          confirmLabel="Delete template"
          destructive
          onConfirm={() => {
            const t = confirmDelete;
            setConfirmDelete(null);
            void removeTemplate(t);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {pinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPinPrompt(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Admin access</h3>
            <p className="mt-1 text-sm text-slate-500">Enter the admin PIN to continue.</p>
            <input
              className="input mt-4 text-center text-2xl tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && tryPin()}
              aria-label="Admin PIN"
              autoFocus
            />
            {pinError && <p className="mt-2 text-sm text-red-600">{pinError}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setPinPrompt(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={tryPin} disabled={pinInput.length === 0} className="btn-primary flex-1">Unlock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
