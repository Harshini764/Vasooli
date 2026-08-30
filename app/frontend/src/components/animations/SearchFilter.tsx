import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchFilterProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  suggestions?: string[];
  className?: string;
}

export function SearchFilter({
  placeholder = 'Search...',
  onSearch,
  suggestions = [],
  className = '',
}: SearchFilterProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query
  useEffect(() => {
    if (query.trim()) {
      setFilteredSuggestions(
        suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      );
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [query, suggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch?.(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
      {/* Search Input */}
      <div
        className="relative rounded-xl border border-indigo-200/50 dark:border-indigo-900/50
        bg-gradient-to-br from-indigo-50/80 dark:from-indigo-950/30 to-blue-50/80 dark:to-blue-950/30
        backdrop-blur-sm transition-all duration-300
        focus-within:border-indigo-400/50 dark:focus-within:border-indigo-600/50
        focus-within:ring-2 focus-within:ring-indigo-500/20"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query && setShowSuggestions(true)}
            className="w-full bg-transparent text-sm outline-none placeholder-muted-foreground
            text-foreground font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                onSearch?.('');
              }}
              className="flex-shrink-0 p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg
              transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl
          border border-indigo-200/50 dark:border-indigo-900/50
          bg-gradient-to-br from-white/95 dark:from-slate-900/95 to-indigo-50/50 dark:to-indigo-950/50
          backdrop-blur-xl shadow-lg
          animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-2 space-y-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3 rounded-lg
                text-sm text-foreground font-medium
                hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                transition-all duration-150
                animate-in fade-in slide-in-from-left-4
                flex items-center gap-3"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Search className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {query && filteredSuggestions.length === 0 && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl
          border border-indigo-200/30 dark:border-indigo-900/30
          bg-gradient-to-br from-white/90 dark:from-slate-900/90 to-indigo-50/30 dark:to-indigo-950/30
          backdrop-blur-xl shadow-lg p-4
          animate-in fade-in duration-200"
        >
          <p className="text-sm text-muted-foreground text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
