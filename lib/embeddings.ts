/**
 * Real semantic embeddings using the configured embedding endpoint
 * Generates 1024-dimensional vectors for pgvector similarity search
 */

const ANTHROPIC_VERSION = "2023-06-01";
const EMBEDDING_MODEL = process.env.ANTHROPIC_EMBEDDING_MODEL ?? "claude-3-5-sonnet-20241022";

type EmbeddingResponse = {
  embedding?: number[];
  embeddings?: number[][];
  data?: Array<{ embedding?: number[] }>;
};

/**
 * Generate embedding for text using Anthropic's embedding model
 * Returns a 1024-dimensional vector compatible with pgvector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty");
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim(),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Embedding API failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    const embedding = data.embedding ?? data.embeddings?.[0] ?? data.data?.[0]?.embedding;

    if (Array.isArray(embedding) && embedding.every((value) => typeof value === "number")) {
      return embedding;
    }

    throw new Error("No embedding returned from Anthropic API");
  } catch (error) {
    console.error(`Failed to generate embedding for text: "${text.substring(0, 50)}..."`, error);
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
