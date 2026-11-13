import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UseInstallPromptResult {
  canInstall: boolean;
  install: () => Promise<void>;
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = Boolean(
    (navigator as unknown as { standalone?: boolean }).standalone
  );
  return isStandaloneMedia || isIosStandalone;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isRunningStandalone());

  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(isRunningStandalone());
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener?.('change', checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (isRunningStandalone()) {
        setPromptEvent(null);
        return;
      }
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setPromptEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // Handle errors silently
    } finally {
      setPromptEvent(null);
    }
  }, [promptEvent]);

  const canInstall = !isStandalone && promptEvent !== null;

  return { canInstall, install };
}
