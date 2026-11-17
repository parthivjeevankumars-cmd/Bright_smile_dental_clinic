import { openDB, type IDBPDatabase } from 'idb';
import type { ClinicSettings, ConsentSection, ConsentTemplate, SignedConsent } from './types';
import { uid } from './types';

const DB_NAME = 'dental-consent-db';
const DB_VERSION = 1;

interface StoreInfo {
  templates: 'templates';
  signed: 'signed';
  settings: 'settings';
}

const section = (heading: string, body: string) => ({ id: uid(), heading, body });

function seedTemplates(): ConsentTemplate[] {
  const now = Date.now();
  const make = (
    title: string,
    treatmentName: string,
    intro: string,
    sections: ConsentSection[],
  ): ConsentTemplate => ({
    id: uid(),
    title,
    treatmentName,
    intro,
    sections,
    acknowledgment:
      'I confirm that I have read and understood this consent form, that my questions have been answered to my satisfaction, and I freely consent to the proposed treatment. I understand this demonstration content must be reviewed and replaced with the clinic\'s approved medical and legal wording before clinical use.',
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  return [
    make(
      'Dental Implant Surgery',
      'Dental Implant Surgery',
      'This demonstration consent form outlines the proposed dental implant surgery, its known risks, and alternative options. Please replace this sample content with the clinic\'s approved wording.',
      [
        section('Procedure Overview', 'The placement of a dental implant involves the surgical insertion of a titanium fixture into the jawbone to replace one or more missing teeth, followed by a healing period and restoration with a crown or prosthesis.'),
        section('Risks and Complications', 'Possible complications include infection, bleeding, swelling, pain, injury to adjacent teeth or nerves, sinus involvement, implant failure or rejection, and the need for additional surgical procedures.'),
        section('Alternatives', 'Alternatives to implant surgery include removable dentures, fixed bridges, or no treatment, each carrying its own benefits and limitations.'),
        section('Post-Operative Care', 'Patients are expected to follow all post-operative instructions, attend scheduled follow-up visits, and maintain good oral hygiene to support healing.'),
      ],
    ),
    make(
      'Tooth Extraction',
      'Tooth Extraction',
      'This demonstration consent form describes the planned removal of one or more teeth, the associated risks, and aftercare expectations. Sample content for demonstration only.',
      [
        section('Procedure Overview', 'Tooth extraction involves the removal of a tooth from its socket in the bone under local anaesthesia, sometimes requiring surgical elevation or sectioning of the tooth.'),
        section('Risks and Complications', 'Risks include bleeding, swelling, infection, dry socket, injury to nearby teeth, nerves or sinuses, and, in rare cases, fracture of the jaw or root tips requiring further treatment.'),
        section('Alternatives', 'Depending on the diagnosis, alternatives may include root canal treatment, restorative procedures, or delaying treatment, with the risk of continued symptoms or worsening condition.'),
        section('Aftercare', 'Patients should bite on gauze as instructed, avoid disturbing the area, refrain from smoking, and follow the prescribed medication and hygiene guidance.'),
      ],
    ),
    make(
      'Root Canal Treatment',
      'Root Canal Treatment',
      'This demonstration consent form explains the proposed root canal treatment, its risks, and follow-up requirements. Sample content for demonstration only.',
      [
        section('Procedure Overview', 'Root canal treatment involves removing infected or inflamed pulp from inside the tooth, cleaning and shaping the root canal system, and sealing it with a filling material.'),
        section('Risks and Complications', 'Complications may include instrument separation, perforation, incomplete healing, post-treatment discomfort, discolouration of the tooth, and the possible need for retreatment, surgery, or extraction.'),
        section('Restoration', 'A treated tooth commonly requires a crown or other restoration, which is billed and performed separately. Failure to restore the tooth may result in fracture or treatment failure.'),
        section('Alternatives', 'The principal alternative to root canal treatment is extraction of the tooth, followed by replacement with a bridge, implant, or denture.'),
      ],
    ),
    make(
      'Wisdom Tooth Removal',
      'Wisdom Tooth Removal',
      'This demonstration consent form covers the surgical removal of wisdom teeth, associated risks, and recovery guidance. Sample content for demonstration only.',
      [
        section('Procedure Overview', 'Wisdom tooth removal is a surgical procedure performed under local anaesthesia, with or without sedation, to extract one or more third molars, which may require bone removal and tooth sectioning.'),
        section('Risks and Complications', 'Risks include pain, swelling, bruising, infection, dry socket, temporary or permanent nerve injury affecting the lip, cheek or tongue, sinus communication, trismus, and damage to adjacent teeth.'),
        section('Recovery', 'Swelling typically peaks within 48 to 72 hours. A soft diet, cold compresses, prescribed medication, and avoidance of smoking and straws support healing over one to two weeks.'),
        section('Alternatives', 'Alternatives may include monitoring, coronectomy, or medical management, depending on the position of the tooth and presenting symptoms.'),
      ],
    ),
    make(
      'Dental Crown Treatment',
      'Dental Crown Treatment',
      'This demonstration consent form describes the placement of a dental crown, including tooth preparation, risks, and care. Sample content for demonstration only.',
      [
        section('Procedure Overview', 'Crown treatment involves reducing the tooth under local anaesthesia, taking impressions or digital scans, and fitting a custom-made crown that covers the visible portion of the tooth.'),
        section('Risks and Complications', 'Possible issues include tooth sensitivity, pulp damage requiring root canal treatment, chipping or fracture of the crown, loosening, gum irritation, and the need for replacement over time.'),
        section('Longevity and Care', 'A crown\'s lifespan depends on oral hygiene, biting forces, and regular dental reviews. A treated tooth remains susceptible to decay at its margin.'),
        section('Alternatives', 'Alternatives include large fillings, onlays, veneers, or extraction, each with different durability and cost considerations.'),
      ],
    ),
    make(
      'General Dental Surgery',
      'General Dental Surgery',
      'This demonstration consent form is a general template covering routine dental surgical procedures, their risks, and aftercare. Sample content for demonstration only.',
      [
        section('Procedure Overview', 'The planned procedure will be performed under appropriate anaesthesia. The clinician will explain the specific steps before treatment begins and answer any questions.'),
        section('Risks and Complications', 'General risks of dental surgery include pain, swelling, bleeding, infection, adverse reaction to anaesthesia, and injury to nearby tissues, teeth, or nerves.'),
        section('Patient Responsibilities', 'Patients must disclose their full medical history and current medications, follow pre- and post-operative instructions, and attend all review appointments.'),
        section('Fees and Appointments', 'Treatment fees are as quoted. Missed or late-cancelled appointments may attract a fee in line with the clinic\'s policy.'),
      ],
    ),
  ];
}

export const DEFAULT_SETTINGS: ClinicSettings = {
  id: 'clinic',
  name: 'Bright Smile Dental Clinic',
  logo: null,
  phone: '',
  email: '',
  address: '',
  pin: null,
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('signed')) {
          db.createObjectStore('signed', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getTemplates(): Promise<ConsentTemplate[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll('templates')) as ConsentTemplate[];
    if (all.length === 0 && !(await db.get('templates', 'seeded'))) {
      const seeded = seedTemplates();
      const tx = db.transaction('templates', 'readwrite');
      for (const t of seeded) tx.store.put(t);
      tx.store.put(true, 'seeded');
      await tx.done;
      return seeded;
    }
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to load templates', err);
    throw new Error('Could not read saved templates from this device.');
  }
}

export async function saveTemplate(template: ConsentTemplate): Promise<void> {
  try {
    const db = await getDb();
    await db.put('templates', template);
  } catch (err) {
    console.error('Failed to save template', err);
    throw new Error('The template could not be saved. Check available storage on this device.');
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('templates', id);
  } catch (err) {
    console.error('Failed to delete template', err);
    throw new Error('The template could not be deleted from this device.');
  }
}

export async function getSignedRecords(): Promise<SignedConsent[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll('signed')) as SignedConsent[];
    return all.sort((a, b) => b.signedAt - a.signedAt);
  } catch (err) {
    console.error('Failed to load signed records', err);
    throw new Error('Could not read signed documents from this device.');
  }
}

export async function saveSignedRecord(record: SignedConsent): Promise<void> {
  try {
    const db = await getDb();
    await db.put('signed', record);
  } catch (err) {
    console.error('Failed to save signed record', err);
    throw new Error('The signed consent could not be saved. Check available storage on this device.');
  }
}

export async function deleteSignedRecord(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('signed', id);
  } catch (err) {
    console.error('Failed to delete signed record', err);
    throw new Error('The signed document could not be deleted from this device.');
  }
}

export async function getSettings(): Promise<ClinicSettings> {
  try {
    const db = await getDb();
    const stored = (await db.get('settings', 'clinic')) as ClinicSettings | undefined;
    return stored ?? { ...DEFAULT_SETTINGS };
  } catch (err) {
    console.error('Failed to load settings', err);
    throw new Error('Could not read clinic settings from this device.');
  }
}

export async function saveSettings(settings: ClinicSettings): Promise<void> {
  try {
    const db = await getDb();
    await db.put('settings', settings);
  } catch (err) {
    console.error('Failed to save settings', err);
    throw new Error('Clinic settings could not be saved on this device.');
  }
}

export interface BackupPayload {
  app: 'dental-consent-manager';
  version: number;
  exportedAt: number;
  templates: ConsentTemplate[];
  signed: SignedConsent[];
  settings: ClinicSettings;
}

export async function exportBackup(): Promise<BackupPayload> {
  const [templates, signed, settings] = await Promise.all([
    getTemplates(),
    getSignedRecords(),
    getSettings(),
  ]);
  return {
    app: 'dental-consent-manager',
    version: 1,
    exportedAt: Date.now(),
    templates,
    signed,
    settings: { ...settings, pin: null },
  };
}

export async function importBackup(payload: BackupPayload): Promise<{ templates: number; signed: number }> {
  if (payload?.app !== 'dental-consent-manager' || !Array.isArray(payload.templates) || !Array.isArray(payload.signed)) {
    throw new Error('This file is not a valid backup from this application.');
  }
  try {
    const db = await getDb();
    const tx = db.transaction(['templates', 'signed', 'settings'], 'readwrite');
    for (const t of payload.templates) {
      if (t && typeof t.id === 'string' && typeof t.title === 'string') {
        tx.objectStore('templates').put(t);
      }
    }
    for (const s of payload.signed) {
      if (s && typeof s.id === 'string' && typeof s.patientName === 'string') {
        tx.objectStore('signed').put(s);
      }
    }
    if (payload.settings && typeof payload.settings.name === 'string') {
      tx.objectStore('settings').put({ ...payload.settings, id: 'clinic' });
    }
    await tx.done;
    return { templates: payload.templates.length, signed: payload.signed.length };
  } catch (err) {
    console.error('Failed to import backup', err);
    throw new Error('The backup file could not be restored on this device.');
  }
}

export type { StoreInfo };
