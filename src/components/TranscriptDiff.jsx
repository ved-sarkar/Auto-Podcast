import { buildDeletionDiff } from '../lib/transcriptValidation.js';
import React, { useState, useMemo, useCallback } from 'react';
import { Eye, EyeOff, Download, Copy, RotateCcw, Check, GitCompare, List, SplitSquareHorizontal } from 'lucide-react';

const TranscriptDiff = React.memo(({ originalTranscript, editedTranscript, removedSections = [], editingSummary = {} }) => {
  const [viewMode, setViewMode] = useState('unified'); // 'unified' | 'split'
  const [showRemovedOnly, setShowRemovedOnly] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const generateWordDiff = useMemo(() => buildDeletionDiff(originalTranscript, editedTranscript),
    [originalTranscript, editedTranscript]);

  const handleCopy = useCallback(async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  const handleDownload = useCallback((content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Memoize filtered diff
  const filteredDiff = useMemo(() => {
    return showRemovedOnly 
      ? generateWordDiff.filter(item => item.type === 'removed')
      : generateWordDiff;
  }, [generateWordDiff, showRemovedOnly]);

  const renderUnifiedDiff = useCallback(() => {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="whitespace-pre-wrap leading-relaxed">
            {filteredDiff.map((item, index) => (
              <span
                key={index}
                className={`
                  ${item.type === 'added' ? 'bg-green-100 text-green-800 px-1 rounded' : ''}
                  ${item.type === 'removed' ? 'bg-red-100 text-red-800 px-1 rounded line-through' : ''}
                  ${item.type === 'unchanged' ? 'text-gray-800' : ''}
                `}
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }, [filteredDiff]);

  const renderSplitDiff = useCallback(() => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Original Transcript
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(originalTranscript, 'original')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy original"
              >
                {copiedText === 'original' ? 
                  <Check className="h-4 w-4 text-green-600" /> : 
                  <Copy className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {originalTranscript}
            </pre>
          </div>
        </div>

        {/* Edited Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Edited Transcript
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(editedTranscript, 'edited')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy edited"
              >
                {copiedText === 'edited' ? 
                  <Check className="h-4 w-4 text-green-600" /> : 
                  <Copy className="h-4 w-4" />
                }
              </button>
              <button
                onClick={() => handleDownload(editedTranscript, 'edited-transcript.txt')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download edited transcript"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {editedTranscript}
            </pre>
          </div>
        </div>
      </div>
    );
  }, [originalTranscript, editedTranscript, copiedText, handleCopy, handleDownload]);

  const stats = useMemo(() => {
    const originalLength = originalTranscript?.length || 0;
    const editedLength = editedTranscript?.length || 0;
    const reduction = originalLength > 0 ? ((originalLength - editedLength) / originalLength * 100).toFixed(1) : 0;
    
    return {
      originalLength,
      editedLength,
      reduction,
      removedSections: removedSections.length
    };
  }, [originalTranscript, editedTranscript, removedSections]);

  if (typeof originalTranscript !== 'string' || typeof editedTranscript !== 'string') {
    return (
      <div className="card text-center py-12">
        <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Diff Available</h3>
        <p className="text-gray-600">Upload files and process them to see the editing diff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Transcript Diff
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
              className="btn-secondary text-sm"
            >
              {viewMode === 'unified' ? (
                <>
                  <SplitSquareHorizontal className="h-4 w-4" />
                  Split View
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  Unified View
                </>
              )}
            </button>
            
            {viewMode === 'unified' && (
              <button
                onClick={() => setShowRemovedOnly(!showRemovedOnly)}
                className={`btn-secondary text-sm ${showRemovedOnly ? 'bg-red-100 text-red-700' : ''}`}
              >
                {showRemovedOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showRemovedOnly ? 'Show All' : 'Removed Only'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-100 rounded border border-red-300"></span>
            <span>{stats.reduction}% reduced</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-100 rounded border border-blue-300"></span>
            <span>{stats.removedSections} sections removed</span>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}

      {/* Removed Sections Details */}
      {removedSections.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Removed Sections ({removedSections.length})
          </h3>
          <div className="space-y-3">
            {removedSections.map((section, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                    Section {index + 1}
                  </span>
                  {section.timestamp && (
                    <span className="text-xs text-gray-500">{section.timestamp}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 mb-2 italic">"{section.originalText}"</p>
                <p className="text-xs text-red-600">{section.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editing Summary */}
      {editingSummary && Object.keys(editingSummary).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Editing Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editingSummary.keyImprovements && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Improvements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {editingSummary.keyImprovements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {editingSummary.preservedElements && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preserved Elements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {editingSummary.preservedElements.map((element, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      {element}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default TranscriptDiff; 