/**
 * Feedback System Types
 * Defines interfaces for feedback questions and submissions
 */

export interface FeedbackQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionType: 'rating' | 'text' | 'textarea';
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmission {
  id: string;
  userId: string;
  sessionId?: string;
  rating: number;
  reasonForRating?: string;
  whatLiked?: string;
  whatImprove?: string;
  aiProvider?: string;
  aiModel?: string;
  responseLength?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackFormData {
  rating: number | null;
  reasonForRating: string;
  whatLiked: string;
  whatImprove: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export interface FeedbackQuestionsResponse {
  success: boolean;
  questions: FeedbackQuestion[];
  error?: string;
}

export interface FeedbackListResponse {
  success: boolean;
  feedback: FeedbackSubmission[];
  total: number;
  error?: string;
}

export interface FeedbackUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
}
