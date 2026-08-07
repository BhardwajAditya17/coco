import React from 'react';
import { cn } from '../../utils/cn';

// Simple hash function to consistently assign the same color to the same string
const getTagColor = (tagName) => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-yellow-100 text-yellow-800',
    'bg-indigo-100 text-indigo-800'
  ];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const TagBadge = ({ name, className }) => {
  const colorClasses = getTagColor(name);
  
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colorClasses, className)}>
      #{name.replace('#', '')}
    </span>
  );
};

export default TagBadge;