function wordSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

const test = "Excel export missing columns when 60 products selected";
const resolved = "Export to Excel drops columns when more than 50 products selected";
const score = wordSimilarity(test, resolved);
console.log(`Test: "${test}"`);
console.log(`Resolved: "${resolved}"`);
console.log(`Similarity: ${Math.round(score * 100)}%`);
console.log(`Will match (>= 20%): ${score >= 0.2 ? '✓ YES' : '✗ NO'}`);
