import test from 'node:test';
import assert from 'node:assert/strict';
import { alignDeletions, buildDeletionDiff, parseEditingResponse, validateEditedTranscript, MAX_TRANSCRIPT_CHARS } from '../src/lib/transcriptValidation.js';
import { syntheticTranscript, syntheticEditedTranscript } from '../src/examples/syntheticDemo.js';

test('synthetic demonstration is a valid deletion-only edit', () => {
  const result = validateEditedTranscript(syntheticTranscript, { editedTranscript: syntheticEditedTranscript });
  assert.ok(result.removedSections.length > 0);
  assert.ok(result.editingSummary.totalReductions.includes('% of words'));
});
test('unchanged text and normalized whitespace are accepted', () => {
  assert.equal(alignDeletions('Alpha  beta.\nGamma.', 'Alpha beta. Gamma.').editedWords, 3);
});
for (const [name, output] of [['addition', 'Alpha beta. invented'], ['rewrite', 'Alpha changed.'], ['reorder', 'beta. Alpha'], ['punctuation rewrite', 'Alpha beta!']]) {
  test(`rejects ${name}`, () => assert.throws(() => alignDeletions('Alpha beta.', output), /rejected/));
}
test('repeated words cannot be copied more times than in source', () => {
  assert.throws(() => alignDeletions('one two one', 'one one one'), /rejected/);
  assert.equal(alignDeletions('one two one', 'one one').editedWords, 2);
});
test('Unicode tokens preserve case and punctuation', () => {
  assert.equal(alignDeletions('Café naïve 世界.', 'Café 世界.').editedWords, 2);
  assert.throws(() => alignDeletions('Café 世界.', 'café 世界.'), /rejected/);
});
test('full deletion is visible in diff', () => {
  assert.deepEqual(buildDeletionDiff('Alpha beta.', ''), [{ type: 'removed', text: 'Alpha beta.' }]);
});
test('diff preserves original text exactly, including leading spaces and paragraph gaps', () => {
  const source = '  Alpha beta.\n\nGamma delta.';
  const diff = buildDeletionDiff(source, 'Alpha Gamma');
  assert.equal(diff.map(part => part.text).join(''), source);
  assert.equal(diff.filter(p => p.type === 'unchanged').map(p => p.text).join('').trim(), 'Alpha Gamma');
});
test('long paragraph deletion is aligned by tokens, not paragraph positions', () => {
  const prefix = 'filler '.repeat(1000);
  const diff = buildDeletionDiff(prefix + '\nKeep these words.', 'Keep these words.');
  assert.equal(diff.filter(p => p.type === 'unchanged').map(p => p.text).join(''), 'Keep these words.');
});
test('parses a single fenced JSON response', () => {
  assert.equal(parseEditingResponse('Alpha beta.', '```json\n{"editedTranscript":"Alpha"}\n```').editedTranscript, 'Alpha');
});
for (const value of ['raw prose', '{}', 'null', '[]', '{"editedTranscript":42}', '{"editedTranscript":"Alpha","removedSections":{}}']) {
  test(`rejects invalid response ${value}`, () => assert.throws(() => parseEditingResponse('Alpha beta.', value), /rejected/));
}
test('model explanations are replaced with source-derived deletion records', () => {
  const result = validateEditedTranscript('Alpha beta.', { editedTranscript: 'Alpha', removedSections: [{ originalText: 'invented', reason: 'invented' }], editingSummary: { keyImprovements: ['unverified claim'] } });
  assert.equal(result.removedSections[0].originalText, 'beta.');
  assert.ok(!JSON.stringify(result).includes('invented'));
  assert.ok(!JSON.stringify(result).includes('unverified claim'));
});
test('bounds transcript and response lengths', () => {
  assert.throws(() => alignDeletions('x'.repeat(MAX_TRANSCRIPT_CHARS + 1), ''), /limit/);
  assert.throws(() => parseEditingResponse('a', 'x'.repeat(MAX_TRANSCRIPT_CHARS * 4 + 1)), /oversized/);
});
