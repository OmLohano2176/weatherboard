import { useState, useEffect, useRef, useCallback } from 'react';
import { City, CitySearchStatus } from '../types';
import { searchCities, GeoDBError } from '../services/geodb';
import { useDebounce } from './useDebounce';

export interface UseCitySearchResult {
  query: string;
  setQuery: (query: string) => void;
  status: CitySearchStatus;
  results: City[];
  error: GeoDBError | null;
  retry: () => void;
  clear: () => void;
  selectCity: (displayLabel: string) => void;
}

export function useCitySearch(initialQuery = ''): UseCitySearchResult {
  const [query, setQuery] = useState<string>(initialQuery);
  const [status, setStatus] = useState<CitySearchStatus>('idle');
  const [results, setResults] = useState<City[]>([]);
  const [error, setError] = useState<GeoDBError | null>(null);
  const [retryIndex, setRetryIndex] = useState<number>(0);

  const debouncedQuery = useDebounce(query, 300);
  const activeControllerRef = useRef<AbortController | null>(null);
  const lastSelectedQueryRef = useRef<string | null>(null);

  const handleSetQuery = useCallback((newQuery: string) => {
    lastSelectedQueryRef.current = null;
    setQuery(newQuery);
  }, []);

  const selectCity = useCallback((displayLabel: string) => {
    activeControllerRef.current?.abort();
    lastSelectedQueryRef.current = displayLabel.trim();
    setQuery(displayLabel);
    setStatus('idle');
    setResults([]);
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setRetryIndex((prev) => prev + 1);
  }, []);

  const clear = useCallback(() => {
    activeControllerRef.current?.abort();
    lastSelectedQueryRef.current = null;
    setQuery('');
    setResults([]);
    setError(null);
    setStatus('idle');
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    // If query is the one just selected by the user, don't re-trigger a search
    if (lastSelectedQueryRef.current && lastSelectedQueryRef.current === trimmed) {
      return;
    }

    if (trimmed.length < 2) {
      activeControllerRef.current?.abort();
      setStatus('idle');
      setResults([]);
      setError(null);
      return;
    }

    // Cancel any previous in-flight request so stale responses are discarded
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setStatus('loading');
    setError(null);

    searchCities(trimmed, controller.signal)
      .then((cities) => {
        if (controller.signal.aborted) return;

        if (cities.length === 0) {
          setStatus('empty');
          setResults([]);
        } else {
          setStatus('success');
          setResults(cities);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
          return;
        }

        if (err instanceof GeoDBError) {
          setError(err);
        } else {
          setError(
            new GeoDBError(
              err instanceof Error ? err.message : 'Unknown search failure',
              'HTTP_ERROR'
            )
          );
        }
        setStatus('error');
        setResults([]);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, retryIndex]);

  return {
    query,
    setQuery: handleSetQuery,
    status,
    results,
    error,
    retry,
    clear,
    selectCity,
  };
}
