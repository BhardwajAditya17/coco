import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Heart, FileText, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const INITIAL_BATCH_SIZE = 5;
const BATCH_INCREMENT = 5;

const EventHistory = ({ userId }) => {
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
          throw new Error(`Failed to fetch activities: ${response.statusText}`);
        }

        const json = await response.json();
        
        const activityData = Array.isArray(json) ? json : json.data || [];
        setActivities(activityData);

      } catch (err) {
        if (err.name === 'AbortError') {
          return; 
        }
        console.error("Activity fetch error:", err);
        setError("Unable to load recent activity. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserActivity();

    return () => {
      abortController.abort();
    };
  }, [userId]);

  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + BATCH_INCREMENT);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium">Loading activity...</p>
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

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <p className="text-sm font-medium">No recent activity found.</p>
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

  // Slice activities array to show only the active batch
  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {visibleActivities.map((activity, index) => {
          const isLast = index === visibleActivities.length - 1;
          
          return (
            <li key={activity.id || activity._id}>
              <div className="relative pb-8">
                {(!isLast || hasMore) && (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  
                  <div className={`relative px-2 py-2 rounded-full border shadow-sm z-10 bg-white ${getActivityBadgeClass(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="min-w-0 flex-1 py-1.5">
                    <div className="text-sm text-gray-500 mb-1">
                      <span className="font-medium text-gray-900 mr-2 capitalize">
                        {activity.type === 'post' ? 'Published a post' : 
                         activity.type === 'comment' ? 'Commented' : 'Liked'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    
                    {activity.content && (
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                        {activity.content}
                      </div>
                    )}

                    {activity.targetId && (
                      <div className="mt-2">
                        <Link 
                          to={`/post/${activity.targetId}`} 
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View Original &rarr;
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

      {/* "Load More" Trigger */}
      {hasMore && (
        <div className="mt-8 pt-4 text-center relative z-10">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 shadow-sm text-xs font-semibold rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <span>Show More Activity</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EventHistory;