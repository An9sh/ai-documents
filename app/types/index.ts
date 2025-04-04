export interface DocumentMetadata {
  id: string;
  filename: string;
  uploadedAt: Date;
  summary: string;
  pageCount: number;
  fileSize: number;
  namespace: string;
  type: string;
  classificationData?: {
    classifications: Classification[];
  };
  certifications?: Certification[];
  licenses?: License[];
  education?: EducationRequirement[];
  experience?: ExperienceRequirement[];
}

export interface Classification {
  requirementId: string;
  score: number;
  confidence: number;
  isPrimary: boolean;
  isSecondary: boolean;
  details: {
    certifications: {
      matched: Certification[];
      missing: Certification[];
    };
    licenses: {
      matched: License[];
      missing: License[];
    };
    education: {
      matched: EducationRequirement[];
      missing: EducationRequirement[];
    };
    experience: {
      matched: ExperienceRequirement[];
      missing: ExperienceRequirement[];
    };
  };
}

export interface Certification {
  name: string;
  issuer?: string;
  date?: string;
  expiryDate?: string;
}

export interface License {
  name: string;
  issuer?: string;
  date?: string;
  expiryDate?: string;
}

export interface EducationRequirement {
  institution: string;
  degree: string;
  field: string;
  startDate?: string;
  endDate?: string;
  gpa?: number;
  required: boolean;
}

export interface ExperienceRequirement {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  skills?: string[];
  skill: string;
  yearsRequired: number;
  required: boolean;
}

export interface ParsedResume {
  id: string;
  name: string;
  certifications?: Certification[];
  licenses?: License[];
  education?: EducationRequirement[];
  experience?: ExperienceRequirement[];
  classificationData?: {
    classifications: Classification[];
  };
} 