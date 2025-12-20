import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Filter, Download, Search, Calendar, User, Tag } from 'lucide-react';

interface FeedbackItem {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  feedback_type: string;
  rating?: number;
  category: string;
  title?: string;
  message: string;
  tags?: string[];
  provider?: string;
  model?: string;
  status: string;
  priority: string;
  created_at: string;
}

export function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call to fetch feedback
      // For now, using mock data
      const mockData: FeedbackItem[] = [
        {
          id: '1',
          user_id: 'user1',
          user_email: 'user@example.com',
          user_name: 'John Doe',
          feedback_type: 'response_quality',
          rating: 5,
          category: 'accuracy',
          title: 'Great AI responses',
          message: 'The AI responses are very accurate and helpful.',
          tags: ['positive', 'ai-quality'],
          provider: 'openai',
          model: 'gpt-4',
          status: 'new',
          priority: 'low',
          created_at: new Date().toISOString(),
        },
      ];
      setFeedback(mockData);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = 
      item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || item.feedback_type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400';
      case 'reviewed': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-purple-500/20 text-purple-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'closed': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-purple-400" />
            Customer Feedback
          </h1>
          <p className="text-gray-400 mt-1">
            View and manage customer feedback submissions
          </p>
        </div>
        <button
          onClick={() => {/* TODO: Implement export */}}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Feedback</p>
              <p className="text-2xl font-bold text-white mt-1">{feedback.length}</p>
            </div>
            <MessageSquare className="text-purple-400" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-2xl font-bold text-white mt-1 flex items-center gap-1">
                4.5 <Star className="text-yellow-400" size={20} fill="currentColor" />
              </p>
            </div>
            <Star className="text-yellow-400" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Review</p>
              <p className="text-2xl font-bold text-white mt-1">
                {feedback.filter(f => f.status === 'new').length}
              </p>
            </div>
            <Filter className="text-blue-400" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Resolved</p>
              <p className="text-2xl font-bold text-white mt-1">
                {feedback.filter(f => f.status === 'resolved').length}
              </p>
            </div>
            <Calendar className="text-green-400" size={32} />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="response_quality">Response Quality</option>
            <option value="model_performance">Model Performance</option>
            <option value="ui_experience">UI Experience</option>
            <option value="bug_report">Bug Report</option>
            <option value="feature_request">Feature Request</option>
            <option value="general">General</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading feedback...</p>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <MessageSquare className="text-gray-600 mx-auto mb-4" size={48} />
            <p className="text-gray-400">No feedback found</p>
          </div>
        ) : (
          filteredFeedback.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {item.title || 'Untitled Feedback'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {item.user_email || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    {item.rating && (
                      <span className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < item.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{item.message}</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                  {item.feedback_type.replace('_', ' ')}
                </span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {item.category}
                </span>
                {item.provider && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    {item.provider}
                  </span>
                )}
                {item.model && (
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                    {item.model}
                  </span>
                )}
                {item.tags?.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs flex items-center gap-1">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
