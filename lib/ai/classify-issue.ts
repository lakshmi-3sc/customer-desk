import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function classifyIssue(title: string, description: string) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for a Supply Network Planning (SNP) SaaS platform.

The platform has 3 modules: Replenishment Planning, Production Planning, Raw Material Planning.

Analyze this support ticket and respond ONLY with a valid JSON object, no explanation:

Title: ${title}
Description: ${description}

Respond with exactly this JSON:
{
  "category": "one of [FEATURE_REQUEST, BUG, DATA_ACCURACY, PERFORMANCE, ACCESS_SECURITY]",
  "priority": "one of [LOW, MEDIUM, HIGH, CRITICAL]",
  "reasoning": "one sentence explanation",
  "module": "one of [Replenishment Planning, Production Planning, Raw Material Planning, General]",
  "keywords": ["keyword1", "keyword2"]
}

Priority rules:
- CRITICAL: production down, data flowing to external systems incorrectly, compliance risk, blocking all users
- HIGH: major feature broken, affects multiple users, no workaround
- MEDIUM: feature partially broken, workaround exists
- LOW: cosmetic, minor, single user affected

Category rules:
- DATA_ACCURACY: wrong forecast, wrong quantities, incorrect plan output, model results wrong
- PERFORMANCE: slow, timeout, downtime, server error, scaling
- ACCESS_SECURITY: login, SSO, permissions, role access, password
- BUG: crash, error, broken feature, not saving, not loading
- FEATURE_REQUEST: new feature, enhancement, missing functionality`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const json = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json);
}
