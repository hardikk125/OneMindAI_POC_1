import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useFeedback } from '../hooks/useFeedback';
import { FeedbackFormData } from '../types/Feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  aiProvider?: string;
  aiModel?: string;
  responseLength?: number;
}

export function FeedbackModal({
  isOpen,
  onClose,
  sessionId,
  aiProvider,
  aiModel,
  responseLength,
}: FeedbackModalProps) {
  const { questions, isLoadingQuestions, isSubmitting, submitError, submitSuccess, submitFeedback } = useFeedback();
  const [formData, setFormData] = useState<FeedbackFormData>({
    rating: null,
    reasonForRating: '',
    whatLiked: '',
    whatImprove: '',
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [registerInterest, setRegisterInterest] = useState(false);
  const [interestName, setInterestName] = useState('');
  const [interestEmail, setInterestEmail] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        rating: null,
        reasonForRating: '',
        whatLiked: '',
        whatImprove: '',
      });
      setHoveredRating(null);
      setRegisterInterest(false);
      setInterestName('');
      setInterestEmail('');
    }
  }, [isOpen]);

  // Auto-close on success
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess, onClose]);

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleTextChange = (field: keyof FeedbackFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare interest data if user opted in
    const interestData = registerInterest && interestName && interestEmail
      ? { name: interestName, email: interestEmail }
      : undefined;

    const success = await submitFeedback(formData, sessionId, aiProvider, aiModel, responseLength, interestData);

    if (success) {
      console.log('[Feedback Modal] Feedback submitted successfully');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Share Your Feedback</h2>
              <p className="text-blue-100 mt-1">Help us improve OneMind AI</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              aria-label="Close feedback modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <p className="text-green-800 font-medium">✓ Thank you for your feedback!</p>
              </motion.div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <p className="text-red-800 font-medium">✗ {submitError}</p>
              </motion.div>
            )}

            {isLoadingQuestions ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-2">Loading feedback form...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      {question.questionText}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {/* Question 1: Rating */}
                    {question.questionType === 'rating' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleRatingChange(rating)}
                            onMouseEnter={() => setHoveredRating(rating)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className="transition-transform hover:scale-110"
                            aria-label={`Rate ${rating} stars`}
                          >
                            <Star
                              size={32}
                              className={`${
                                (hoveredRating || formData.rating) && rating <= (hoveredRating || formData.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Question 2: Text input */}
                    {question.questionType === 'text' && (
                      <input
                        type="text"
                        value={formData.reasonForRating}
                        onChange={(e) => handleTextChange('reasonForRating', e.target.value)}
                        placeholder="Please explain your rating..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={500}
                      />
                    )}

                    {/* Question 3 & 4: Textarea */}
                    {question.questionType === 'textarea' && (
                      <textarea
                        value={
                          question.questionNumber === 3
                            ? (formData.whatLiked || '')
                            : (formData.whatImprove || '')
                        }
                        onChange={(e) => {
                          const field = question.questionNumber === 3 ? 'whatLiked' : 'whatImprove';
                          handleTextChange(field, e.target.value);
                        }}
                        placeholder="Share your thoughts..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        maxLength={5000}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Interest Registration Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="registerInterest"
                  checked={registerInterest}
                  onChange={(e) => setRegisterInterest(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="registerInterest" className="block text-sm font-semibold text-gray-900 cursor-pointer">
                    Register Your Interest
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Get notified about new features and updates from OneMind AI
                  </p>
                </div>
              </div>

              {registerInterest && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <label htmlFor="interestName" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="interestName"
                      value={interestName}
                      onChange={(e) => setInterestName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required={registerInterest}
                    />
                  </div>
                  <div>
                    <label htmlFor="interestEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="interestEmail"
                      value={interestEmail}
                      onChange={(e) => setInterestEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required={registerInterest}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.rating || isLoadingQuestions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
