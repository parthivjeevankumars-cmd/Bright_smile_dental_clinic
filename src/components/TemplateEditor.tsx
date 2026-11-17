import { useState } from 'react';
import { ArrowLeft, Copy, Plus, Save, Trash2 } from 'lucide-react';
import type { ConsentSection, ConsentTemplate } from '@/lib/types';
import { uid } from '@/lib/types';
import ConfirmDialog from '@/components/ConfirmDialog';

interface TemplateEditorProps {
  template: ConsentTemplate;
  onChange: (t: ConsentTemplate) => void;
  onBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function TemplateEditor({
  template,
  onChange,
  onBack,
  onDuplicate,
  onDelete,
}: TemplateEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const touch = (t: ConsentTemplate) => {
    onChange({ ...t, updatedAt: Date.now() });
  };

  const updateSection = (id: string, patch: Partial<ConsentSection>) => {
    touch({
      ...template,
      sections: template.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const addSection = () => {
    touch({
      ...template,
      sections: [...template.sections, { id: uid(), heading: 'New section', body: '' }],
    });
  };

  const removeSection = (id: string) => {
    touch({ ...template, sections: template.sections.filter((s) => s.id !== id) });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost -ml-2">
          <ArrowLeft size={20} /> Back to dashboard
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={onDuplicate} className="btn-secondary" type="button">
            <Copy size={18} /> Duplicate
          </button>
          <button onClick={() => setConfirmDelete(true)} className="btn-secondary text-red-600" type="button">
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tpl-title">Form title</label>
            <input
              id="tpl-title"
              className="input"
              value={template.title}
              onChange={(e) => touch({ ...template, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="tpl-treatment">Treatment name (shown to patient)</label>
            <input
              id="tpl-treatment"
              className="input"
              value={template.treatmentName}
              onChange={(e) => touch({ ...template, treatmentName: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="tpl-intro">Introduction paragraph</label>
          <textarea
            id="tpl-intro"
            className="input min-h-[110px] py-3 leading-relaxed"
            value={template.intro}
            onChange={(e) => touch({ ...template, intro: e.target.value })}
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Sections</h3>
            <button onClick={addSection} className="btn-secondary min-h-[40px] px-3 text-sm" type="button">
              <Plus size={16} /> Add section
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {template.sections.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 font-semibold"
                    value={s.heading}
                    placeholder="Section heading"
                    onChange={(e) => updateSection(s.id, { heading: e.target.value })}
                  />
                  <button
                    onClick={() => removeSection(s.id)}
                    className="btn-ghost min-h-[48px] px-3 text-red-500"
                    aria-label={`Remove section ${s.heading || ''}`}
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <textarea
                  className="input mt-2 min-h-[100px] py-3 leading-relaxed"
                  value={s.body}
                  placeholder="Section text"
                  onChange={(e) => updateSection(s.id, { body: e.target.value })}
                />
              </div>
            ))}
            {template.sections.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No sections yet. Use "Add section" to build the agreement.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="label" htmlFor="tpl-ack">Acknowledgement text</label>
          <textarea
            id="tpl-ack"
            className="input min-h-[90px] py-3 leading-relaxed"
            value={template.acknowledgment}
            onChange={(e) => touch({ ...template, acknowledgment: e.target.value })}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Last modified {new Date(template.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <button onClick={onBack} className="btn-primary" type="button">
            <Save size={18} /> Done editing
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Every change is saved to this device automatically. Signed documents made from this
          template keep the wording they were signed with.
        </p>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this template?"
          message={`"${template.title}" and its wording will be permanently removed from this device. Signed documents already created from it are not affected.`}
          confirmLabel="Delete template"
          destructive
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
