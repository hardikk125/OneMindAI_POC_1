import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { FeedbackSubmission } from '../../types/Feedback';

export function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [showQuestionsEditor, setShowQuestionsEditor] = useState(false);

  // Fetch feedback list directly from Supabase
  const fetchFeedback = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      let query = supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100);

      if (ratingFilter) {
        query = query.eq('rating', ratingFilter);
      }

      const { data, error: err, count } = await query;

      if (err) {
        throw err;
      }

      if (data) {
        // Convert snake_case to camelCase
        const convertedFeedback = data.map((f: any) => ({
          id: f.id,
          userId: f.user_id,
          sessionId: f.session_id,
          rating: f.rating,
          reasonForRating: f.reason_for_rating,
          whatLiked: f.what_liked,
          whatImprove: f.what_improve,
          aiProvider: f.ai_provider,
          aiModel: f.ai_model,
          responseLength: f.response_length,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        }));

        setFeedback(convertedFeedback);
        setTotalFeedback(count || 0);

        // Calculate average rating
        if (convertedFeedback.length > 0) {
          const avg =
            convertedFeedback.reduce((sum: number, f: FeedbackSubmission) => sum + (f.rating || 0), 0) / convertedFeedback.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback';
      console.error('[Feedback Dashboard] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete feedback directly from Supabase
  const deleteFeedback = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { error: err } = await supabase
        .from('feedback_submissions')
        .delete()
        .eq('id', id);

      if (err) {
        throw err;
      }

      setFeedback((prev) => prev.filter((f) => f.id !== id));
      setTotalFeedback((prev) => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete feedback';
      console.error('[Feedback Dashboard] Delete error:', errorMessage);
      setError(errorMessage);
    }
  };

  // Export feedback as CSV
  const exportFeedback = () => {
    const headers = [
      'Rating',
      'Reason',
      'What Liked',
      'What Improve',
      'Provider',
      'Model',
      'Date',
    ];
    const rows = feedback.map((f) => [
      f.rating,
      f.reasonForRating || '',
      f.whatLiked || '',
      f.whatImprove || '',
      f.aiProvider || '',
      f.aiModel || '',
      new Date(f.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Load feedback on mount and when filter changes
  useEffect(() => {
    fetchFeedback();
  }, [ratingFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Feedback Management</h1>
          <p className="text-gray-400 mt-1">View and manage user feedback submissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportFeedback}
            disabled={feedback.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={() => setShowQuestionsEditor(!showQuestionsEditor)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showQuestionsEditor ? 'Hide' : 'Edit'} Questions
          </button>
        </div>
      </div>

      {/* Questions Editor */}
      {showQuestionsEditor && (
        <FeedbackQuestionsEditor onClose={() => setShowQuestionsEditor(false)} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg shadow p-6"
        >
          <p className="text-gray-400 text-sm font-medium">Total Feedback</p>
          <p className="text-3xl font-bold text-white mt-2">{totalFeedback}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-lg shadow p-6"
        >
          <p className="text-gray-400 text-sm font-medium">Average Rating</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-bold text-white">{averageRating.toFixed(1)}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={20}
                  className={i <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-lg shadow p-6"
        >
          <p className="text-gray-400 text-sm font-medium">5-Star Ratings</p>
          <p className="text-3xl font-bold text-white mt-2">
            {feedback.filter((f) => f.rating === 5).length}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setRatingFilter(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                ratingFilter === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Ratings
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setRatingFilter(rating)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ratingFilter === rating
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating}
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900 border border-red-800 rounded-lg p-4"
        >
          <p className="text-red-200 font-medium">✗ {error}</p>
        </motion.div>
      )}

      {/* Feedback List */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 mt-2">Loading feedback...</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No feedback submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Rating</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Liked</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Improve</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Model</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {item.reasonForRating || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {item.whatLiked || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {item.whatImprove || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {item.aiModel || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deleteFeedback(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete feedback"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Feedback Questions Editor Component
function FeedbackQuestionsEditor({ onClose }: { onClose: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    questionType: 'text',
    isRequired: false,
  });

  // Fetch questions directly from Supabase
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!supabase) {
          throw new Error('Supabase not configured');
        }
        
        const { data, error: err } = await supabase
          .from('feedback_questions')
          .select('*')
          .order('display_order', { ascending: true });

        if (err) {
          throw err;
        }

        if (data && data.length > 0) {
          const converted = data.map((q: any) => ({
            id: q.id,
            questionNumber: q.question_number,
            questionText: q.question_text,
            questionType: q.question_type,
            isRequired: q.is_required,
            displayOrder: q.display_order,
          }));
          console.log('[FeedbackQuestionsEditor] Loaded questions:', converted);
          setQuestions(converted);
        } else {
          console.warn('[FeedbackQuestionsEditor] No questions found');
          throw new Error('No questions found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load questions';
        console.error('[FeedbackQuestionsEditor] Error:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Add new question
  const handleAddQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      setError('Question text cannot be empty');
      return;
    }

    const nextQuestionNumber = Math.max(...questions.map(q => q.questionNumber || 0), 0) + 1;
    const nextDisplayOrder = Math.max(...questions.map(q => q.displayOrder || 0), 0) + 1;

    const addedQuestion = {
      id: `temp-${Date.now()}`,
      questionNumber: nextQuestionNumber,
      questionText: newQuestion.questionText,
      questionType: newQuestion.questionType,
      isRequired: newQuestion.isRequired,
      displayOrder: nextDisplayOrder,
    };

    setQuestions([...questions, addedQuestion]);
    setNewQuestion({ questionText: '', questionType: 'text', isRequired: false });
    setShowAddForm(false);
    setError(null);
  };

  // Save questions directly to Supabase
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Separate new questions (with temp IDs) from existing ones
      const newQuestions = questions.filter(q => q.id && q.id.startsWith('temp-'));
      const existingQuestions = questions.filter(q => !q.id || !q.id.startsWith('temp-'));

      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Update existing questions
      for (const q of existingQuestions) {
        const { error: err } = await supabase
          .from('feedback_questions')
          .update({
            question_text: q.questionText,
            question_type: q.questionType,
            is_required: q.isRequired || false,
            display_order: q.displayOrder,
            updated_at: new Date().toISOString()
          } as any)
          .eq('question_number', q.questionNumber);

        if (err) throw err;
      }

      // Insert new questions
      if (newQuestions.length > 0) {
        const { error: err } = await supabase
          .from('feedback_questions')
          .insert(
            newQuestions.map((q) => ({
              question_number: q.questionNumber,
              question_text: q.questionText,
              question_type: q.questionType,
              is_required: q.isRequired || false,
              display_order: q.displayOrder
            })) as any
          );

        if (err) throw err;
      }

      alert('Questions updated successfully!');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6 space-y-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-xl font-bold text-gray-900">Edit Feedback Questions</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">✗ {error}</p>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading questions...</p>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No questions found. Add one below to get started!</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question {q.questionNumber} {q.isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => {
                          setQuestions((prev) =>
                            prev.map((question) =>
                              question.id === q.id
                                ? { ...question, questionText: e.target.value }
                                : question
                            )
                          );
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter question text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={q.questionType}
                        onChange={(e) => {
                          setQuestions((prev) =>
                            prev.map((question) =>
                              question.id === q.id
                                ? { ...question, questionType: e.target.value }
                                : question
                            )
                          );
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="rating">Rating (1-5 stars)</option>
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${q.id}`}
                        checked={q.isRequired}
                        onChange={(e) => {
                          setQuestions((prev) =>
                            prev.map((question) =>
                              question.id === q.id
                                ? { ...question, isRequired: e.target.checked }
                                : question
                            )
                          );
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`required-${q.id}`} className="text-sm font-medium text-gray-700">
                        Required
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Question Form */}
            <div className="border-t pt-4">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  + Add New Question
                </button>
              ) : (
                <div className="border border-green-300 rounded-lg p-4 space-y-3 bg-green-50">
                  <h4 className="font-semibold text-gray-900">Add New Question</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                    <input
                      type="text"
                      value={newQuestion.questionText}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      placeholder="Enter the question text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                    <select
                      value={newQuestion.questionType}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    >
                      <option value="rating">Rating (1-5 stars)</option>
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-required"
                      checked={newQuestion.isRequired}
                      onChange={(e) => setNewQuestion({ ...newQuestion, isRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="new-required" className="text-sm font-medium text-gray-700">
                      Required
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewQuestion({ questionText: '', questionType: 'text', isRequired: false });
                        setError(null);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddQuestion}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
