import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { testApi } from '../services/api';
import type { TestResult, ScoringSchema, QuestionScore, ReviewUpdateData } from '../types';

type TestWithSchema = TestResult & { scoringSchema: ScoringSchema };

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestWithSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<number | null>(null);
  const [editingScore, setEditingScore] = useState<number | null>(null);
  const [editedScores, setEditedScores] = useState<Record<number, { points: number; feedback: string }>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingExtractedText, setIsEditingExtractedText] = useState(false);
  const [editedExtractedText, setEditedExtractedText] = useState('');
  const [editedAnswers, setEditedAnswers] = useState<{ questionNumber: number; studentAnswer: string }[]>([]);
  const [isSavingExtractedText, setIsSavingExtractedText] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTest(id);
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const fetchTest = async (testId: string) => {
    try {
      setIsLoading(true);
      const response = await testApi.getById(testId);
      const testData = response.data.test as TestWithSchema;
      setTest(testData);
      setReviewNotes(testData.reviewNotes || '');
      setEditedExtractedText(testData.extractedText || '');
      setEditedAnswers(testData.extractedAnswers || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching test:', err);
      setError('Failed to load test');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExtractedText = async () => {
    if (!test) return;

    setIsSavingExtractedText(true);
    setError(null);

    try {
      await testApi.updateExtractedText(test._id, {
        extractedText: editedExtractedText,
        extractedAnswers: editedAnswers,
      });
      await fetchTest(test._id);
      setIsEditingExtractedText(false);
    } catch (err) {
      console.error('Error saving extracted text:', err);
      setError('Failed to save extracted text. Please try again.');
    } finally {
      setIsSavingExtractedText(false);
    }
  };

  const handleStartEditingExtractedText = () => {
    setEditedExtractedText(test?.extractedText || '');
    setEditedAnswers(test?.extractedAnswers || []);
    setIsEditingExtractedText(true);
  };

  const handleCancelEditingExtractedText = () => {
    setEditedExtractedText(test?.extractedText || '');
    setEditedAnswers(test?.extractedAnswers || []);
    setIsEditingExtractedText(false);
  };

  const handleAnswerChange = (questionNumber: number, studentAnswer: string) => {
    setEditedAnswers((prev) =>
      prev.map((a) =>
        a.questionNumber === questionNumber ? { ...a, studentAnswer } : a
      )
    );
  };

  const handleStartScoring = async () => {
    if (!test) return;

    setIsScoring(true);
    setError(null);

    try {
      // Pass current edited answers to ensure latest data is used for scoring
      await testApi.score(test._id, editedAnswers);
      await fetchTest(test._id);
    } catch (err) {
      console.error('Error scoring test:', err);
      setError('Failed to score test. Please try again.');
    } finally {
      setIsScoring(false);
    }
  };

  const handleEditScore = (questionNumber: number, score: QuestionScore) => {
    setEditingScore(questionNumber);
    setEditedScores({
      ...editedScores,
      [questionNumber]: {
        points: score.points,
        feedback: score.feedback,
      },
    });
  };

  const handleScoreChange = (questionNumber: number, field: 'points' | 'feedback', value: number | string) => {
    setEditedScores({
      ...editedScores,
      [questionNumber]: {
        ...editedScores[questionNumber],
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const handleCancelEdit = () => {
    setEditingScore(null);
  };

  const handleSaveReview = async () => {
    if (!test) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: ReviewUpdateData = {
        reviewNotes,
        scores: Object.entries(editedScores).map(([qNum, data]) => ({
          questionNumber: parseInt(qNum),
          points: data.points,
          feedback: data.feedback,
        })),
      };

      await testApi.updateReview(test._id, updateData);
      await fetchTest(test._id);
      setEditingScore(null);
      setEditedScores({});
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving review:', err);
      setError('Failed to save review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: QuestionScore['confidence']) => {
    const styles = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[confidence]}`}>
        {confidence}
      </span>
    );
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const styles: Record<TestResult['status'], string> = {
      pending: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      extracted: 'bg-yellow-100 text-yellow-800',
      scored: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // No ID provided - show test list
  if (!id) {
    return <TestListView />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
        <button
          onClick={() => navigate('/review')}
          className="ml-4 text-red-800 underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Test not found</p>
        <button
          onClick={() => navigate('/review')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to list
        </button>
      </div>
    );
  }

  const schema = test.scoringSchema;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {test.candidateName || 'Unnamed Candidate'}
            </h1>
            {getStatusBadge(test.status)}
          </div>
          <p className="text-gray-600 mt-1">
            Schema: {schema?.name} (v{schema?.version})
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              onClick={handleSaveReview}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={() => navigate('/review')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to list
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Score Summary */}
      {test.status === 'scored' || test.status === 'reviewed' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Score Summary</h2>
              <p className="text-gray-500 text-sm mt-1">
                {test.scores.filter((s) => s.flagForReview).length} questions flagged for review
                {test.scores.some((s) => s.manuallyAdjusted) && (
                  <span className="ml-2 text-purple-600">
                    ({test.scores.filter((s) => s.manuallyAdjusted).length} manually adjusted)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {test.totalScore} / {test.maxScore}
              </div>
              <div className="text-sm text-gray-500">
                {((test.totalScore / test.maxScore) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      ) : test.status === 'extracted' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Ready for Scoring</h2>
          <p className="text-yellow-700 mb-4">
            Text has been extracted. Review the answers below and edit if needed, then start AI scoring.
          </p>
          <button
            onClick={handleStartScoring}
            disabled={isScoring || isEditingExtractedText}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {isScoring ? 'Scoring in progress...' : 'Start AI Scoring'}
          </button>
        </div>
      ) : test.status === 'processing' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-blue-800">Processing...</h2>
          <p className="text-blue-700">AI is analyzing the answers. This may take a few minutes.</p>
        </div>
      ) : null}

      {/* Review Notes */}
      {(test.status === 'scored' || test.status === 'reviewed') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Review Notes</h2>
          <textarea
            value={reviewNotes}
            onChange={(e) => {
              setReviewNotes(e.target.value);
              setHasChanges(true);
            }}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this review..."
          />
          {test.reviewedAt && (
            <p className="text-sm text-gray-500 mt-2">
              Last reviewed: {dayjs(test.reviewedAt).format("DD-MM-YYYY HH:mm:ss")}
              {test.reviewedBy && ` by ${test.reviewedBy}`}
            </p>
          )}
        </div>
      )}

      {/* Extracted Answers */}
      {test.extractedAnswers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Answers & Scores</h2>
            {test.status === 'extracted' && (
              <div className="flex items-center gap-3">
                {isEditingExtractedText ? (
                  <>
                    <button
                      onClick={handleCancelEditingExtractedText}
                      disabled={isSavingExtractedText}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveExtractedText}
                      disabled={isSavingExtractedText}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingExtractedText ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditingExtractedText}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Edit Answers
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {test.extractedAnswers.map((answer) => {
              const score = test.scores.find((s) => s.questionNumber === answer.questionNumber);
              const question = schema?.questions.find(
                (q) => q.questionNumber === answer.questionNumber
              );
              const isEditing = editingScore === answer.questionNumber;
              const editData = editedScores[answer.questionNumber];

              return (
                <div key={answer.questionNumber} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-full text-sm">
                        Q{answer.questionNumber}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {question?.questionText || `Question ${answer.questionNumber}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Max: {question?.maxPoints || score?.maxPoints || '?'} points
                        </p>
                      </div>
                    </div>
                    {score && (
                      <div className="flex items-center gap-2">
                        {score.manuallyAdjusted && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            Adjusted
                          </span>
                        )}
                        {score.flagForReview && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            Review
                          </span>
                        )}
                        {getConfidenceBadge(score.confidence)}
                        {!isEditing && (
                          <>
                            <span className="text-lg font-semibold text-gray-900">
                              {score.points}/{score.maxPoints}
                            </span>
                            {(test.status === 'scored' || test.status === 'reviewed') && (
                              <button
                                onClick={() => handleEditScore(answer.questionNumber, score)}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Edit
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-11 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Student Answer:</p>
                      {isEditingExtractedText && test.status === 'extracted' ? (
                        <textarea
                          value={editedAnswers.find((a) => a.questionNumber === answer.questionNumber)?.studentAnswer || ''}
                          onChange={(e) => handleAnswerChange(answer.questionNumber, e.target.value)}
                          rows={15}
                          className="w-full p-3 bg-gray-50 rounded-md text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                          placeholder="Enter student answer..."
                        />
                      ) : (
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                          {answer.studentAnswer || '(No answer provided)'}
                        </p>
                      )}
                    </div>

                    {score && (
                      <>
                        {isEditing && editData ? (
                          <div className="bg-blue-50 p-4 rounded-md space-y-3">
                            <div className="flex items-center gap-4">
                              <label className="text-sm font-medium text-gray-700">Points:</label>
                              <input
                                type="number"
                                min="0"
                                max={score.maxPoints}
                                value={editData.points}
                                onChange={(e) =>
                                  handleScoreChange(
                                    answer.questionNumber,
                                    'points',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-gray-500">/ {score.maxPoints}</span>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-1">
                                Feedback:
                              </label>
                              <textarea
                                value={editData.feedback}
                                onChange={(e) =>
                                  handleScoreChange(answer.questionNumber, 'feedback', e.target.value)
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">AI Feedback:</p>
                            <p className="text-gray-700 bg-blue-50 p-3 rounded-md">
                              {score.feedback}
                            </p>
                          </div>
                        )}

                        {score.reasoning && !isEditing && (
                          <div>
                            <button
                              onClick={() =>
                                setExpandedReasoning(
                                  expandedReasoning === answer.questionNumber
                                    ? null
                                    : answer.questionNumber
                                )
                              }
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              {expandedReasoning === answer.questionNumber ? '▼' : '▶'}
                              AI Reasoning (Extended Thinking)
                            </button>
                            {expandedReasoning === answer.questionNumber && (
                              <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-3 rounded-md max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap font-mono text-xs">
                                  {score.reasoning}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Text (read-only) */}
      {test.extractedText && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Raw Extracted Text</h2>
            <p className="text-sm text-gray-500 mt-1">Original text extracted from uploaded images</p>
          </div>
          <div className="px-6 py-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-md max-h-[500px] overflow-y-auto">
              {test.extractedText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Test List Component
function TestListView() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await testApi.getAll();
      setTests(response.data.tests);
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await testApi.exportCsv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-results-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export. Make sure there are scored tests to export.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const styles: Record<TestResult['status'], string> = {
      pending: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      extracted: 'bg-yellow-100 text-yellow-800',
      scored: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const hasScoredTests = tests.some((t) => t.status === 'scored' || t.status === 'reviewed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Scores</h1>
          <p className="text-gray-600 mt-1">Review and adjust AI-generated scores.</p>
        </div>
        <div className="flex gap-2">
          {hasScoredTests && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload New Test
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">No tests uploaded yet.</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload Your First Test
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Schema
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tests.map((test) => {
                const schema = test.scoringSchema;
                return (
                  <tr key={test._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {test.candidateName || 'Unnamed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schema?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(test.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {test.status === 'scored' || test.status === 'reviewed'
                        ? `${test.totalScore}/${test.maxScore}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(test.createdAt).format("DD-MM-YYYY HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/review/${test._id}`)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
