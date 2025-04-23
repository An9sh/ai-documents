// export class RequirementsClassifier {
//   static buildQuestionForRequirement(requirement: any) {
//     const requirementText = `${requirement.name}${requirement.description ? ': ' + requirement.description : ''}`;
    
//     let prompt = `Analyze if the document matches the following requirement: "${requirementText}"`;

//     if (requirement.requirements && requirement.requirements.length > 0) {
//       prompt += `\n\nKey requirements to evaluate:\n${requirement.requirements.map((req: string) => `- ${req}`).join('\n')}`;
//     }

//     prompt += `\n\nEvaluation criteria:
// 1. Direct match with stated requirements
// 2. Relevance and depth of experience
// 3. Specific examples or achievements
// 4. Overall alignment with the requirement

// Provide a concise analysis in JSON format with:
// - score (0-100): Based on overall match quality
// - match (true/false): Whether it meets the minimum threshold
// - reason: Brief 1-2 line explanation focusing on key points
// - requirement: The exact requirement being evaluated`;

//     return prompt;
//   }

//   static async fetchDocumentInformation(question: string, documentIds: string[], token: string, userId: string, requirementId: string) {
//     try {
//       // Log the operation context
//       const operationType = documentIds.length === 1 ? 'Single document evaluation' : 'Multiple documents evaluation';
//       console.log(`${operationType} - Processing ${documentIds.length} document(s) for requirement ${requirementId}`);

//       const response = await fetch(`/api/question`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify({
//           question,
//           documentIds,
//           userId,
//           requirementId,
//           requirement: question.split('"')[1],
//           isSingleDocument: documentIds.length === 1
//         })
//       });

//       if (!response.ok) {
//         throw new Error('Failed to fetch document information');
//       }

//       const data = await response.json();
      
//       // Add operation context to the response
//       return {
//         ...data,
//         requirementId,
//         requirement: question.split('"')[1],
//         question: question,
//         operationType,
//         documentCount: documentIds.length
//       };
//     } catch (error) {
//       console.error('Error fetching document information:', error);
//       return null;
//     }
//   }
// } 