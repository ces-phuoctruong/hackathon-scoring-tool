import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { schemaApi, testApi } from '../services/api';
import type { ScoringSchema } from '../types';

type UploadStep = 'select-schema' | 'upload-files' | 'processing' | 'complete';

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<UploadStep>('select-schema');
  const [schemas, setSchemas] = useState<ScoringSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<ScoringSchema | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');

  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
    try {
      const response = await schemaApi.getAll();
      setSchemas(response.data.schemas);
    } catch (err) {
      console.error('Error fetching schemas:', err);
      setError('Failed to load schemas');
    }
  };

  const handleSchemaSelect = (schema: ScoringSchema) => {
    setSelectedSchema(schema);
    setStep('upload-files');
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  const handleUploadAndProcess = async () => {
    if (!selectedSchema || files.length === 0) return;

    setIsLoading(true);
    setError(null);
    setStep('processing');

    try {
      // Step 1: Upload files
      const uploadResponse = await testApi.upload(
        files,
        selectedSchema._id,
        candidateName || undefined
      );

      const uploadedTestId = uploadResponse.data.test._id;
      if (!uploadedTestId) {
        throw new Error('No test ID returned from upload');
      }
      setTestId(uploadedTestId);

      // Step 2: Process with Gemini Vision
      const processResponse = await testApi.process(uploadedTestId);
      setExtractedText(processResponse.data.test.extractedText || '');

      setStep('complete');
    } catch (err) {
      console.error('Error processing test:', err);
      setError('Failed to process test. Please try again.');
      setStep('upload-files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('select-schema');
    setSelectedSchema(null);
    setCandidateName('');
    setFiles([]);
    setTestId(null);
    setExtractedText('');
    setError(null);
  };

  const handleProceedToScoring = () => {
    if (testId) {
      navigate(`/review/${testId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Test Papers</h1>
        <p className="text-gray-600 mt-1">
          Upload images of test papers for AI-powered text extraction and scoring.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {['Select Schema', 'Upload Files', 'Processing', 'Complete'].map((label, index) => {
          const stepIndex = ['select-schema', 'upload-files', 'processing', 'complete'].indexOf(step);
          const isActive = index === stepIndex;
          const isCompleted = index < stepIndex;

          return (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
              {index < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-4" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Step 1: Select Schema */}
      {step === 'select-schema' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Scoring Schema</h2>
          {schemas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No schemas available. Create a schema first.</p>
              <button
                onClick={() => navigate('/schemas')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Schema
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {schemas.map((schema) => (
                <button
                  key={schema._id}
                  onClick={() => handleSchemaSelect(schema)}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{schema.name}</h3>
                      {schema.description && (
                        <p className="text-sm text-gray-500 mt-1">{schema.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {schema.totalPoints} pts • v{schema.version}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload Files */}
      {step === 'upload-files' && selectedSchema && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload Test Papers</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Using schema: <span className="font-medium">{selectedSchema.name}</span>
                </p>
              </div>
              <button
                onClick={() => setStep('select-schema')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Change Schema
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate Name <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter candidate name..."
              />
            </div>

            <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAndProcess}
              disabled={files.length === 0 || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload & Process
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Processing Test Papers</h2>
          <p className="text-gray-500">
            Using Gemini Vision to extract text from your uploaded images...
          </p>
          <p className="text-sm text-gray-400 mt-2">This may take a minute or two.</p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                ✓
              </div>
              <h2 className="text-lg font-semibold text-green-800">Text Extraction Complete</h2>
            </div>
            <p className="text-green-700">
              Successfully extracted text from {files.length} image{files.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {extractedText && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Text Preview</h3>
              <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {extractedText}
                </pre>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Upload Another
            </button>
            <button
              onClick={handleProceedToScoring}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Proceed to Scoring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
