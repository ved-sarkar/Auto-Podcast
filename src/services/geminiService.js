import { GoogleGenerativeAI } from '@google/generative-ai';
import { MAX_TRANSCRIPT_CHARS, parseEditingResponse } from '../lib/transcriptValidation.js';

// Live calls are optional and user initiated. Tests inject an in-memory client.
class GeminiService {
  constructor(apiKey, openaiApiKey = null, { modelName, client, fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey || !modelName?.trim()) throw new Error('A session key and explicit Gemini model ID are required.');
    this.openaiApiKey = openaiApiKey;
    this.currentModel = modelName.trim();
    this.genAI = client || new GoogleGenerativeAI(apiKey);
    this.editModel = this.genAI.getGenerativeModel({ model: this.currentModel });
    this.transcriptionModel = this.editModel;
    this.fetchImpl = fetchImpl;
  }

  getCurrentModelName() { return this.currentModel; }
  getCurrentPrompt() {
    try { return globalThis.localStorage?.getItem('podcastEditorCustomPrompt') || this.getDefaultPrompt(); }
    catch { return this.getDefaultPrompt(); }
  }
  getDefaultPrompt() {
    return `You are an expert podcast editor specializing in scientist interview content. Your ONLY task is to REMOVE unnecessary content from the provided transcript. You must NEVER add, change, or rewrite any content - only delete sections.

**EDITING OBJECTIVES (REMOVAL ONLY):**
1. **Remove Unnecessary Content:**
   - Remove repetitive statements and redundant explanations
   - Remove verbal fillers (um, uh, like, you know, so, yeah)
   - Remove false starts and incomplete sentences
   - Remove off-topic tangents that don't add value to the scientist's story
   - Remove technical setup discussion (sound checks, level tests, etc.)
   - Remove excessive pleasantries and small talk

2. **Preserve Essential Content:**
   - Keep the scientist's personal journey and background
   - Keep career decisions and pivotal moments  
   - Keep scientific insights and breakthroughs
   - Keep educational explanations of their research
   - Keep personal anecdotes that humanize the scientist
   - Keep discussions of challenges and failures
   - Keep advice for aspiring scientists

3. **Content Quality Standards:**
   - Maintain the natural flow of conversation
   - Preserve the scientist's authentic voice and personality
   - Keep compelling stories and examples
   - Maintain chronological narrative structure
   - Keep important research findings and discoveries

**CRITICAL RULES:**
- NEVER add new content, introductions, or transitions
- NEVER change or rewrite existing words
- NEVER rearrange the order of content
- ONLY remove sections by marking them for deletion
- Keep the original speaker attributions (Host:, Scientist:, etc.)
- Preserve timestamps and natural conversation flow

**OUTPUT FORMAT:**
Please provide your response in the following JSON format:
{
  "editedTranscript": "The original transcript with unnecessary sections removed (NO ADDITIONS OR CHANGES)",
  "removedSections": [
    {
      "originalText": "Text that was removed",
      "reason": "Explanation of why this was removed",
      "timestamp": "Approximate time in original transcript"
    }
  ],
  "editingSummary": {
    "totalReductions": "Percentage of content removed",
    "keyImprovements": ["List of main improvements made by removal"],
    "preservedElements": ["Important elements that were kept"],
    "suggestedBreakpoints": ["Natural conversation breaks for editing"]
  }
}

**IMPORTANT NOTES:**
- Focus on removing distractions while maintaining the scientist's story
- Remove content that slows down the narrative without adding value
- Preserve the natural conversation feel
- Keep content accessible to educated general audiences interested in science careers
- REMEMBER: You can only REMOVE content, never add or change anything

Now, please edit the following scientist interview transcript by ONLY removing unnecessary content:`;
  }

  async editPodcastTranscript(transcript) {
    if (typeof transcript !== 'string' || !transcript.trim() || transcript.length > MAX_TRANSCRIPT_CHARS) {
      return { success: false, error: 'Provide between 1 and 100,000 characters of transcript text.' };
    }
    let text;
    try {
      const result = await this.editModel.generateContent(`${this.getCurrentPrompt()}\n\nTRANSCRIPT TO EDIT:\n${transcript}`);
      const response = await result.response;
      text = response.text();
    } catch {
      return { success: false, error: 'Gemini request failed. Check the configured model, quota and connection. No fallback was attempted.' };
    }
    try { return { success: true, data: parseEditingResponse(transcript, text) }; }
    catch (error) { return { success: false, error: error.message }; }
  }

  async generateTranscriptWithWhisper(audioFile) {
    if (!this.openaiApiKey) return this.generateTranscript(audioFile);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');
      const response = await this.fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${this.openaiApiKey}` }, body: formData
      });
      if (!response.ok) throw new Error('Provider failure');
      const result = await response.json();
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('Invalid transcript');
      return { success: true, transcript: result.text, provider: 'OpenAI Whisper' };
    } catch {
      return { success: false, error: 'OpenAI transcription failed. No audio was sent to a fallback provider.' };
    }
  }

  async generateTranscript(audioFile) {
    try {
      const audioData = await this.fileToGenerativePart(audioFile);
      const result = await this.transcriptionModel.generateContent([
        'Transcribe this audio accurately. Preserve speaker labels where supported. Return only the transcript; do not invent missing speech.', audioData
      ]);
      const response = await result.response;
      const transcript = response.text();
      if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Invalid transcript');
      return { success: true, transcript: transcript.trim(), provider: 'Google Gemini' };
    } catch {
      return { success: false, error: 'Gemini transcription failed. No fallback was attempted.' };
    }
  }

  async fileToGenerativePart(file) {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Audio file could not be read.'));
      reader.onabort = () => reject(new Error('Audio file reading was cancelled.'));
      reader.readAsDataURL(file);
    });
    return { inlineData: { data, mimeType: file.type } };
  }

  async processAudioFile(audioFile) {
    const transcription = await this.generateTranscriptWithWhisper(audioFile);
    if (!transcription.success) return transcription;
    const editing = await this.editPodcastTranscript(transcription.transcript);
    if (!editing.success) return editing;
    return { success: true, data: { originalTranscript: transcription.transcript, ...editing.data } };
  }
}
export default GeminiService;
