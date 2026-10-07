import React, { useState, useEffect } from 'react';
import { Edit3, Save, RotateCcw, Eye, EyeOff, Copy, Check } from 'lucide-react';

const PromptEditor = ({ isOpen, onClose, onPromptSave }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Default prompt that's currently being used
  const defaultPrompt = `You are an expert podcast editor specializing in scientist interview content. Your ONLY task is to REMOVE unnecessary content from the provided transcript. You must NEVER add, change, or rewrite any content - only delete sections.

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

**SCIENTIST JOURNEY SPECIFIC GUIDELINES:**
- Retain discussions of career transitions and decision points
- Keep explanations of research methodologies and findings
- Preserve stories about mentorship and collaboration
- Maintain discussions of work-life balance and challenges
- Keep advice for early-career scientists and students

**IMPORTANT NOTES:**
- Focus on removing distractions while maintaining the scientist's story
- Remove content that slows down the narrative without adding value
- Preserve the natural conversation feel
- Keep content accessible to educated general audiences interested in science careers
- REMEMBER: You can only REMOVE content, never add or change anything

Now, please edit the following scientist interview transcript by ONLY removing unnecessary content:`;

  // Load custom prompt from localStorage on mount
  useEffect(() => {
    let savedPrompt;
    try { savedPrompt = localStorage.getItem('podcastEditorCustomPrompt'); }
    catch { savedPrompt = null; }
    if (savedPrompt) {
      setCustomPrompt(savedPrompt);
    } else {
      setCustomPrompt(defaultPrompt);
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    try { localStorage.setItem('podcastEditorCustomPrompt', customPrompt); }
    catch { window.alert('Browser storage is unavailable; the custom prompt was not saved.'); return; }
    
    // Notify parent component
    onPromptSave(customPrompt);
    
    setIsSaved(true);
    setIsEditing(false);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    setCustomPrompt(defaultPrompt);
    setIsEditing(true);
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const promptStats = {
    characters: customPrompt.length,
    words: customPrompt.split(/\s+/).filter(word => word.length > 0).length,
    lines: customPrompt.split('\n').length
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit3 className="h-6 w-6 text-primary-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Prompt Editor</h2>
                <p className="text-sm text-gray-600">Customize the instructions sent to Gemini AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Default Prompt View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Default Prompt</h3>
              <button
                onClick={() => setShowDefaultPrompt(!showDefaultPrompt)}
                className="btn-secondary text-sm"
              >
                {showDefaultPrompt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDefaultPrompt ? 'Hide' : 'Show'} Default
              </button>
            </div>
            
            {showDefaultPrompt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {defaultPrompt}
                </pre>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCopy(defaultPrompt, 'default')}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    {copiedText === 'default' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Default
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Custom Prompt Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Custom Prompt</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn-secondary text-sm"
                >
                  <Edit3 className="h-4 w-4" />
                  {isEditing ? 'Cancel Edit' : 'Edit'}
                </button>
                <button
                  onClick={handleReset}
                  className="btn-secondary text-sm"
                  title="Reset to default prompt"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                  placeholder="Enter your custom prompt for the AI..."
                />
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {promptStats.characters.toLocaleString()} characters • {promptStats.words.toLocaleString()} words • {promptStats.lines} lines
                  </div>
                  <button
                    onClick={handleSave}
                    className={`btn-primary ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    <Save className="h-4 w-4" />
                    {isSaved ? 'Saved!' : 'Save Prompt'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {customPrompt}
                </pre>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCopy(customPrompt, 'custom')}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {copiedText === 'custom' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Custom
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preset Prompts */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Preset Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setCustomPrompt(defaultPrompt);
                  setIsEditing(true);
                }}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">Scientist Journey (Default)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Specialized for scientist interview content focusing on career journeys, research stories, and personal experiences. REMOVAL ONLY editing.
                </p>
              </button>
              
              <button
                onClick={() => {
                  const academicPrompt = defaultPrompt.replace(
                    /scientist interview/gi, 'academic interview'
                  ).replace(
                    /SCIENTIST JOURNEY SPECIFIC GUIDELINES:/,
                    '**ACADEMIC CAREER SPECIFIC GUIDELINES:**'
                  ).replace(
                    /- Retain discussions of career transitions and decision points/,
                    '- Retain discussions of academic milestones and tenure process'
                  ).replace(
                    /- Keep advice for early-career scientists and students/,
                    '- Keep advice for graduate students and postdocs'
                  );
                  setCustomPrompt(academicPrompt);
                  setIsEditing(true);
                }}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">Academic Career Focus</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Adapted for academic career interviews focusing on tenure, research, and academic life. REMOVAL ONLY editing.
                </p>
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Prompt Writing Tips:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>CRITICAL:</strong> Emphasize that AI should ONLY REMOVE content, never add or change</li>
              <li>• Be specific about what scientist journey content to preserve vs. remove</li>
              <li>• Include examples of career milestones and research stories relevant to your field</li>
              <li>• Specify the desired JSON output format for easy processing</li>
              <li>• Test your prompts with sample scientist interview transcripts</li>
              <li>• Consider your audience's interest in scientific careers and research</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {customPrompt === defaultPrompt ? (
              <span>Using default prompt</span>
            ) : (
              <span className="text-blue-600">✓ Using custom prompt</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className={`btn-primary ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                <Save className="h-4 w-4" />
                {isSaved ? 'Saved!' : 'Save & Close'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor; 