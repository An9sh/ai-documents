import { DocumentMetadata } from "@/app/types";
import { ClassificationRequirement, ParsedResume } from '../types/resume';

export class MatchAPI {
  private static async analyzeDocument(
    doc: DocumentMetadata,
    requirement: ClassificationRequirement
  ): Promise<ParsedResume | null> {
    try {
      const question = this.buildQuestion(requirement);
      console.log('Sending question to API:', question);
      
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          documentIds: [doc.id],
          userId: 'default-user'
        }),
      });

      if (!response.ok) {
        console.error(`Failed to analyze document ${doc.id}:`, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('Question API response:', data);

      // Process the response from question route
      if (!data || Object.keys(data).length === 0) {
        console.error('Empty response from question API');
        return null;
      }

      // Get the vector similarity score and normalize it
      const vectorScore = data.score || 0;
      const normalizedScore = Math.min(100, Math.max(0, vectorScore * 100));
      console.log('Vector score:', vectorScore, 'Normalized score:', normalizedScore);

      return {
        id: doc.id,
        name: doc.filename || 'Unknown Document',
        classificationData: {
          classifications: [{
            requirementId: requirement.id,
            score: normalizedScore,
            confidence: vectorScore,
            isPrimary: normalizedScore >= requirement.matchThreshold,
            isSecondary: normalizedScore >= requirement.matchThreshold * 0.7,
            details: {
              certifications: { matched: [], missing: [] },
              licenses: { matched: [], missing: [] },
              education: { matched: [], missing: [] },
              experience: { matched: [], missing: [] },
              text: data.text || '',
              metadata: {
                documentId: doc.id,
                filename: doc.filename || 'Unknown Document',
                lines: data.lines || { from: 0, to: 0 },
                userId: data.userId || 'default-user'
              }
            }
          }]
        }
      };
    } catch (error) {
      console.error(`Error analyzing document ${doc.id}:`, error);
      return null;
    }
  }

  private static buildQuestion(requirement: ClassificationRequirement): string {
    return `Analyze if this candidate matches the following requirements:
      - ${requirement.name}
      - Description: ${requirement.description}
      - Certifications: ${requirement.certifications.map(c => c.name).join(', ')}
      - Licenses: ${requirement.licenses.map(l => l.name).join(', ')}
      - Education: ${requirement.educationRequirements.map(e => `${e.degree} in ${e.field} (${e.required ? 'Required' : 'Preferred'})`).join(', ')}
      - Experience: ${requirement.experienceRequirements.map(e => `${e.skill} (${e.yearsRequired}+ years) (${e.required ? 'Required' : 'Preferred'})`).join(', ')}`;
  }

  public static async syncClassification(
    documents: DocumentMetadata[],
    requirement: ClassificationRequirement
  ): Promise<ParsedResume[]> {
    const results: ParsedResume[] = [];
    
    for (const doc of documents) {
      const result = await this.analyzeDocument(doc, requirement);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
} 