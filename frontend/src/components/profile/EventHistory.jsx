import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Heart, FileText, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const INITIAL_BATCH_SIZE = 5;
const BATCH_INCREMENT = 5;

const EventHistory = ({ 
  userId, 
  filterTypes = null, 
  emptyMessage = "No activity found." 
}) => {
  const [activities, setActivities] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Reset pagination batch on user change
    setVisibleCount(INITIAL_BATCH_SIZE);
    const abortController = new AbortController();

    const fetchUserActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/v1/users/${userId}/activities`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activity history: ${response.statusText}`);
        }

        const json = await response.json();
        const activityData = Array.isArray(json) ? json : json.data || [];
        setActivities(activityData);

      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Activity fetch error:", err);
        setError("Unable to load details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivity();

    return () => abortController.abort();
  }, [userId]);

  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + BATCH_INCREMENT);
  };

  // Filter activities based on passed filterTypes array (e.g. ['post'], ['like'], ['comment'])
  const filteredActivities = activities.filter((activity) => {
    if (!filterTypes || filterTypes.length === 0) return true;
    return filterTypes.includes(activity.type);
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium">Loading details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-red-600 bg-red-50 rounded-lg border border-red-100">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm font-medium text-center">{error}</p>
      </div>
    );
  }

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'post':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityBadgeClass = (type) => {
    switch (type) {
      case 'post': return 'bg-blue-100 border-blue-200';
      case 'comment': return 'bg-green-100 border-green-200';
      case 'like': return 'bg-red-100 border-red-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const hasMore = visibleCount < filteredActivities.length;

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {visibleActivities.map((activity, index) => {
          const isLast = index === visibleActivities.length - 1;
          const targetPostId = activity.targetId || activity.id || activity._id;

          return (
            <li key={activity.id || activity._id || index}>
              <div className="relative pb-8">
                {(!isLast || hasMore) && (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  
                  {/* Badge Icon */}
                  <div className={`relative px-2 py-2 rounded-full border shadow-sm z-10 bg-white ${getActivityBadgeClass(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Main Item Card */}
                  <div className="min-w-0 flex-1 py-1.5">
                    <div className="text-sm text-gray-500 mb-1">
                      <span className="font-medium text-gray-900 mr-2 capitalize">
                        {activity.type === 'post' ? 'Published a post' : 
                         activity.type === 'comment' ? 'Commented' : 'Liked a post'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    
                    {/* Content Body (Post body or Comment text) */}
                    {activity.content && (
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1 leading-relaxed">
                        {activity.content}
                      </div>
                    )}

                    {/* Target Link */}
                    {targetPostId && (
                      <div className="mt-2">
                        <Link 
                          to={`/post/${targetPostId}`} 
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {activity.type === 'post' ? 'View Published Post \u2192' : 'View Original Post \u2192'}
                        </Link>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 pt-4 text-center relative z-10">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 shadow-sm text-xs font-semibold rounded-full text-gray-700 bg-white hover:bg-gray-50 transition-all cursor-pointer"
          >
            <span>Show More</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EventHistory;