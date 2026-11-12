import React, { useState, useRef, useEffect, useCallback } from 'react';
import { City } from '../types';
import { useCitySearch } from '../hooks/useCitySearch';
import './CitySearch.css';

export interface CitySearchProps {
  onSelect: (city: City) => void;
}

export const CitySearch: React.FC<CitySearchProps> = ({ onSelect }) => {
  const {
    query,
    setQuery,
    status,
    results,
    error,
    retry,
    clear,
    selectCity,
  } = useCitySearch();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const shouldShowDropdown = isOpen && trimmedQuery.length >= 2 && status !== 'idle';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Automatically open dropdown when status changes to loading, success, empty, or error
  useEffect(() => {
    if (trimmedQuery.length >= 2 && status !== 'idle') {
      setIsOpen(true);
    }
  }, [status, trimmedQuery]);

  // Scroll active option into view when navigating with keyboard
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleSelectCity = useCallback(
    (city: City) => {
      const displayLabel = city.region
        ? `${city.name}, ${city.region}, ${city.country}`
        : `${city.name}, ${city.country}`;

      selectCity(displayLabel);
      setIsOpen(false);
      setActiveIndex(-1);
      if (validationError) {
        setValidationError(null);
      }
      onSelect(city);
    },
    [selectCity, validationError, onSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear validation error as soon as user types
    if (validationError) {
      setValidationError(null);
    }

    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // If blurring to another element inside the container (e.g. retry button), do not validate yet
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    if (!query.trim()) {
      setValidationError('Enter a city name to search.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setValidationError('Enter a city name to search.');
      return;
    }

    if (isOpen && activeIndex >= 0 && results[activeIndex]) {
      handleSelectCity(results[activeIndex]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        if (trimmedQuery.length >= 2) {
          setIsOpen(true);
        }
        return;
      }
      if (results.length > 0) {
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        if (trimmedQuery.length >= 2) {
          setIsOpen(true);
        }
        return;
      }
      if (results.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        handleSelectCity(results[activeIndex]);
      } else if (!query.trim()) {
        e.preventDefault();
        setValidationError('Enter a city name to search.');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    clear();
    setIsOpen(false);
    setActiveIndex(-1);
    if (validationError) {
      setValidationError(null);
    }
    inputRef.current?.focus();
  };

  const renderDropdownContent = () => {
    if (status === 'loading') {
      return (
        <div className="city-search-status-item loading-item" role="status" aria-live="polite">
          <span className="city-search-spinner" aria-hidden="true" />
          <span>Searching cities...</span>
        </div>
      );
    }

    if (status === 'empty') {
      return (
        <div className="city-search-status-item empty-item" role="status">
          No cities found for &quot;{trimmedQuery}&quot;. Check the spelling or try a larger nearby city.
        </div>
      );
    }

    if (status === 'error' && error) {
      if (error.code === 'MISSING_API_KEY') {
        return (
          <div className="city-search-status-item error-item missing-key-item" role="alert">
            <p>
              Please set <code>VITE_RAPIDAPI_KEY</code> in your <code>.env</code> file.
            </p>
          </div>
        );
      }

      if (error.code === 'RATE_LIMITED') {
        return (
          <div className="city-search-status-item error-item" role="alert">
            <p>Too many searches in a short time. Wait a few seconds and try again.</p>
          </div>
        );
      }

      if (error.code === 'NETWORK_ERROR') {
        return (
          <div className="city-search-status-item error-item" role="alert">
            <p>Can&apos;t reach the city search service. Check your internet connection and try again.</p>
            <button
              type="button"
              className="retry-button"
              onClick={() => retry()}
              onMouseDown={(e) => e.preventDefault()}
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div className="city-search-status-item error-item" role="alert">
          <p>{error.message || 'An error occurred while searching cities.'}</p>
          <button
            type="button"
            className="retry-button"
            onClick={() => retry()}
            onMouseDown={(e) => e.preventDefault()}
          >
            Retry
          </button>
        </div>
      );
    }

    if (status === 'success' && results.length > 0) {
      return results.map((city, index) => {
        const isSelected = index === activeIndex;
        return (
          <div
            key={city.id}
            id={`city-option-${city.id}`}
            role="option"
            aria-selected={isSelected}
            className={`city-search-option ${isSelected ? 'active' : ''}`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(e) => {
              // Prevent input blur before click registers
              e.preventDefault();
            }}
            onClick={() => handleSelectCity(city)}
          >
            <span className="option-name">{city.name}</span>
            <span className="option-details">
              {[city.region, city.country].filter(Boolean).join(', ')}
            </span>
          </div>
        );
      });
    }

    return null;
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && results[activeIndex]
      ? `city-option-${results[activeIndex].id}`
      : undefined;

  return (
    <div className="city-search-container" ref={containerRef}>
      <form className="city-search-form" onSubmit={handleSubmit} noValidate>
        <div className="city-search-input-wrapper">
          <span className="city-search-icon" aria-hidden="true">
            <svg
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M16.65 10.65a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
          </span>

          <input
            ref={inputRef}
            id="city-search-input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={shouldShowDropdown}
            aria-haspopup="listbox"
            aria-controls="city-search-listbox"
            aria-activedescendant={activeOptionId}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'city-search-error' : undefined}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => {
              if (trimmedQuery.length >= 2) {
                setIsOpen(true);
              }
            }}
            placeholder="Search for a city..."
            className={`city-search-input ${validationError ? 'has-error' : ''}`}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck="false"
          />

          {query && (
            <button
              type="button"
              className="city-search-clear-btn"
              onClick={handleClear}
              aria-label="Clear city search"
              onMouseDown={(e) => e.preventDefault()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {validationError && (
          <div id="city-search-error" role="alert" className="city-search-validation-error">
            {validationError}
          </div>
        )}

        {shouldShowDropdown && (
          <div
            id="city-search-listbox"
            ref={listboxRef}
            role="listbox"
            aria-label="City suggestions"
            className="city-search-dropdown"
          >
            {renderDropdownContent()}
          </div>
        )}
      </form>
    </div>
  );
};

export default CitySearch;
