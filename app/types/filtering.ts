export interface Certification {
  id: string;
  name: string;
  isRequired: boolean;
}

export interface License {
  id: string;
  name: string;
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

export interface FilteringRequirements {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  threshold: number;
}

export const categories: Category[] = [
  { id: 'software-engineer', name: 'Software Engineer', threshold: 70 },
  { id: 'data-scientist', name: 'Data Scientist', threshold: 70 },
  { id: 'product-manager', name: 'Product Manager', threshold: 70 },
  { id: 'ux-designer', name: 'UX Designer', threshold: 70 },
  { id: 'devops-engineer', name: 'DevOps Engineer', threshold: 70 },
]; 