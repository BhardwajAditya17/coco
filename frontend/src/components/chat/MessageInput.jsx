import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export const MessageInput = ({ onSend, onTyping }) => {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef(null);

  // Clean up typing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setContent(e.target.value);
    
    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSend(content.trim());
    setContent('');

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTyping) onTyping(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 border-t border-gray-200 bg-white flex items-center gap-2"
    >
      <input
        type="text"
        value={content}
        onChange={handleChange}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
      />
      <button
        type="submit"
        disabled={!content.trim()}
        className={`p-2.5 rounded-xl font-semibold flex items-center justify-center text-white transition-colors shadow-xs ${
          content.trim()
            ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            : 'bg-indigo-300 cursor-not-allowed'
        }`}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};