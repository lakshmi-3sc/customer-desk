// lib/ai/similarIssues.ts
export async function findSimilarIssues(title: string, description: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `A user is raising a new support ticket on a Supply Network Planning SaaS:

Title: ${title}
Description: ${description}

Here are past resolved issues from our database:
${await getResolvedIssuesSummary()}  // fetch last 100 resolved issues titles + resolutions

Which 2-3 past issues are most similar to this new one? 
Respond ONLY with JSON:
{
  "similarIssues": [
    {
      "ticketKey": "ISS-006",
      "title": "...",
      "resolution": "...",
      "similarity": "high/medium",
      "reason": "one sentence why this is similar"
    }
  ],
  "likelySelfResolvable": true/false
}`,
      },
    ],
  });

  return JSON.parse(response.content[0].text);
}
