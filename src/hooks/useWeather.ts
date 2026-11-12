import { useState, useEffect, useRef, useCallback } from 'react';
import { City, WeatherData } from '../types';
import { getWeather, WeatherError } from '../services/weather';
import { getLastView, saveLastView } from '../utils/lastView';

export interface UseWeatherResult {
  data: WeatherData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: WeatherError | null;
  isCached: boolean;
  lastUpdated: number | null;
  retry: () => void;
}

export function useWeather(
  city: City | null,
  isOnline: boolean = true
): UseWeatherResult {
  const initialLastView = useRef(getLastView()).current;
  const isInitialMatch = initialLastView && city && initialLastView.city.id === city.id;

  const [data, setData] = useState<WeatherData | null>(() => {
    return isInitialMatch ? initialLastView.weather : null;
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(() => {
    if (isInitialMatch) return 'success';
    return city ? 'loading' : 'idle';
  });
  const [error, setError] = useState<WeatherError | null>(null);
  const [isCached, setIsCached] = useState<boolean>(() => Boolean(isInitialMatch));
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => {
    return isInitialMatch ? initialLastView.savedAt : null;
  });
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const activeControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!city) {
      activeControllerRef.current?.abort();
      setStatus('idle');
      setData(null);
      setError(null);
      setIsCached(false);
      setLastUpdated(null);
      return;
    }

    const lastView = getLastView();
    const isCachedMatch = lastView && lastView.city.id === city.id;

    // If this city is the cached city, immediately show cached data
    if (isCachedMatch) {
      setData(lastView.weather);
      setIsCached(true);
      setLastUpdated(lastView.savedAt);
      setStatus('success');
      setError(null);
    }

    // If completely offline and not the cached city, show specific required notice
    if (!isOnline && !isCachedMatch) {
      activeControllerRef.current?.abort();
      setStatus('error');
      setData(null);
      setIsCached(false);
      setLastUpdated(null);
      setError(
        new WeatherError(
          `No saved weather for ${city.name} yet. Reconnect to load it.`,
          'NETWORK_OFFLINE'
        )
      );
      return;
    }

    // Cancel in-flight requests
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    // If we already have cached data for this city, don't show full skeleton
    if (!isCachedMatch) {
      setStatus('loading');
      setError(null);
    }

    getWeather(city.latitude, city.longitude, controller.signal)
      .then((weatherData) => {
        if (controller.signal.aborted) return;
        setData(weatherData);
        setStatus('success');
        setError(null);
        setIsCached(false);
        const now = Date.now();
        setLastUpdated(now);
        saveLastView(city, weatherData);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
          return;
        }

        // Never replace cached data with an error screen when offline
        if (isCachedMatch) {
          setData(lastView.weather);
          setIsCached(true);
          setLastUpdated(lastView.savedAt);
          setStatus('success');
          return;
        }

        if (err instanceof WeatherError) {
          setError(err);
        } else {
          setError(
            new WeatherError(
              'Both weather services are unavailable right now. Try again in a minute.',
              'SERVICES_DOWN'
            )
          );
        }
        setStatus('error');
        setData(null);
      });

    return () => {
      controller.abort();
    };
  }, [city?.id, city?.latitude, city?.longitude, isOnline, retryTrigger]);

  return {
    data,
    status,
    error,
    isCached,
    lastUpdated,
    retry,
  };
}
