/** Exact word/punctuation preservation; whitespace may be normalized. */
export const MAX_TRANSCRIPT_CHARS = 100_000;

export function alignDeletions(original, edited) {
  if (typeof original !== 'string' || typeof edited !== 'string') {
    throw new Error('Original and edited transcripts must be strings.');
  }
  if (original.length > MAX_TRANSCRIPT_CHARS || edited.length > MAX_TRANSCRIPT_CHARS) {
    throw new Error('Transcript exceeds the 100,000-character review limit.');
  }
  const source = [...original.matchAll(/\S+/gu)];
  const target = edited.match(/\S+/gu) || [];
  let next = 0;
  const kept = source.map(token => {
    if (next < target.length && token[0] === target[next]) { next++; return true; }
    return false;
  });
  if (next !== target.length) {
    throw new Error('Edit rejected: output added, rewrote, or reordered words. Only deletions are allowed.');
  }
  return { source, kept, originalWords: source.length, editedWords: target.length };
}

export function buildDeletionDiff(original, edited) {
  const { source, kept } = alignDeletions(original, edited);
  if (!source.length) return original ? [{ type: edited ? 'unchanged' : 'removed', text: original }] : [];
  const result = [];
  const add = (type, text) => {
    if (!text) return;
    if (result.at(-1)?.type === type) result.at(-1).text += text;
    else result.push({ type, text });
  };
  add(kept[0] ? 'unchanged' : 'removed', original.slice(0, source[0].index));
  source.forEach((token, i) => add(kept[i] ? 'unchanged' : 'removed',
    original.slice(token.index, source[i + 1]?.index ?? original.length)));
  return result;
}

/** Model explanations are not trusted; display metadata is derived from source alignment. */
export function validateEditedTranscript(original, value) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || typeof value.editedTranscript !== 'string') {
    throw new Error('Edit rejected: expected a JSON object containing an editedTranscript string.');
  }
  if ('removedSections' in value && !Array.isArray(value.removedSections)) {
    throw new Error('Edit rejected: removedSections must be an array when provided.');
  }
  if ('editingSummary' in value && (!value.editingSummary || typeof value.editingSummary !== 'object' || Array.isArray(value.editingSummary))) {
    throw new Error('Edit rejected: editingSummary must be an object when provided.');
  }
  const counts = alignDeletions(original, value.editedTranscript);
  const diff = buildDeletionDiff(original, value.editedTranscript);
  return {
    editedTranscript: value.editedTranscript,
    removedSections: diff.filter(part => part.type === 'removed' && part.text.trim()).map(part => ({
      originalText: part.text.trim(), reason: 'Removed in this proposed edit; review the meaning in context.', timestamp: 'Not inferred'
    })),
    editingSummary: {
      totalReductions: `${counts.originalWords ? ((1 - counts.editedWords / counts.originalWords) * 100).toFixed(1) : '0.0'}% of words`,
      keyImprovements: ['No added, rewritten, or reordered words passed validation.'],
      preservedElements: ['Retained words and punctuation match the source in order.'],
      suggestedBreakpoints: [],
    }
  };
}

export function parseEditingResponse(original, responseText) {
  if (typeof responseText !== 'string' || responseText.length > MAX_TRANSCRIPT_CHARS * 4) {
    throw new Error('Edit rejected: invalid or oversized provider response.');
  }
  let text = responseText.trim();
  const fence = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fence) text = fence[1].trim();
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error('Edit rejected: the provider did not return valid JSON.'); }
  return validateEditedTranscript(original, value);
}
