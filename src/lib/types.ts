export interface ConsentSection {
  id: string;
  heading: string;
  body: string;
}

export interface ConsentTemplate {
  id: string;
  title: string;
  treatmentName: string;
  intro: string;
  sections: ConsentSection[];
  acknowledgment: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClinicSettings {
  id: 'clinic';
  name: string;
  logo: string | null;
  phone: string;
  email: string;
  address: string;
  pin: string | null;
}

export interface SignedConsent {
  id: string;
  templateId: string;
  templateTitle: string;
  treatmentName: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  treatmentDate: string;
  agreementSnapshot: {
    intro: string;
    sections: ConsentSection[];
    acknowledgment: string;
  };
  signatureDataUrl: string;
  signedAt: number;
  archived: boolean;
}

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
