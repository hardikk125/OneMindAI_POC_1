# Feedback System Implementation Guide

## Overview

The feedback system allows users to rate and provide feedback on AI responses, with admin controls to manage feedback and customize feedback questions.

## Architecture

### Database Layer

**Tables:**
- `feedback_questions` - Stores editable feedback questions (Q1-Q4)
- `feedback_submissions` - Stores user feedback responses

**Security:**
- Row Level Security (RLS) enabled on both tables
- Users can only view their own feedback
- Admins can view and delete all feedback
- Only admins can edit questions

### Backend API

**Endpoints:**

1. **GET /api/feedback/questions**
   - Returns all feedback questions
   - Public endpoint (no auth required)
   - Response: `{ success: true, questions: FeedbackQuestion[] }`

2. **POST /api/feedback/submit**
   - Submit user feedback
   - Required: `rating` (1-5)
   - Optional: `reasonForRating`, `whatLiked`, `whatImprove`, `sessionId`, `aiProvider`, `aiModel`, `responseLength`
   - Response: `{ success: true, feedbackId: string }`

3. **GET /api/feedback/list**
   - Get all feedback (admin only)
   - Query params: `ratingFilter`, `startDate`, `endDate`, `limit`, `offset`
   - Response: `{ success: true, feedback: FeedbackSubmission[], total: number }`

4. **PUT /api/feedback/questions**
   - Update feedback questions (admin only)
   - Body: `{ questions: FeedbackQuestion[] }`
   - Response: `{ success: true, message: string }`

5. **DELETE /api/feedback/:id**
   - Delete feedback submission (admin only)
   - Response: `{ success: true, message: string }`

### Frontend Components

**FeedbackModal.tsx**
- Beautiful modal with 4-question form
- Question 1: 5-star rating (required)
- Question 2: Reason for rating (text input)
- Question 3: What you liked (textarea)
- Question 4: What could improve (textarea)
- Features:
  - Smooth animations
  - Success/error messaging
  - Auto-close on success
  - Responsive design

**useFeedback.ts Hook**
- Manages feedback form state
- Fetches questions from backend
- Submits feedback with validation
- Handles errors and success states

**FeedbackDashboard.tsx**
- Admin dashboard for feedback management
- View all feedback submissions
- Filter by rating, date, user
- Export feedback as CSV
- Delete feedback submissions
- Statistics: Total, average rating, 5-star count
- Edit questions button

## User Flow

1. User generates AI response
2. Response displays in UI
3. "💬 Feedback" button appears below response
4. User clicks button → FeedbackModal opens
5. User fills form (rating required, others optional)
6. User clicks "Submit Feedback"
7. Success message displays
8. Modal auto-closes after 2 seconds
9. Feedback saved to database

## Admin Flow

1. Admin navigates to Admin Panel
2. Clicks "Feedback Management" tab
3. Sees dashboard with:
   - Total feedback count
   - Average rating with stars
   - 5-star rating count
   - Feedback submissions table
4. Can filter by rating using buttons
5. Can delete individual feedback
6. Can export all feedback as CSV
7. Can click "Edit Questions" to customize form
8. Changes to questions saved immediately

## Integration with OneMindAI

**In OneMindAI.tsx:**

```typescript
// State variables
const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
const [feedbackSessionId, setFeedbackSessionId] = useState<string | undefined>();
const [feedbackAiProvider, setFeedbackAiProvider] = useState<string | undefined>();
const [feedbackAiModel, setFeedbackAiModel] = useState<string | undefined>();
const [feedbackResponseLength, setFeedbackResponseLength] = useState<number | undefined>();

// Feedback button (appears after response completes)
<button
  onClick={() => {
    setFeedbackSessionId(`session-${Date.now()}`);
    setFeedbackAiProvider(engine.provider);
    setFeedbackAiModel(engine.selectedVersion);
    setFeedbackResponseLength(content.length);
    setFeedbackModalOpen(true);
  }}
  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
>
  💬 Feedback
</button>

// FeedbackModal component
<FeedbackModal
  isOpen={feedbackModalOpen}
  onClose={() => setFeedbackModalOpen(false)}
  sessionId={feedbackSessionId}
  aiProvider={feedbackAiProvider}
  aiModel={feedbackAiModel}
  responseLength={feedbackResponseLength}
/>
```

## Database Schema

### feedback_questions
```sql
CREATE TABLE feedback_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INT NOT NULL CHECK (question_number >= 1 AND question_number <= 4),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('rating', 'text', 'textarea')),
  is_required BOOLEAN DEFAULT false,
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question_number)
);
```

### feedback_submissions
```sql
CREATE TABLE feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  reason_for_rating TEXT,
  what_liked TEXT,
  what_improve TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  response_length INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Default Feedback Questions

1. **Rating** (required)
   - Type: rating
   - Text: "Rate your experience"

2. **Reason for Rating**
   - Type: text
   - Text: "Reason for your rating"

3. **What You Liked**
   - Type: textarea
   - Text: "What did you like about OneMind AI?"

4. **What Could Improve**
   - Type: textarea
   - Text: "What could we improve?"

## Security Considerations

1. **Input Validation**
   - Rating must be 1-5
   - Text fields max 5000 characters
   - All inputs sanitized before storage

2. **Row Level Security**
   - Users can only view their own feedback
   - Admins can view all feedback
   - Only admins can edit questions
   - Only admins can delete feedback

3. **Authentication**
   - User ID required for feedback submission
   - Admin role required for admin endpoints

## Error Handling

**Frontend:**
- Network errors display in modal
- Validation errors prevent submission
- Success messages auto-dismiss

**Backend:**
- 401: User not authenticated
- 400: Invalid input (rating out of range)
- 403: Admin access required
- 500: Database error

## Performance Optimization

1. **Caching**
   - Questions cached in frontend hook
   - Auto-refresh on mount

2. **Pagination**
   - Admin feedback list supports limit/offset
   - Default: 100 items per page

3. **Indexes**
   - user_id index for fast lookups
   - created_at index for sorting
   - rating index for filtering

## Customization

### Changing Feedback Questions

1. Go to Admin Panel
2. Click "Feedback Management"
3. Click "Edit Questions"
4. Modify question text
5. Click "Save Changes"
6. Changes live immediately

### Styling

**Modal Colors:**
- Header: Blue gradient (`from-blue-600 to-blue-700`)
- Stars: Yellow (`yellow-400`)
- Buttons: Blue (`blue-600`)

**Responsive:**
- Mobile: Full width with padding
- Desktop: Max 2xl width, centered

## Testing Checklist

- [ ] User can see feedback button after response
- [ ] Feedback modal opens on button click
- [ ] All 4 questions display correctly
- [ ] Star rating works with hover effects
- [ ] Form validation prevents empty rating
- [ ] Feedback submits successfully
- [ ] Success message displays
- [ ] Modal closes after 2 seconds
- [ ] Admin can view feedback dashboard
- [ ] Admin can filter by rating
- [ ] Admin can export as CSV
- [ ] Admin can delete feedback
- [ ] Admin can edit questions
- [ ] Question changes appear in user form

## Deployment Steps

1. **Run Database Migration**
   ```bash
   # In Supabase SQL Editor, run:
   # migrations/feedback_schema.sql
   ```

2. **Deploy Backend**
   ```bash
   # Push to GitHub
   git push origin main
   
   # Railway auto-deploys on push
   # Check Railway dashboard for deployment status
   ```

3. **Deploy Frontend**
   ```bash
   # Build and deploy to your hosting
   npm run build
   ```

4. **Verify**
   - Test feedback submission
   - Check admin dashboard
   - Verify data in Supabase

## Troubleshooting

**Feedback button not appearing:**
- Check response has completed (not streaming)
- Check FeedbackModal is imported in OneMindAI.tsx
- Check feedbackModalOpen state is managed

**Modal not opening:**
- Check onClick handler is attached to button
- Check state variables are being set
- Check browser console for errors

**Feedback not saving:**
- Check user is authenticated
- Check network tab for API errors
- Check Supabase RLS policies
- Check database tables exist

**Questions not updating:**
- Check admin role is set
- Check PUT endpoint is called
- Check Supabase RLS allows update
- Check browser cache is cleared

## Files Modified/Created

**Created:**
- `migrations/feedback_schema.sql`
- `src/types/Feedback.ts`
- `src/hooks/useFeedback.ts`
- `src/components/FeedbackModal.tsx`
- `src/admin/pages/FeedbackDashboard.tsx`

**Modified:**
- `server/ai-proxy.cjs` (added 5 endpoints)
- `src/OneMindAI.tsx` (added feedback state and button)

## Support

For issues or questions:
1. Check this guide
2. Check browser console for errors
3. Check Supabase logs
4. Check Railway logs
5. Contact development team

---

**Last Updated:** December 20, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
