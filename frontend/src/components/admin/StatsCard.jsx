import React from 'react';

const StatsCard = ({ title, value, icon, trend, trendLabel }) => {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        
        {trend !== undefined && (
          <p className="text-sm mt-2 flex items-center">
            <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{trend}%
            </span>
            <span className="text-gray-400 ml-2">{trendLabel}</span>
          </p>
        )}
      </div>
      
      {/* Icon Container */}
      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
        {icon}
      </div>
    </div>
  );
};

export default StatsCard;