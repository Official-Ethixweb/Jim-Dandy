import { knowledgeBase, type KbDoc } from "@data/chatbot/kb";
import { preprocess, stem, words } from "./language";
import { canonicalOf, correctToken } from "./normalize";

/**
 * BM25 retrieval over the knowledge base. This is what lets the assistant
 * answer the long tail of questions ("should I use Drano?", "how long does a
 * sewer line last?") without an LLM: every phrasing is reduced to canonical,
 * stemmed terms and scored against each document's questions (weighted 3x),
 * keywords (1.5x), and answer text (1x).
 */

const STOP = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "am", "i", "you", "we", "they", "it", "my", "your", "our",
  "to", "of", "in", "on", "at", "for", "with", "and", "or", "but", "do", "does", "did", "can", "could", "will", "would",
  "should", "this", "that", "these", "those", "have", "has", "had", "me", "us", "what", "how", "when", "where", "why",
  "who", "which", "there", "here", "any", "about", "so", "if", "just", "get", "got", "please", "hi", "hello", "hey",
  "not", "no", "yes", "want", "need", "know", "tell", "let", "like", "from", "up", "out", "some", "much", "many",
  "going", "really", "also", "then", "than", "too", "very", "one", "all", "by", "as", "into", "over",
]);

export function termsOf(text: string): string[] {
  return words(preprocess(text).replace(/-/g, " "))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => stem(canonicalOf(correctToken(w))));
}

type Indexed = { doc: KbDoc; fields: { terms: Map<string, number>; length: number; weight: number }[] };

const K1 = 1.4;
const B = 0.7;

function countTerms(text: string): { terms: Map<string, number>; length: number } {
  const terms = new Map<string, number>();
  const list = termsOf(text);
  for (const t of list) terms.set(t, (terms.get(t) ?? 0) + 1);
  return { terms, length: list.length };
}

const index: Indexed[] = knowledgeBase.map((doc) => ({
  doc,
  fields: [
    { ...countTerms(doc.questions.join(" . ")), weight: 3 },
    { ...countTerms((doc.keywords ?? []).join(" . ")), weight: 1.5 },
    { ...countTerms(doc.answer), weight: 1 },
  ],
}));

const docFreq = new Map<string, number>();
for (const item of index) {
  const seen = new Set<string>();
  for (const f of item.fields) for (const t of f.terms.keys()) seen.add(t);
  for (const t of seen) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
}
const N = index.length;
const avgLen = [0, 1, 2].map((i) => index.reduce((sum, d) => sum + d.fields[i].length, 0) / N || 1);

function idf(term: string): number {
  const df = docFreq.get(term) ?? 0;
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

export type Retrieved = { doc: KbDoc; score: number; coverage: number };

/**
 * Returns the best documents for a message. `coverage` is the share of the
 * message's distinctive terms the top document actually contains - a guard
 * against one lucky keyword carrying an unrelated answer.
 */
export function retrieve(message: string, limit = 3): Retrieved[] {
  const query = Array.from(new Set(termsOf(message)));
  if (!query.length) return [];
  const results: Retrieved[] = [];
  for (const item of index) {
    let score = 0;
    let matched = 0;
    for (const term of query) {
      let termScore = 0;
      item.fields.forEach((f, i) => {
        const tf = f.terms.get(term);
        if (!tf) return;
        const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * (f.length / avgLen[i])));
        termScore += f.weight * idf(term) * norm;
      });
      if (termScore > 0) matched++;
      score += termScore;
    }
    if (score > 0) results.push({ doc: item.doc, score, coverage: matched / query.length });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A confident single answer, or null when the knowledge base doesn't really cover it. */
export function bestAnswer(message: string): Retrieved | null {
  const [top, second] = retrieve(message, 2);
  if (!top) return null;
  const termCount = new Set(termsOf(message)).size;
  const minScore = termCount <= 1 ? 9 : 7;
  if (top.score < minScore || top.coverage < (termCount <= 2 ? 0.5 : 0.4)) return null;
  // Two near-identical candidates from different topics means we don't know which one they meant.
  if (second && second.score > top.score * 0.97 && second.doc.service !== top.doc.service && top.coverage < 0.6) return null;
  return top;
}

const GENERIC_TERMS = new Set(termsOf("drain water leak problem fix work service repair need issue help do you have my our can not will stop keep going always really"));

/**
 * True when every distinctive word of the document's headline question also
 * appears in the message - so "my kitchen sink is backed up" can't be answered
 * with the dishwasher article just because it shares "sink" and "drain".
 */
export function subjectCovered(doc: KbDoc, message: string): boolean {
  const query = new Set(termsOf(message));
  const subject = termsOf(doc.questions[0]).filter((t) => !GENERIC_TERMS.has(t));
  return subject.length > 0 && subject.every((t) => query.has(t));
}
