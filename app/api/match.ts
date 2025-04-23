import { DocumentMetadata } from "../../app/types";
import { ClassificationRequirement, ParsedResume} from '../types/resume';

export class MatchAPI {
  private static async analyzeDocument(
    doc: DocumentMetadata & { userId?: string },
    requirement: ClassificationRequirement,
    token: string,
    maxRetries = 3,
    retryDelay = 5000
  ): Promise<ParsedResume | null> {
    let retries = 0;
    let lastError: Error | null = null;
    
    while (retries < maxRetries) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            document: {
              ...doc,
              id: doc.id,
              userId: doc.userId,
            },
            requirement
          })
        });

        if (response.status === 404) {
          console.log(`Document ${doc.pineconeId || doc.id} not found in index, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        lastError = error as Error;
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    console.error(`Failed to analyze document ${doc.pineconeId || doc.id} after ${maxRetries} attempts`, lastError);
    return null;
  }

  // private static buildQuestion(requirement: ClassificationRequirement) {
  //   if (requirement.category === 'normal') {
  //     // For normal documents, use a simple question format
  //     return `Which documents contain information about "${requirement.name}"? 
  //     Specifically looking for documents that mention: ${requirement.requirements?.join(', ')}`;
  //   }
  // }

  // public static async syncClassification(
  //   documents: DocumentMetadata[],
  //   requirement: ClassificationRequirement,
  //   token: string,
  //   userId: string
  // ): Promise<ParsedResume[]> {
  //   const results: ParsedResume[] = [];
    
  //   for (const doc of documents) {
  //     const result = await this.analyzeDocument({ ...doc, userId }, requirement, token);
  //     if (result) {
  //       results.push(result);
  //     }
  //   }
  //   return results;
  // }

  public static async autoClassifyDocuments(
    documents: DocumentMetadata[],
    requirements: ClassificationRequirement[],
    token: string,
    userId: string
  ): Promise<Map<string, ParsedResume[]>> {
    console.log('Starting autoClassifyDocuments with:', {
      documentCount: documents.length,
      requirementCount: requirements.length,
      mode: documents.length === 1 ? 'single document' : 'batch',
      operation: requirements.length === 1 ? 'manual sync' : 'auto-classify'
    });

    const results = new Map<string, ParsedResume[]>();
    const batchSize = 3;
    const delayBetweenBatches = 1000;
    
    // Initialize results map for each requirement
    requirements.forEach(req => {
      results.set(req.id, []);
      console.log(`Initialized results for requirement: ${req.name} (${req.id})`);
    });
    
    // If it's a single document, process it immediately
    if (documents.length === 1) {
      const doc = documents[0];
      console.log(`Processing single document: ${doc.filename || doc.id}`);
      
      for (const requirement of requirements) {
        try {
          const result = await this.analyzeDocument({ ...doc, userId }, requirement, token);
          if (result) {
            console.log(`Found match for document ${doc.filename || doc.id} with requirement ${requirement.name}`);
            const currentResults = results.get(requirement.id) || [];
            results.set(requirement.id, [...currentResults, result]);
          }
        } catch (error) {
          console.error(`Error processing document ${doc.filename || doc.id} for requirement ${requirement.name}:`, error);
        }
      }
    } else {
      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(documents.length/batchSize)}`);
        
        const batchPromises: Promise<void>[] = [];

        for (const doc of batch) {
          console.log(`Processing document: ${doc.filename || doc.id}`);
          
          for (const requirement of requirements) {
            const promise = async () => {
              try {
                const result = await this.analyzeDocument({ ...doc, userId }, requirement, token);
                if (result) {
                  console.log(`Found match for document ${doc.filename || doc.id} with requirement ${requirement.name}`);
                  const currentResults = results.get(requirement.id) || [];
                  results.set(requirement.id, [...currentResults, result]);
                }
              } catch (error) {
                console.error(`Error processing document ${doc.filename || doc.id} for requirement ${requirement.name}:`, error);
              }
            };
            batchPromises.push(promise());
          }
        }

        await Promise.all(batchPromises);

        if (i + batchSize < documents.length) {
          console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
    }
    
    // Log final results
    requirements.forEach(req => {
      const matches = results.get(req.id) || [];
      console.log(`Final results for ${req.name}: ${matches.length} matches`);
    });
    
    return results;
  }
} 