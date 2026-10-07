import React, { useState, useRef } from 'react';
import { Settings, Wand2, AlertCircle, CheckCircle, Loader2, Mic, FileText, Zap, Edit3 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import TranscriptDiff from './components/TranscriptDiff';
import ApiSettings from './components/ApiSettings';
import PromptEditor from './components/PromptEditor';
import GeminiService from './services/geminiService';
import { syntheticTranscript, syntheticEditedTranscript } from './examples/syntheticDemo.js';
import { validateEditedTranscript } from './lib/transcriptValidation.js';
const liveApiEnabled = import.meta.env.VITE_ENABLE_LIVE_API === 'true';

function App() {
  const [files, setFiles] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [hasEditResult, setHasEditResult] = useState(false);
  const [removedSections, setRemovedSections] = useState([]);
  const [editingSummary, setEditingSummary] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeys, setApiKeys] = useState({});
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'diff'
  const [processingStep, setProcessingStep] = useState(''); // For showing current processing step
  const [currentPrompt, setCurrentPrompt] = useState(''); // Track current prompt being used
  const [connectedModel, setConnectedModel] = useState(''); // Track which model is connected
  const geminiServiceRef = useRef(null);

  const loadDemo = () => {
    const result = validateEditedTranscript(syntheticTranscript, { editedTranscript: syntheticEditedTranscript });
    setTranscript(syntheticTranscript);
    setEditedTranscript(result.editedTranscript);
    setRemovedSections(result.removedSections);
    setEditingSummary(result.editingSummary);
    setHasEditResult(true);
    setError(null);
    setSuccess('Synthetic example loaded locally. No model or API call was used.');
    setActiveTab('diff');
  };

  const handleFilesUploaded = (uploadedFiles) => {
    setFiles(uploadedFiles);
    setHasEditResult(false);
    setActiveTab('upload');
    setError(null);
    
    // Automatically load transcript if text file is uploaded
    const textFile = uploadedFiles.find(file => file.isText);
    if (textFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTranscript(e.target.result);
        setActiveTab('upload');
      };
      reader.readAsText(textFile.file);
    }
  };

  const handleApiKeysChange = (newApiKeys) => {
    if (!liveApiEnabled) return;
    try {
      const service = new GeminiService(newApiKeys.geminiApiKey, newApiKeys.openaiApiKey, { modelName: newApiKeys.geminiModel });
      setApiKeys(newApiKeys);
      geminiServiceRef.current = service;
      setCurrentPrompt(service.getCurrentPrompt());
      setConnectedModel(service.getCurrentModelName());
      setSuccess('Provider configured for this tab only. No connection test or request was made.');
      setError(null);
      setShowApiSettings(false);
    } catch (error) { setError(error.message); }
  };

  const handlePromptSave = (newPrompt) => {
    setCurrentPrompt(newPrompt);
    setSuccess('Custom prompt saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const processTranscript = async () => {
    if (!liveApiEnabled) return;
    if (!transcript.trim()) {
      setError('Please provide a transcript to edit.');
      return;
    }

    if (!geminiServiceRef.current) {
      setError('Please configure your Gemini API key in settings.');
      setShowApiSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    if (!window.confirm('Send this transcript to Google Gemini? Provider charges may apply.')) { setIsProcessing(false); return; }
    setHasEditResult(false);
    setProcessingStep('Editing transcript with AI...');

    try {
      const result = await geminiServiceRef.current.editPodcastTranscript(transcript);
      
      if (result.success) {
        setEditedTranscript(result.data.editedTranscript);
        setHasEditResult(true);
        setRemovedSections(result.data.removedSections || []);
        setEditingSummary(result.data.editingSummary || {});
        setActiveTab('diff');
        setSuccess('Transcript edited successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Error processing transcript: ${result.error}`);
      }
    } catch (error) {
      setError(`Failed to process transcript: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const processAudioFile = async () => {
    if (!liveApiEnabled) return;
    const audioFile = files.find(file => file.isAudio && file.supportsTranscription);
    
    if (!audioFile) {
      setError('Please upload a supported audio file (WAV, MP3, AAC, OGG, FLAC).');
      return;
    }

    if (!geminiServiceRef.current) {
      setError('Please configure your Gemini API key in settings.');
      setShowApiSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    const destination = apiKeys.openaiApiKey ? 'OpenAI Whisper' : 'Google Gemini';
    if (!window.confirm(`Send audio to ${destination}, then the transcript to Google Gemini for editing? Provider charges may apply.`)) { setIsProcessing(false); return; }
    setHasEditResult(false);
    setProcessingStep(`Transcribing audio with ${destination}...`);

    try {
      const result = await geminiServiceRef.current.processAudioFile(audioFile.file);
      
      if (result.success) {
        // Set both original and edited transcripts
        setTranscript(result.data.originalTranscript);
        setEditedTranscript(result.data.editedTranscript);
        setHasEditResult(true);
        setRemovedSections(result.data.removedSections || []);
        setEditingSummary(result.data.editingSummary || {});
        setActiveTab('diff');
        setSuccess('Audio transcribed and edited successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Error processing audio: ${result.error}`);
      }
    } catch (error) {
      setError(`Failed to process audio: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const hasRequiredData = () => {
    return liveApiEnabled && transcript.trim() && apiKeys.geminiApiKey;
  };

  const hasAudioToProcess = () => {
    return liveApiEnabled && files.some(file => file.isAudio && file.supportsTranscription) && apiKeys.geminiApiKey;
  };

  const audioFile = files.find(file => file.isAudio);
  const textFile = files.find(file => file.isText);
  const transcribableAudio = files.find(file => file.isAudio && file.supportsTranscription);

  // Check if using custom prompt
  const isUsingCustomPrompt = () => {
    try {
      const savedPrompt = localStorage.getItem('podcastEditorCustomPrompt');
      return savedPrompt && savedPrompt !== geminiServiceRef.current?.getDefaultPrompt();
    } catch { return false; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Auto Podcast Editor</h1>
                <p className="text-sm text-gray-600">AI-powered transcript editing for scientist interviews</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Prompt Status Indicator */}
              {apiKeys.geminiApiKey && (
                <div className="flex items-center gap-2">
                  {isUsingCustomPrompt() ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Edit3 className="h-4 w-4" />
                      <span className="text-sm">Custom Prompt</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Edit3 className="h-4 w-4" />
                      <span className="text-sm">Default Prompt</span>
                    </div>
                  )}
                </div>
              )}

              {/* Transcription Method Indicator */}
              {apiKeys.geminiApiKey && (
                <div className="flex items-center gap-2">
                  {apiKeys.openaiApiKey ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Whisper Transcription</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Basic Transcription</span>
                    </div>
                  )}
                </div>
              )}

              {/* API Status Indicator */}
              <div className="flex items-center gap-2">
                {apiKeys.geminiApiKey && connectedModel ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{connectedModel}</span>
                  </div>
                ) : apiKeys.geminiApiKey ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{liveApiEnabled ? 'Provider not configured' : 'Offline demo'}</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowPromptEditor(true)}
                className="btn-secondary"
                disabled={!apiKeys.geminiApiKey}
              >
                <Edit3 className="h-4 w-4" />
                Prompt
              </button>

              <button
                onClick={() => setShowApiSettings(true)}
                disabled={!liveApiEnabled}
                title={liveApiEnabled ? 'Optional live provider settings' : 'Live APIs are off; see setup instructions to opt in'}
                className="btn-secondary"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="card mb-8 border-blue-200" aria-label="Synthetic demo">
          <h2 className="text-xl font-semibold mb-2">Explore a synthetic interview</h2>
          <p className="text-gray-600 mb-4">Review a deletion-only edit with fictional content. The demo runs locally without keys or model calls. Removing words can still change meaning: review every edit.</p>
          <button className="btn-primary" onClick={loadDemo} disabled={isProcessing}>Load synthetic demo</button>
          <p className="text-sm text-gray-500 mt-3">{liveApiEnabled ? 'Optional live processing sends content to the selected providers and may incur charges.' : 'Live API processing is off in this build.'} This tool exports text, not edited audio.</p>
        </section>
        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Success</h4>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && processingStep && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Processing</h4>
              <p className="text-sm text-blue-700 mt-1">{processingStep}</p>
            </div>
          </div>
        )}

        {/* Current Prompt Info */}
        {isUsingCustomPrompt() && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Edit3 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Using Custom Prompt</h4>
              <p className="text-sm text-blue-700 mt-1">
                You're using a customized AI prompt. Click "Prompt" to view or edit your custom instructions for scientist interview editing.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`${
                activeTab === 'upload'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Upload & Process
              </div>
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`${
                activeTab === 'diff'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
              disabled={!hasEditResult}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Diff View
                {hasEditResult && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* File Upload Section */}
            <section className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Files</h2>
              <FileUpload onFilesUploaded={handleFilesUploaded} />
            </section>

            {/* Audio Processing Section */}
            {transcribableAudio && (
              <section className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  AI Audio Processing
                </h2>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Ready for AI Processing</h3>
                        <p className="text-sm text-green-700 mt-1">
                          {transcribableAudio.name} can be automatically transcribed and edited using {apiKeys.openaiApiKey ? 'Whisper (high-quality)' : 'Gemini AI'}. 
                          This creates a proposed transcript edit for human review; transcription may be inaccurate.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={processAudioFile}
                    disabled={!hasAudioToProcess() || isProcessing}
                    className={`btn-primary ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''} bg-green-600 hover:bg-green-700`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing Audio...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Process Audio with AI
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* Transcript Input Section */}
            <section className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Transcript</h2>
                {textFile && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Loaded from {textFile.name}
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={transcript}
                  onChange={(e) => { setTranscript(e.target.value); setHasEditResult(false); }}
                  aria-label="Original transcript"
                  placeholder="Paste your podcast transcript here, upload a text file above, or use AI audio processing..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {transcript.length > 0 && (
                      <>
                        {transcript.length.toLocaleString()} characters
                        {transcript.split(/\s+/).length > 1 && (
                          <> • {transcript.split(/\s+/).length.toLocaleString()} words</>
                        )}
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={processTranscript}
                    disabled={!hasRequiredData() || isProcessing}
                    className={`btn-primary ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Edit with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Audio Preview (if available) */}
            {audioFile && (
              <section className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio Preview</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">{audioFile.name}</span>
                    {audioFile.supportsTranscription && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        AI Ready
                      </span>
                    )}
                  </div>
                  <audio
                    controls
                    src={audioFile.url}
                    className="w-full"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  {audioFile.supportsTranscription ? (
                    <p className="text-sm text-green-600">
                      ✨ This audio file can be automatically transcribed using {apiKeys.openaiApiKey ? 'OpenAI Whisper (captures fillers & natural speech)' : 'Gemini AI'}.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      This audio format is not supported for AI transcription. Please provide the transcript manually.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'diff' && hasEditResult && (
          <TranscriptDiff
            originalTranscript={transcript}
            editedTranscript={editedTranscript}
            removedSections={removedSections}
            editingSummary={editingSummary}
          />
        )}
      </main>

      {/* API Settings Modal */}
      <ApiSettings
        isOpen={liveApiEnabled && showApiSettings}
        currentSettings={apiKeys}
        onClose={() => setShowApiSettings(false)}
        onApiKeysChange={handleApiKeysChange}
      />

      {/* Prompt Editor Modal */}
      <PromptEditor
        isOpen={showPromptEditor}
        onClose={() => setShowPromptEditor(false)}
        onPromptSave={handlePromptSave}
      />
    </div>
  );
}

export default App; 