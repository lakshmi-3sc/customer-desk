/**
 * Semantic embeddings using Voyage AI (recommended by Anthropic)
 * Generates 1024-dimensional vectors for pgvector similarity search
 * - One-time embedding of resolved tickets/KB articles (stored in pgvector)
 * - Query-only embedding when user creates new ticket (minimal API calls)
 * - Hybrid search: keyword filter + vector similarity
 */

const VOYAGE_MODEL = "voyage-3";
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

type VoyageEmbeddingResponse = {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
};

/**
 * Generate embedding using Voyage AI
 * Returns 1024-dimensional vector for pgvector
 * Cost-efficient: Free tier = 50K tokens/month (~10K embeddings)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty");
  }

  if (!process.env.VOYAGE_API_KEY) {
    console.warn(`[embeddings] VOYAGE_API_KEY not set, using keyword-only search`);
    return new Array(1024).fill(0);
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: text.trim(),
        model: VOYAGE_MODEL,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[embeddings] Voyage API error (${response.status}):`, detail);
      throw new Error(`Voyage API failed: ${detail}`);
    }

    const data = (await response.json()) as VoyageEmbeddingResponse;
    const embedding = data.data?.[0]?.embedding;

    if (Array.isArray(embedding) && embedding.every((val) => typeof val === "number")) {
      console.debug(`[embeddings] Generated embedding (${embedding.length}D, tokens: ${data.usage.total_tokens})`);
      return embedding;
    }

    throw new Error("No embedding in Voyage response");
  } catch (error) {
    console.error(`[embeddings] Failed to generate embedding:`, error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions must match");
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct / (magA * magB);
}

/**
 * Calculate cosine similarity between query embedding and candidates
 * Returns sorted array of candidates with similarity scores
 */
export function rankBySimilarity(
  queryEmbedding: number[],
  candidates: Array<{ id: string; embedding: string }>
): Array<{ id: string; similarity: number }> {
  return candidates
    .map((candidate) => {
      try {
        const candidateEmbedding = JSON.parse(candidate.embedding);
        if (
          !Array.isArray(candidateEmbedding) ||
          candidateEmbedding.length !== queryEmbedding.length ||
          !candidateEmbedding.every((value) => typeof value === "number")
        ) {
          console.warn(
            `Skipping embedding for candidate ${candidate.id}: expected ${queryEmbedding.length} dimensions, got ${candidateEmbedding.length}`
          );
          return null;
        }
        const similarity = cosineSimilarity(queryEmbedding, candidateEmbedding);
        return { id: candidate.id, similarity };
      } catch (error) {
        console.error(
          `Failed to parse embedding for candidate ${candidate.id}:`,
          error
        );
        return null;
      }
    })
    .filter((result): result is { id: string; similarity: number } => result !== null)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Batch generate embeddings
 * Async - uses Anthropic API to generate embeddings for multiple texts
 * Note: Processes texts individually since Anthropic batch API doesn't support embeddings
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  try {
    // Process each text individually
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      results.push(embedding);
    }

    return results;
  } catch (error) {
    console.error(`Failed to generate batch embeddings:`, error);
    throw error;
  }
}
