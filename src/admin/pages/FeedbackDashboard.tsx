import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, Download, Filter } from 'lucide-react';
import { FeedbackSubmission } from '../../types/Feedback';

const ONEMIND_API_URL = process.env.REACT_APP_ONEMIND_API_URL || 'http://localhost:3001';

export function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [showQuestionsEditor, setShowQuestionsEditor] = useState(false);

  // Fetch feedback list
  const fetchFeedback = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (ratingFilter) {
        params.append('ratingFilter', ratingFilter.toString());
      }
      params.append('limit', '100');

      const response = await fetch(`${ONEMIND_API_URL}/api/feedback/list?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Convert snake_case to camelCase
        const convertedFeedback = data.feedback.map((f: any) => ({
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
        setTotalFeedback(data.total);

        // Calculate average rating
        if (convertedFeedback.length > 0) {
          const avg =
            convertedFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / convertedFeedback.length;
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

  // Delete feedback
  const deleteFeedback = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const response = await fetch(`${ONEMIND_API_URL}/api/feedback/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete feedback: ${response.statusText}`);
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
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-1">View and manage user feedback submissions</p>
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
          className="bg-white rounded-lg shadow p-6"
        >
          <p className="text-gray-600 text-sm font-medium">Total Feedback</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalFeedback}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <p className="text-gray-600 text-sm font-medium">Average Rating</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
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
          className="bg-white rounded-lg shadow p-6"
        >
          <p className="text-gray-600 text-sm font-medium">5-Star Ratings</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {feedback.filter((f) => f.rating === 5).length}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-600" />
          <div className="flex gap-2">
            <button
              onClick={() => setRatingFilter(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                ratingFilter === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p className="text-red-800 font-medium">✗ {error}</p>
        </motion.div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading feedback...</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No feedback submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rating</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Liked</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Improve</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Model</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {item.reasonForRating || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {item.whatLiked || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {item.whatImprove || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.aiModel || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deleteFeedback(item.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
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

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${ONEMIND_API_URL}/api/feedback/questions`);
        const data = await response.json();

        if (data.success) {
          const converted = data.questions.map((q: any) => ({
            id: q.id,
            questionNumber: q.question_number,
            questionText: q.question_text,
            questionType: q.question_type,
            isRequired: q.is_required,
            displayOrder: q.display_order,
          }));
          setQuestions(converted);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Save questions
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`${ONEMIND_API_URL}/api/feedback/questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        throw new Error('Failed to save questions');
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
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-6 space-y-4"
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
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question {q.questionNumber}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
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
  );
}
