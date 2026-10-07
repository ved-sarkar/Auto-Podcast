import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Music, FileText, X, AlertCircle, Zap } from 'lucide-react';

const FileUpload = ({ onFilesUploaded, acceptedFiles = [] }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError(`Some files were rejected. Please upload supported audio files or text files.`);
      return;
    }

    const processedFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isAudio: file.type.startsWith('audio/'),
      isText: file.type.startsWith('text/') || file.name.endsWith('.srt') || file.name.endsWith('.vtt'),
      url: URL.createObjectURL(file),
      supportsTranscription: isGeminiCompatibleAudio(file.type)
    }));

    setUploadedFiles(prev => [...prev, ...processedFiles]);
    onFilesUploaded([...uploadedFiles, ...processedFiles]);
  }, [uploadedFiles, onFilesUploaded]);

  // Local file picker allowlist; provider support and size limits may differ.
  const isGeminiCompatibleAudio = (mimeType) => {
    const supportedTypes = [
      'audio/wav',
      'audio/mp3', 
      'audio/mpeg',
      'audio/aac',
      'audio/ogg',
      'audio/flac'
    ];
    return supportedTypes.includes(mimeType);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      // Audio formats accepted by this file picker
      'audio/wav': ['.wav'],
      'audio/mp3': ['.mp3'], 
      'audio/mpeg': ['.mp3', '.mpeg'],
      'audio/aac': ['.aac'],
      'audio/ogg': ['.ogg'],
      'audio/flac': ['.flac'],
      // Text formats
      'text/plain': ['.txt'],
      'text/srt': ['.srt'],
      'text/vtt': ['.vtt']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  });

  const removeFile = (fileId) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.isAudio) return <Music className="h-5 w-5 text-purple-600" />;
    if (file.isText) return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const getFileStatusBadge = (file) => {
    if (file.isAudio && file.supportsTranscription) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Auto-transcribe
        </span>
      );
    } else if (file.isAudio) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          Audio Preview
        </span>
      );
    } else if (file.isText) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Transcript
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
          ${isDragActive && !isDragReject 
            ? 'border-primary-500 bg-primary-50' 
            : isDragReject 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full transition-colors duration-300
            ${isDragActive && !isDragReject 
              ? 'bg-primary-100' 
              : isDragReject 
              ? 'bg-red-100' 
              : 'bg-gray-100'
            }
          `}>
            <Upload className={`
              h-8 w-8 transition-colors duration-300
              ${isDragActive && !isDragReject 
                ? 'text-primary-600' 
                : isDragReject 
                ? 'text-red-600' 
                : 'text-gray-600'
              }
            `} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive && !isDragReject 
                ? 'Drop files here' 
                : isDragReject 
                ? 'Invalid file type' 
                : 'Upload Podcast Files'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your audio files and transcripts, or click to browse
            </p>
            <div className="text-sm text-gray-500">
              <p className="mb-2">Supported formats:</p>
              <div className="space-y-1">
                <p><strong>Audio (with AI transcription):</strong> WAV, MP3, AAC, OGG, FLAC</p>
                <p><strong>Transcripts:</strong> TXT, SRT, VTT</p>
                <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-2">
                  <Zap className="h-3 w-3" />
                  Powered by Gemini 2.0 Flash
                </p>
              </div>
            </div>
          </div>
          
          <button className="btn-primary">
            Choose Files
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      {getFileStatusBadge(file)}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* File Processing Info */}
          {uploadedFiles.some(f => f.isAudio && f.supportsTranscription) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">AI Transcription Available</p>
                  <p className="text-xs text-green-700 mt-1">
                    Your audio files can be automatically transcribed and edited using Gemini 2.0 Flash. 
                    Click "Process Audio with AI" to transcribe and edit in one step.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 