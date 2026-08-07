import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const DEFAULT_TAGS = [
  'All',
  '#BloodDonation',
  '#Education',
  '#FoodDrive',
  '#DisasterRelief',
  '#AnimalWelfare',
  '#Environment',
  '#HealthCamp',
  '#NGO',
  '#Volunteering'
];

const EventTagFilter = ({
  activeTag,
  selectedTag, // Supporting alias
  onTagSelect,
  onSelectTag, // Supporting alias
  tags = DEFAULT_TAGS,
  className = ''
}) => {
  // Resolve prop aliases for backwards/forwards compatibility
  const currentActive = selectedTag !== undefined ? selectedTag : (activeTag || 'All');
  const handleSelect = onSelectTag || onTagSelect || (() => {});

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check overflow and scroll boundaries
  const checkForScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkForScroll();
    window.addEventListener('resize', checkForScroll);
    return () => window.removeEventListener('resize', checkForScroll);
  }, [checkForScroll, tags]);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const clearFilter = () => {
    handleSelect(null);
  };

  return (
    <div className={cn("sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-2.5 transition-all", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center gap-2">
        
        {/* Left Scroll Navigation Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="hidden sm:flex items-center justify-center absolute left-2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:scale-105 transition-all"
            aria-label="Scroll tags left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Filter Icon Label */}
        <div className="hidden md:flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1 select-none">
          <Filter className="w-3.5 h-3.5 mr-1" />
          Tags
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          onScroll={checkForScroll}
          className="flex space-x-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth items-center flex-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tags.map((tag) => {
            const rawTag = tag.replace(/^#/, '');
            const rawActive = typeof currentActive === 'string' ? currentActive.replace(/^#/, '') : currentActive;
            
            const isActive = 
              tag === currentActive || 
              rawTag === rawActive || 
              (tag === 'All' && (!currentActive || currentActive === 'All'));

            return (
              <button
                key={tag}
                onClick={() => {
                  if (tag === 'All') {
                    handleSelect(null);
                  } else {
                    // Strips '#' before sending to parent component / API query
                    const cleanTag = tag.replace(/^#/, '');
                    handleSelect(cleanTag);
                  }
                }}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 select-none focus:outline-none",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-600/20 scale-[1.02]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-transparent"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Navigation Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="hidden sm:flex items-center justify-center absolute right-2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:scale-105 transition-all"
            aria-label="Scroll tags right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Active Filter Clear Shortcut */}
        {currentActive && currentActive !== 'All' && (
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full border border-gray-200 transition-colors shrink-0 ml-1"
            title="Clear active tag filter"
          >
            <span>Reset</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EventTagFilter;