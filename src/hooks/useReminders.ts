import { useState, useEffect, useCallback } from 'react';
import {
  checkPushSupport,
  PushSupportStatus,
  PushError,
  getStoredReminder,
  subscribeToPush,
  updateReminderTime,
  unsubscribeFromPush,
  sendTestPush,
} from '../utils/push';

export interface UseRemindersResult {
  support: PushSupportStatus;
  permission: NotificationPermission;
  enabled: boolean;
  time: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: PushError | null;
  enable: (chosenTime: string) => Promise<boolean>;
  disable: () => Promise<boolean>;
  changeTime: (newTime: string) => Promise<boolean>;
  sendTest: () => Promise<boolean>;
}

export function useReminders(): UseRemindersResult {
  const [support] = useState<PushSupportStatus>(() => checkPushSupport());
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  const stored = getStoredReminder();
  const [enabled, setEnabled] = useState<boolean>(stored.enabled && permission === 'granted');
  const [time, setTime] = useState<string>(stored.time);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<PushError | null>(null);

  // Sync state with actual browser permission and push subscription on mount
  useEffect(() => {
    if (typeof Notification === 'undefined') return;

    setPermission(Notification.permission);

    // Track permission status changes
    if (
      'permissions' in navigator &&
      typeof navigator.permissions.query === 'function'
    ) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((permStatus) => {
          const handleChange = () => {
            const currentPerm = Notification.permission;
            setPermission(currentPerm);
            if (currentPerm !== 'granted') {
              setEnabled(false);
            }
          };
          permStatus.addEventListener('change', handleChange);
        })
        .catch(() => {
          // Permissions query unsupported for notifications in some browsers
        });
    }

    // Verify actual service worker push subscription
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub && stored.enabled) {
            setEnabled(true);
          } else if (!sub && stored.enabled) {
            // Subscription missing in browser
            setEnabled(false);
          }
        });
      });
    }
  }, []);

  const enable = useCallback(async (chosenTime: string): Promise<boolean> => {
    setStatus('loading');
    setError(null);

    try {
      // 1. Request browser notification permission
      if (typeof Notification === 'undefined') {
        throw new PushError('Notifications are not supported in this browser.', 'UNKNOWN');
      }

      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await Notification.requestPermission();
        setPermission(currentPerm);
      }

      if (currentPerm !== 'granted') {
        setStatus('idle');
        return false;
      }

      // 2. Subscribe with Web Push
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await subscribeToPush(chosenTime, timeZone);

      setEnabled(true);
      setTime(chosenTime);
      setStatus('success');
      return true;
    } catch (err: unknown) {
      const pushErr =
        err instanceof PushError
          ? err
          : new PushError((err as Error)?.message || 'Failed to enable reminder.', 'UNKNOWN');
      setError(pushErr);
      setStatus('error');
      setEnabled(false);
      return false;
    }
  }, []);

  const disable = useCallback(async (): Promise<boolean> => {
    setStatus('loading');
    setError(null);

    try {
      await unsubscribeFromPush();
      setEnabled(false);
      setStatus('success');
      return true;
    } catch (err: unknown) {
      const pushErr =
        err instanceof PushError
          ? err
          : new PushError((err as Error)?.message || 'Failed to turn off reminder.', 'UNKNOWN');
      setError(pushErr);
      setStatus('error');
      return false;
    }
  }, []);

  const changeTime = useCallback(async (newTime: string): Promise<boolean> => {
    setStatus('loading');
    setError(null);

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await updateReminderTime(newTime, timeZone);
      setTime(newTime);
      setStatus('success');
      return true;
    } catch (err: unknown) {
      const pushErr =
        err instanceof PushError
          ? err
          : new PushError((err as Error)?.message || 'Failed to update reminder time.', 'UNKNOWN');
      setError(pushErr);
      setStatus('error');
      return false;
    }
  }, []);

  const sendTest = useCallback(async (): Promise<boolean> => {
    setStatus('loading');
    setError(null);

    try {
      await sendTestPush();
      setStatus('success');
      return true;
    } catch (err: unknown) {
      const pushErr =
        err instanceof PushError
          ? err
          : new PushError((err as Error)?.message || 'Failed to send test notification.', 'UNKNOWN');
      setError(pushErr);
      setStatus('error');
      return false;
    }
  }, []);

  return {
    support,
    permission,
    enabled,
    time,
    status,
    error,
    enable,
    disable,
    changeTime,
    sendTest,
  };
}
