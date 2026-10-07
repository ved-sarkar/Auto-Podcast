import React, { useEffect, useState } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';

const emptySettings = { geminiApiKey: '', geminiModel: '', openaiApiKey: '' };

export default function ApiSettings({ onApiKeysChange, currentSettings, isOpen, onClose }) {
  const [settings, setSettings] = useState(emptySettings);
  useEffect(() => {
    if (isOpen) setSettings({ ...emptySettings, ...currentSettings });
  }, [isOpen, currentSettings]);
  if (!isOpen) return null;
  const update = (name, value) => setSettings(previous => ({ ...previous, [name]: value }));
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <section className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6" role="dialog" aria-modal="true" aria-labelledby="provider-settings-title">
        <h2 id="provider-settings-title" className="text-xl font-semibold flex items-center gap-2 mb-4"><Settings size={22} /> Optional live providers</h2>
        <p className="text-sm text-gray-600 mb-4">Settings remain in this tab's memory and are lost on reload. Applying them makes no network request.</p>
        <div className="space-y-4">
          <label className="block text-sm font-medium">Gemini API key
            <input className="input-field mt-1" type="password" autoComplete="off" value={settings.geminiApiKey} onChange={e => update('geminiApiKey', e.target.value)} placeholder="Enter your own key for this session" />
          </label>
          <label className="block text-sm font-medium">Gemini model ID
            <input className="input-field mt-1" value={settings.geminiModel} onChange={e => update('geminiModel', e.target.value)} placeholder="A currently supported model from your provider account" />
          </label>
          <label className="block text-sm font-medium">OpenAI API key — optional audio transcription
            <input className="input-field mt-1" type="password" autoComplete="off" value={settings.openaiApiKey} onChange={e => update('openaiApiKey', e.target.value)} placeholder="Leave blank to use Gemini for audio" />
          </label>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-medium flex items-center gap-2"><AlertTriangle size={18} /> Content leaves your device during live processing</p>
            <p className="mt-2">Transcripts go to Google Gemini. Audio goes to OpenAI if its key is supplied, otherwise to Gemini; the resulting transcript goes to Gemini for editing. Provider charges may apply. Failures do not switch providers automatically.</p>
            <p className="mt-2">Browser memory is not a secure backend secret store. Use this optional mode only in a local environment you trust, with content you are authorized to share.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary disabled:opacity-50" disabled={!settings.geminiApiKey.trim() || !settings.geminiModel.trim()} onClick={() => onApiKeysChange(settings)}>Apply for this tab</button>
        </div>
      </section>
    </div>
  );
}
