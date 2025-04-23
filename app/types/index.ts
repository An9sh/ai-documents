export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ClassificationCategory = string;

export interface DocumentMetadata {
  id: string;
  pineconeId?: string;
  filename: string;
  fileKey: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
  type: string;
  summary: string;
  pageCount: number;
  fileSize: number;
  namespace: string;
  sectionCount?: number;
  classificationData?: {
    classifications: Classification[];
  };
  certifications?: Certification[];
  licenses?: License[];
  education?: EducationRequirement[];
  experience?: ExperienceRequirement[];
}

export interface ClassificationRequirement {
  id: string;
  name: string;
  description: string;
  color: string;
  category: ClassificationCategory;
  requirements: string[];
  matchThreshold: number;
}

export interface ClassificationDetails {
  requirements: {
    matched: string[];
    missing: string[];
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
    matchedAt: string;
    confidence: ConfidenceLevel;
    matchedRequirements: string[];
    rawMatchReason: string;
    threshold: number;
    isMatched: boolean;
    documentInfo: {
      type: string;
      size: number;
      sectionCount?: number;
    };
  };
  scores?: {
    vector: number;
    ai: number;
    final: number;
  };
}

export interface Classification {
  documentName: string | undefined;
  updatedAt: string | number | Date;
  matchDetails: any;
  id: string;
  documentId: string;
  requirementId: string;
  score: number;
  confidence: ConfidenceLevel;
  isPrimary: boolean;
  isSecondary: boolean;
  isMatched: boolean;
  details: ClassificationDetails;
}

export interface ClassificationData {
  classifications: Classification[];
}

export interface DocumentMatch {
  id: string;
  documentId: string;
  requirementId: string;
  filename: string;
  documentName?: string;
  type: string;
  size: number;
  matchPercentage: number;
  matchedRequirements: string[];
  rawMatchReason: string;
  isMatched: boolean;
}

export interface RequirementData {
  classifications: Classification[];
  matches: DocumentMatch[];
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