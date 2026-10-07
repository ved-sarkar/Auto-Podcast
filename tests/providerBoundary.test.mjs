import test from 'node:test';
import assert from 'node:assert/strict';
import GeminiService from '../src/services/geminiService.js';

function fixture(responseText) {
  const calls = [];
  const client = { getGenerativeModel: () => ({ generateContent: async input => { calls.push(input); return { response: { text: () => responseText } }; } }) };
  const service = new GeminiService('synthetic-placeholder-not-a-credential', null, { modelName: 'mock-model', client });
  return { service, calls };
}
test('configuration makes no generation request', () => {
  const { calls } = fixture(''); assert.equal(calls.length, 0);
});
test('provider response is validated before success is returned', async () => {
  const { service } = fixture('{"editedTranscript":"Alpha invented"}');
  const result = await service.editPodcastTranscript('Alpha beta.');
  assert.equal(result.success, false); assert.match(result.error, /rejected/);
});
test('malformed response no longer falls back to raw text', async () => {
  const { service } = fixture('not JSON');
  assert.equal((await service.editPodcastTranscript('Alpha beta.')).success, false);
});
test('valid provider edit returns derived metadata', async () => {
  const { service } = fixture('{"editedTranscript":"Alpha"}');
  const result = await service.editPodcastTranscript('Alpha beta.');
  assert.equal(result.success, true); assert.equal(result.data.removedSections[0].originalText, 'beta.');
});
test('empty input is refused before any request', async () => {
  const { service, calls } = fixture('');
  assert.equal((await service.editPodcastTranscript(' ')).success, false); assert.equal(calls.length, 0);
});
test('Whisper errors do not send audio to Gemini as fallback', async () => {
  const { service, calls } = fixture('');
  service.openaiApiKey = 'synthetic-placeholder-not-a-credential';
  service.fetchImpl = async () => ({ ok: false });
  const result = await service.generateTranscriptWithWhisper(new Blob(['synthetic'], { type: 'audio/wav' }));
  assert.equal(result.success, false); assert.match(result.error, /No audio was sent to a fallback/); assert.equal(calls.length, 0);
});
test('provider exceptions produce safe failure and no successful draft', async () => {
  const { service } = fixture('');
  service.editModel.generateContent = async () => { throw new Error('simulated provider failure'); };
  assert.equal((await service.editPodcastTranscript('Alpha beta.')).success, false);
});
