import { getCategories, Category } from './filtering';

// export interface Certification {
//   id: string;
//   name: string;
//   aliases?: string[];
//   isRequired: boolean;
// }

// export interface License {
//   id: string;
//   name: string;
//   aliases?: string[];
//   isRequired: boolean;
// }

// export interface EducationRequirement {
//   degree: string;
//   field: string;
//   required: boolean;
// }

// export interface ExperienceRequirement {
//   skill: string;
//   yearsRequired: number;
//   required: boolean;
// }

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ClassificationCategory = string;

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
  details: ClassificationDetails;
}

export interface ClassificationData {
  classifications: Classification[];
}

export interface ParsedResume {
  id: string;
  name: string;
  filename?: string;
  classificationData?: ClassificationData;
}

// export interface ParsedResume {
//   id: string;
//   name: string;
//   email?: string;
//   phone?: string;
//   location?: string;
//   summary?: string;
//   experience?: {
//     title: string;
//     company: string;
//     startDate: string;
//     endDate?: string;
//     description?: string;
//   }[];
//   education?: {
//     degree: string;
//     field: string;
//     institution: string;
//     startDate: string;
//     endDate?: string;
//     gpa?: number;
//   }[];
//   skills?: string[];
//   classificationData?: ClassificationData;
// }

export interface CustomCategory extends Category {
  isCustom: boolean;
}

export interface DocumentMatch {
  id: string;
  documentId: string;
  matchPercentage: number;
  confidence: ConfidenceLevel;
  matchedRequirements: string[];
  rawMatchReason: string;
  isMatched: boolean;
  filename: string;
  type: string;
  size: number;
}

export interface RequirementData {
  classifications: Classification[];
  matches: DocumentMatch[];
} 