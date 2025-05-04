// /lib/utils/parse-ai-response.ts

export function parseAIResponse(responseContent: any, question: string) {
    try {
      const responseText = typeof responseContent === 'string'
        ? responseContent
        : JSON.stringify(responseContent);
  
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
      if (!jsonMatch) {
        throw new Error("No JSON found");
      }
  
      const cleanedJson = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/```json|```/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
  
      const parsed = JSON.parse(cleanedJson);
  
      if (parsed.score === undefined || parsed.match === undefined || parsed.reason === undefined) {
        throw new Error("Incomplete AI response fields");
      }

    //   console.log("Parsed AI response:", parsed);
      return parsed;
    } catch (error) {
      console.error("AI parsing error:", error);
  
      const requirementMatch = question.match(/\"([^\"]+)\"/);
      const requirement = requirementMatch ? requirementMatch[1] : question;
  
      return {
        score: 0,
        match: false,
        reason: "Failed to parse AI response",
        requirement,
      };
    }
  }
  