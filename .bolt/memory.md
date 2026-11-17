# Project memory

## Product intent & audience

- Dental Consent Manager: a clinic-facing tool for creating, editing, and managing dental consent forms and capturing patient signatures.
- Primary users: dentists and clinic staff, likely on iPad (installable to home screen, signature pad supports finger/Apple Pencil).
- Patient-facing signing screen is part of the flow but not the primary operator.

## Brand personality & voice

- Professional, clinical, trustworthy — production-grade polish, not a demo or prototype feel.
- Clear, formal language for consent text; UI copy is concise and task-oriented.

## Visual design & UX direction

- Dashboard with searchable consent-form cards; each card shows last-modified date and actions (open, edit, duplicate, archive, delete with confirmation).
- Recently signed consents list on dashboard.
- Patient signing screen: name, age, optional gender/phone, treatment date, full agreement text, read-and-understood checkbox, signature pad.
- Generated PDF includes clinic details, patient signature, signing date/time; actions: Download, Print, Share.
- Library: searchable signed-document archive with patient-name search and filters by treatment and signing date; signed PDFs preserve original wording even if template later changes.
- Admin section (PIN-protected): edit clinic details, upload logo, export/restore full backup.
- Offline-first; all data stored on device only.

## Decisions, constraints & rationale

- Tech: Vite + React, JSX, Tailwind CSS, Lucide React icons; `@/` alias maps to `src/`. No extra UI/icon packages unless explicitly requested.
- Six preloaded editable sample templates (implants, extraction, root canal, wisdom teeth, crown, general surgery) — demonstration only, not hard-coded.
- Editor includes a reminder that sample wording must be replaced with approved legal text.
- Known reliability fixes addressed: iPad Share button was sharing an empty file; a leftover dynamic import in Admin.tsx was removed.
- Build, typecheck, and lint all pass.

## Open questions & assumptions

- iPad physical end-to-end testing not yet performed; recommend testing a signing flow with Wi-Fi off.
- Device storage is convenient but not a guaranteed permanent backup — users should export backups regularly.
- Legal validity/adequacy of consent text is the dentist's responsibility.