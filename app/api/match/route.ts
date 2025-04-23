// import { NextResponse } from 'next/server';
// import { verifyFirebaseToken } from '../../lib/firebase-admin';
// import { createClassification } from '../../lib/db/classifications';
// import { ClassificationRequirement, DocumentMatch, ConfidenceLevel } from '../../types/resume';
// import { Classification } from '../../types';
// import { embedder } from '../embeddings/route';

// function getConfidenceLevel(score: number): ConfidenceLevel {
//   if (score >= 100) return 'high';
//   if (score >= 75) return 'medium';
//   return 'low';
// }

// export async function POST(request: Request) {
//   try {
//     const authHeader = request.headers.get('Authorization');
  
//     if (!authHeader?.startsWith('Bearer ')) {
//       return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
//     }

//     const token = authHeader.split('Bearer ')[1];
//     let userId: string;
    
//     try {
//       const decodedToken = await verifyFirebaseToken(token);
//       if (!decodedToken?.uid) {
//         return NextResponse.json({ error: "Invalid token" }, { status: 401 });
//       }
//       userId = decodedToken.uid;
//     } catch (error) {
//       console.error('Token verification error:', error);
//       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
//     }

//     const { documents, requirements } = await request.json();
//     if (!Array.isArray(documents) || !Array.isArray(requirements)) {
//       return new NextResponse('Invalid request body', { status: 400 });
//     }

//     const results: Record<string, { matches: DocumentMatch[] }> = {};

//     // Process each requirement
//     for (const requirement of requirements) {
//       const matches: DocumentMatch[] = [];

//       // Process each document for this requirement
//       for (const document of documents) {
//         try {
//           // Get document embedding
//           const docEmbedding = await embedder.embed(document.content, {
//             id: document.id,
//             type: 'document'
//           });

//           // Get requirement embedding
//           const reqEmbedding = await embedder.embed(requirement.requirements.join(' '), {
//             id: requirement.id,
//             type: 'requirement'
//           });

//           // Calculate similarity and confidence
//           const similarity = calculateCosineSimilarity(docEmbedding.values, reqEmbedding.values);
//           const matchPercentage = similarity * 100;
//           const confidenceScore = matchPercentage >= 80 ? 100 : matchPercentage >= 60 ? 75 : 50;
//           const confidenceLevel = getConfidenceLevel(confidenceScore);

//           // Create match object
//           const match: DocumentMatch = {
//             id: `${document.id}-${requirement.id}`,
//             documentId: document.id,
//             matchPercentage,
//             confidence: confidenceLevel,
//             matchedRequirements: requirement.requirements,
//             rawMatchReason: `Document matches ${matchPercentage.toFixed(1)}% of requirements with ${confidenceLevel} confidence (${confidenceScore}%)`,
//             isMatched: matchPercentage >= requirement.matchThreshold,
//             filename: document.filename,
//             type: document.type || 'document',
//             size: document.size || 0
//           };

//           // Create classification record
//           const classification: Omit<Classification, 'id'> = {
//             documentId: document.id,
//             requirementId: requirement.id,
//             score: matchPercentage,
//             confidence: confidenceLevel,
//             isPrimary: matchPercentage >= requirement.matchThreshold,
//             isSecondary: matchPercentage >= requirement.matchThreshold * 0.8,
//             isMatched: matchPercentage >= requirement.matchThreshold,
//             details: {
//               requirements: {
//                 matched: requirement.requirements,
//                 missing: []
//               },
//               text: match.rawMatchReason,
//               metadata: {
//                 documentId: document.id,
//                 filename: document.filename,
//                 lines: { from: 0, to: 0 },
//                 userId: userId,
//                 matchedAt: new Date().toISOString(),
//                 confidence: confidenceLevel,
//                 matchedRequirements: requirement.requirements,
//                 rawMatchReason: match.rawMatchReason
//               }
//             }
//           };

//           await createClassification(classification);
//           matches.push(match);
//         } catch (error) {
//           console.error(`Error processing document ${document.id}:`, error);
//         }
//       }

//       results[requirement.id] = { matches };
//     }

//     return NextResponse.json(results);
//   } catch (error) {
//     console.error('Error in match API:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }

// function calculateCosineSimilarity(a: number[], b: number[]): number {
//   if (a.length !== b.length) return 0;
  
//   const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
//   const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
//   const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
//   return dotProduct / (magnitudeA * magnitudeB);
// } 