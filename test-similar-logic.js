// Test the word similarity function
function wordSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

// Test with actual tickets
const testTitle = "Database connection issue with report generation";
const resolvedTitles = [
  "Export to Excel drops columns when more than 50 products selected",
  "Reorder point calculation ignoring lead time buffer",
  "Auto-replenishment orders triggering on public holidays",
  "PP Gantt chart not rendering for more than 4 weeks",
  "PP module showing 404 error for production planner accounts"
];

console.log(`Test ticket: "${testTitle}"\n`);
console.log('Word similarity scores:');
resolvedTitles.forEach(title => {
  const score = wordSimilarity(testTitle, title);
  const percentage = Math.round(score * 100);
  console.log(`  ${percentage}% - "${title}"`);
});

console.log('\nThreshold analysis:');
console.log('  >= 40%: High confidence (no AI needed)');
console.log('  20-40%: Borderline (semantic AI check)');
console.log('  < 20%: Ignored (too dissimilar)');
