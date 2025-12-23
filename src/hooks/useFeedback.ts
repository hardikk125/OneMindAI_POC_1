import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { FeedbackQuestion, FeedbackFormData, FeedbackResponse, FeedbackQuestionsResponse } from '../types/Feedback';

export function useFeedback() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch feedback questions directly from Supabase
  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoadingQuestions(true);
      setSubmitError(null);

      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase
        .from('feedback_questions')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const convertedQuestions = data.map((q: any) => ({
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

  // Submit feedback directly to Supabase
  const submitFeedback = useCallback(
    async (
      formData: FeedbackFormData,
      sessionId?: string,
      aiProvider?: string,
      aiModel?: string,
      responseLength?: number,
      interestData?: { name: string; email: string }
    ): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        // Validate rating
        if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
          throw new Error('Rating is required and must be between 1 and 5');
        }

        if (!supabase) {
          throw new Error('Supabase not configured');
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('[Feedback Hook] Auth error:', authError);
          throw new Error('User not authenticated');
        }

        console.log('[Feedback Hook] User ID:', user.id);
        console.log('[Feedback Hook] User email:', user.email);

        // Insert feedback directly to Supabase
        const insertData = {
          user_id: user.id,
          session_id: sessionId || null,
          rating: formData.rating,
          reason_for_rating: formData.reasonForRating || null,
          what_liked: formData.whatLiked || null,
          what_improve: formData.whatImprove || null,
          ai_provider: aiProvider || null,
          ai_model: aiModel || null,
          response_length: responseLength || null,
        };

        console.log('[Feedback Hook] Inserting data:', insertData);

        const { data, error } = await supabase
          .from('feedback_submissions')
          .insert(insertData as any)
          .select('id');

        if (error) {
          console.error('[Feedback Hook] Supabase error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw new Error(`Failed to submit feedback: ${error.message}`);
        }

        const feedbackId = data?.[0]?.id;

        // If user opted to register interest, insert into interest_registrations
        if (interestData && feedbackId) {
          const { error: interestError } = await supabase
            .from('interest_registrations')
            .insert({
              name: interestData.name,
              email: interestData.email,
              feedback_id: feedbackId,
              source: 'feedback_form',
              subscribed_to_updates: true,
            } as any);

          if (interestError) {
            console.warn('[Feedback Hook] Failed to register interest:', interestError.message);
            // Don't fail the whole submission if interest registration fails
          } else {
            console.log('[Feedback Hook] Interest registered successfully');
          }
        }

        setSubmitSuccess(true);
        console.log('[Feedback Hook] Feedback submitted successfully:', feedbackId);
        return true;
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
