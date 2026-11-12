import { useState, useEffect, useRef, useCallback } from 'react';
import { City, WeatherData } from '../types';
import { getWeather, WeatherError } from '../services/weather';

export interface UseWeatherResult {
  data: WeatherData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: WeatherError | null;
  retry: () => void;
}

export function useWeather(city: City | null): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<WeatherError | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const activeControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // If no city is selected, return to idle
    if (!city) {
      activeControllerRef.current?.abort();
      setStatus('idle');
      setData(null);
      setError(null);
      return;
    }

    // Cancel any previous in-flight request
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setStatus('loading');
    setError(null);

    getWeather(city.latitude, city.longitude, controller.signal)
      .then((weatherData) => {
        if (controller.signal.aborted) return;
        setData(weatherData);
        setStatus('success');
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
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
  }, [city?.id, city?.latitude, city?.longitude, retryTrigger]);

  return {
    data,
    status,
    error,
    retry,
  };
}
