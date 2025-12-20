import { useState, useCallback, useEffect } from 'react';
import { FeedbackQuestion, FeedbackFormData, FeedbackResponse, FeedbackQuestionsResponse } from '../types/Feedback';

const ONEMIND_API_URL = process.env.REACT_APP_ONEMIND_API_URL || 'http://localhost:3001';

export function useFeedback() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch feedback questions from backend
  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoadingQuestions(true);
      setSubmitError(null);

      const response = await fetch(`${ONEMIND_API_URL}/api/feedback/questions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }

      const data: FeedbackQuestionsResponse = await response.json();

      if (data.success && data.questions) {
        // Convert snake_case from backend to camelCase for frontend
        const convertedQuestions = data.questions.map((q: any) => ({
          id: q.id,
          questionNumber: q.question_number,
          questionText: q.question_text,
          questionType: q.question_type,
          isRequired: q.is_required,
          displayOrder: q.display_order,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
        }));
        setQuestions(convertedQuestions);
      }
    } catch (error) {
      console.error('[Feedback Hook] Error fetching questions:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to load feedback questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  // Submit feedback to backend
  const submitFeedback = useCallback(
    async (
      formData: FeedbackFormData,
      sessionId?: string,
      aiProvider?: string,
      aiModel?: string,
      responseLength?: number
    ): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        // Validate rating
        if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
          throw new Error('Rating is required and must be between 1 and 5');
        }

        const response = await fetch(`${ONEMIND_API_URL}/api/feedback/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating: formData.rating,
            reasonForRating: formData.reasonForRating || null,
            whatLiked: formData.whatLiked || null,
            whatImprove: formData.whatImprove || null,
            sessionId: sessionId || null,
            aiProvider: aiProvider || null,
            aiModel: aiModel || null,
            responseLength: responseLength || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to submit feedback: ${response.statusText}`);
        }

        const data: FeedbackResponse = await response.json();

        if (data.success) {
          setSubmitSuccess(true);
          console.log('[Feedback Hook] Feedback submitted successfully:', data.feedbackId);
          return true;
        } else {
          throw new Error(data.error || 'Failed to submit feedback');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
        console.error('[Feedback Hook] Error submitting feedback:', errorMessage);
        setSubmitError(errorMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // Load questions on mount
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  return {
    questions,
    isLoadingQuestions,
    isSubmitting,
    submitError,
    submitSuccess,
    fetchQuestions,
    submitFeedback,
  };
}
