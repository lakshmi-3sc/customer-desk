import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function classifyIssue(title: string, description: string) {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a support classifier for 3SC, a Supply Network Planning SaaS.\n    Classify this ticket and respond ONLY with valid JSON, no explanation.\n\n    Title: ${title}\n    Description: ${description}\n\n    Respond with exactly this JSON:\n    {\n      "category": "one of [FEATURE_REQUEST, BUG, DATA_ACCURACY, PERFORMANCE, ACCESS_SECURITY]",\n      "priority": "one of [LOW, MEDIUM, HIGH, CRITICAL]",\n      "reasoning": "one sentence explanation",\n      "module": "one of [Replenishment Planning, Production Planning, Raw Material Planning, General]",\n      "keywords": ["keyword1", "keyword2"]\n    }`,
        },
      ],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  } catch {
    return {
      category: "BUG",
      priority: "MEDIUM",
      module: "General",
      reasoning: "Could not auto-classify",
      likelyCause: "",
      suggestedTags: [],
    };
  }
}
