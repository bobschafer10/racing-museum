export function museumOcrRpcQuery(query: string, collection: "newspaper" | "print") {
  const clean = query.trim()
  if (collection !== "newspaper" || !clean) return clean

  // Two-word newspaper searches are most often driver names or fixed phrases
  // (for example "Tony Strupp" or "point standings"). Treat them as a phrase
  // so unrelated occurrences of the two words on one newspaper page do not
  // become false-positive search results. Existing quoted/boolean searches are
  // left untouched so advanced search syntax continues to work.
  if (/\b(?:AND|OR|NOT)\b/i.test(clean) || /["()]/.test(clean)) return clean

  const terms = clean
    .replace(/[’']/g, "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)

  if (terms.length === 2) {
    return `"${clean.replace(/"/g, " ")}"`
  }

  return clean
}
