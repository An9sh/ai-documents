import { ParsedResume, ClassificationRequirement } from '../types/resume';

export function groupResumesByClassification(
  resumes: ParsedResume[],
  requirements: ClassificationRequirement[]
): Map<string, ParsedResume[]> {
  const grouped = new Map<string, ParsedResume[]>();
  
  // Initialize groups for each requirement
  requirements.forEach(req => {
    grouped.set(req.id, []);
  });
  
  // Add unclassified group
  grouped.set('unclassified', []);
  
  // Group resumes based on their classifications
  resumes.forEach(resume => {
    if (!resume.classificationData) {
      grouped.get('unclassified')?.push(resume);
      return;
    }
    
    const classifications = resume.classificationData.classifications;
    let assigned = false;
    
    // First try to assign to primary classification
    const primaryClassification = classifications.find(c => c.isPrimary);
    if (primaryClassification) {
      const requirement = requirements.find(r => r.id === primaryClassification.requirementId);
      if (requirement && primaryClassification.score >= requirement.matchThreshold) {
        grouped.get(requirement.id)?.push(resume);
        assigned = true;
      }
    }
    
    // If no primary classification or doesn't meet threshold, try secondary
    if (!assigned) {
      const secondaryClassification = classifications.find(c => c.isSecondary);
      if (secondaryClassification) {
        const requirement = requirements.find(r => r.id === secondaryClassification.requirementId);
        if (requirement && secondaryClassification.score >= requirement.matchThreshold) {
          grouped.get(requirement.id)?.push(resume);
          assigned = true;
        }
      }
    }
    
    // If still not assigned, add to unclassified
    if (!assigned) {
      grouped.get('unclassified')?.push(resume);
    }
  });
  
  return grouped;
} 