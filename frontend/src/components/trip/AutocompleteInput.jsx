/**
 * AutocompleteInput Component
 *
 * A text input with debounced geocoding suggestions.
 * Calls the /api/geocode/ endpoint as the user types,
 * and displays a dropdown of matching locations.
 */

import { useState, useEffect, useRef } from 'react';
import { geocodeLocation } from '../../api/tripApi';
import { useDebounce } from '../../hooks/useDebounce';

export default function AutocompleteInput({
  id,
  label,
  icon,
  placeholder,
  value,
  onChange,
  error,
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const isSelecting = useRef(false);
  const debouncedQuery = useDebounce(query, 350);

  // Sync external value changes (e.g., form reset)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (isSelecting.current) {
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const data = await geocodeLocation(debouncedQuery);
        if (!cancelled) {
          setSuggestions(data.results || []);
          setIsOpen((data.results || []).length > 0);
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    isSelecting.current = false;
    const val = e.target.value;
    setQuery(val);
    onChange(val);  // Update parent immediately with text
  };

  const handleSelect = (suggestion) => {
    isSelecting.current = true;
    setQuery(suggestion.label);
    onChange(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="form-group" ref={wrapperRef}>
      <label className="form-label" htmlFor={id}>
        <span className="form-label__icon">{icon}</span>
        {label}
      </label>

      <div className="autocomplete">
        <input
          id={id}
          type="text"
          className={`form-input ${error ? 'form-input--error' : ''}`}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          autoComplete="off"
        />

        {isLoading && (
          <div style={{
            position: 'absolute', right: '12px', top: '50%',
            marginTop: '-8px', width: '16px', height: '16px',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent-blue)',
            borderRadius: '50%', animation: 'spin 0.6s linear infinite',
          }} />
        )}

        {isOpen && suggestions.length > 0 && (
          <div className="autocomplete__dropdown">
            {suggestions.map((item, idx) => (
              <div
                key={`${item.lat}-${item.lng}-${idx}`}
                className={`autocomplete__item ${idx === activeIndex ? 'autocomplete__item--active' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="autocomplete__item-name">{item.name}</div>
                <div className="autocomplete__item-region">
                  {item.region}{item.country ? `, ${item.country}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
