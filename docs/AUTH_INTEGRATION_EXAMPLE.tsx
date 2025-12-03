/**
 * Example: How to Integrate Auth into OneMindAI Component
 * 
 * This shows how to add auth UI and protected routes to your existing app.
 */

import React, { useState } from 'react';
import { useAuth } from '@/lib/supabase';
import { AuthModal, UserMenu, ProtectedRoute } from '@/components/auth';

/**
 * Example 1: Add Auth UI to Header
 */
export function HeaderWithAuth() {
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">OneMindAI</h1>
        
        {isAuthenticated ? (
          <UserMenu 
            onOpenSettings={() => console.log('Settings')}
            onOpenCredits={() => console.log('Credits')}
            onOpenHistory={() => console.log('History')}
          />
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </header>
  );
}

/**
 * Example 2: Protect Routes
 */
export function ProtectedDashboard() {
  const { isAuthenticated, user, credits } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <ProtectedRoute
      fallback={
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold text-white mb-4">
            Sign in to access dashboard
          </h2>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In Now
          </button>
          <AuthModal 
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      }
    >
      <div className="p-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome, {user?.email}!
        </h2>
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-400 mb-4">Your account details:</p>
          <ul className="space-y-2 text-gray-300">
            <li><strong>Email:</strong> {user?.email}</li>
            <li><strong>Credits:</strong> {credits?.balance || 0}</li>
            <li><strong>User ID:</strong> {user?.id}</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/**
 * Example 3: Use Auth Hook in Components
 */
export function ChatInterface() {
  const { user, credits, hasEnoughCredits, refreshCredits } = useAuth();
  const [message, setMessage] = useState('');

  const handleSendMessage = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    if (!hasEnoughCredits(5)) {
      alert('Not enough credits. Please buy more.');
      return;
    }

    // Send message to AI
    console.log('Sending message:', message);
    
    // After successful response, refresh credits
    await refreshCredits();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        {/* Messages go here */}
      </div>

      {/* Input area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!hasEnoughCredits(5)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        
        {/* Credit info */}
        <div className="mt-2 text-sm text-gray-400">
          Credits: {credits?.balance || 0} 
          {!hasEnoughCredits(5) && (
            <span className="text-red-400 ml-2">⚠️ Insufficient credits</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: Deduct Credits After API Success
 */
import { deductCredits, logApiUsage } from '@/lib/supabase';

export async function callAIWithCredits(
  userId: string,
  provider: string,
  model: string,
  prompt: string
) {
  try {
    // Call AI API (example with OpenAI)
    const response = await fetch('http://localhost:3002/api/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    // Calculate credits needed
    const creditsNeeded = Math.ceil(
      (promptTokens / 1_000_000) * 25 + 
      (completionTokens / 1_000_000) * 100
    );

    // IMPORTANT: Only deduct AFTER successful response
    const { success, error } = await deductCredits(
      userId,
      creditsNeeded,
      provider,
      model,
      promptTokens + completionTokens
    );

    if (!success) {
      console.error('Failed to deduct credits:', error);
      return { error: 'Failed to process credits' };
    }

    // Log usage for analytics
    await logApiUsage(
      userId,
      provider,
      model,
      promptTokens,
      completionTokens,
      creditsNeeded,
      true
    );

    return { 
      success: true, 
      content: data.choices[0].message.content,
      creditsUsed: creditsNeeded 
    };

  } catch (err) {
    console.error('API call failed:', err);
    
    // Log failed attempt (no credits deducted)
    await logApiUsage(
      userId,
      provider,
      model,
      0,
      0,
      0,
      false,
      (err as Error).message
    );

    return { error: 'Failed to get AI response' };
  }
}

/**
 * Example 5: Check Auth Status
 */
export function AuthStatus() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    profile, 
    credits,
    error 
  } = useAuth();

  if (isLoading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  if (!isAuthenticated) {
    return <div className="text-gray-400">Not authenticated</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      <h3 className="font-bold mb-2">Auth Status</h3>
      <ul className="space-y-1 text-sm text-gray-300">
        <li>✅ Authenticated</li>
        <li>Email: {user?.email}</li>
        <li>Name: {profile?.full_name || 'N/A'}</li>
        <li>Role: {profile?.role || 'user'}</li>
        <li>Credits: {credits?.balance || 0}</li>
        <li>Lifetime Earned: {credits?.lifetime_earned || 0}</li>
        <li>Lifetime Spent: {credits?.lifetime_spent || 0}</li>
      </ul>
    </div>
  );
}

/**
 * Example 6: Sign Out Button
 */
export function SignOutButton() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    // User will be redirected to login screen
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      Sign Out
    </button>
  );
}

/**
 * Integration Checklist:
 * 
 * ✅ Wrap app with <AuthProvider> in main.tsx
 * ✅ Add HeaderWithAuth to your layout
 * ✅ Use ProtectedRoute to guard pages
 * ✅ Use useAuth() hook to access user data
 * ✅ Deduct credits AFTER successful API calls
 * ✅ Show credit balance in UI
 * ✅ Handle insufficient credits gracefully
 * ✅ Log all API usage for analytics
 */
