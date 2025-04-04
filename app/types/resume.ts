export interface Certification {
  id: string;
  name: string;
  aliases?: string[];
  isRequired: boolean;
}

export interface License {
  id: string;
  name: string;
  aliases?: string[];
  isRequired: boolean;
}

export interface EducationRequirement {
  degree: string;
  field: string;
  required: boolean;
}

export interface ExperienceRequirement {
  skill: string;
  yearsRequired: number;
  required: boolean;
}

export interface ClassificationRequirement {
  id: string;
  name: string;
  description: string;
  color: string;
  certifications: Certification[];
  licenses: License[];
  educationRequirements: EducationRequirement[];
  experienceRequirements: ExperienceRequirement[];
  minimumYearsOverallExperience: number;
  matchThreshold: number;
}

export interface ClassificationDetails {
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
  text?: string;
  metadata?: {
    documentId: string;
    filename: string;
    lines: {
      from: number;
      to: number;
    };
    userId: string;
  };
}

export interface Classification {
  requirementId: string;
  score: number;
  confidence: number;
  isPrimary: boolean;
  isSecondary: boolean;
  details: ClassificationDetails;
}

export interface ClassificationData {
  classifications: Classification[];
}

export interface ParsedResume {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }[];
  education?: {
    degree: string;
    field: string;
    institution: string;
    startDate: string;
    endDate?: string;
    gpa?: number;
  }[];
  skills?: string[];
  certifications?: Certification[];
  licenses?: License[];
  classificationData?: ClassificationData;
} 