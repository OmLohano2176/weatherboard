import React, { useState, useRef } from 'react';
import { useReminders } from '../hooks/useReminders';
import './ReminderSettings.css';

export interface ReminderSettingsProps {
  isOnline: boolean;
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({ isOnline }) => {
  const {
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
  } = useReminders();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [chosenTime, setChosenTime] = useState<string>(time || '07:30');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  const openDialog = (isEditing = false) => {
    setIsEditingExisting(isEditing);
    setChosenTime(time || '07:30');
    setTimeError(null);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    setTimeError(null);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChosenTime(e.target.value);
    if (timeError) {
      setTimeError(null);
    }
  };

  const handleTimeBlur = () => {
    if (!chosenTime.trim()) {
      setTimeError('Choose a time for your reminder.');
    }
  };

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenTime.trim()) {
      setTimeError('Choose a time for your reminder.');
      return;
    }

    if (isEditingExisting) {
      const ok = await changeTime(chosenTime);
      if (ok) closeDialog();
    } else {
      const ok = await enable(chosenTime);
      if (ok) closeDialog();
    }
  };

  const handleSendTest = async () => {
    setTestSentMessage(null);
    const ok = await sendTest();
    if (ok) {
      setTestSentMessage('Test notification sent! Check your device.');
      setTimeout(() => setTestSentMessage(null), 5000);
    }
  };

  // State: Unsupported Browser
  if (support === 'unsupported') {
    return (
      <section className="reminder-card" aria-label="Daily weather reminder settings">
        <div className="reminder-header">
          <div className="reminder-title-group">
            <span className="reminder-icon" aria-hidden="true">🔔</span>
            <h3 className="reminder-title">Daily weather reminder</h3>
          </div>
        </div>
        <p className="reminder-body">This browser doesn&apos;t support push notifications.</p>
      </section>
    );
  }

  // State: iOS Safari outside installed PWA
  if (support === 'ios-needs-install') {
    return (
      <section className="reminder-card" aria-label="Daily weather reminder settings">
        <div className="reminder-header">
          <div className="reminder-title-group">
            <span className="reminder-icon" aria-hidden="true">🔔</span>
            <h3 className="reminder-title">Daily weather reminder</h3>
          </div>
        </div>
        <p className="reminder-body">
          On iPhone and iPad, add WeatherBoard to your Home Screen first, then enable reminders.
        </p>
      </section>
    );
  }

  // State: Permission Denied
  if (permission === 'denied') {
    return (
      <section className="reminder-card" aria-label="Daily weather reminder settings">
        <div className="reminder-header">
          <div className="reminder-title-group">
            <span className="reminder-icon" aria-hidden="true">🔔</span>
            <h3 className="reminder-title">Daily weather reminder</h3>
          </div>
        </div>
        <div className="reminder-notice-box" role="status">
          Notifications are blocked for this site. To get reminders, allow notifications in your
          browser&apos;s site settings, then come back.
        </div>
      </section>
    );
  }

  return (
    <section className="reminder-card" aria-label="Daily weather reminder settings">
      <div className="reminder-header">
        <div className="reminder-title-group">
          <span className="reminder-icon" aria-hidden="true">🔔</span>
          <h3 className="reminder-title">Daily weather reminder</h3>
        </div>
      </div>

      {!isOnline && (
        <p className="reminder-offline-helper" role="note">
          Reminders need an internet connection.
        </p>
      )}

      {error && (
        <div className="reminder-error-row" role="alert">
          <p className="reminder-error-text">{error.message}</p>
          <button
            type="button"
            className="reminder-btn reminder-btn-secondary"
            onClick={() => (enabled ? changeTime(time) : openDialog(false))}
            disabled={!isOnline}
          >
            Retry
          </button>
        </div>
      )}

      {testSentMessage && (
        <div className="reminder-notice-box" role="status">
          {testSentMessage}
        </div>
      )}

      {/* State: Enabled */}
      {enabled ? (
        <>
          <p className="reminder-body">Reminder set for {time} (your local time)</p>
          <div className="reminder-actions">
            <button
              type="button"
              className="reminder-btn reminder-btn-secondary"
              onClick={() => openDialog(true)}
              disabled={!isOnline || status === 'loading'}
            >
              Change time
            </button>
            <button
              type="button"
              className="reminder-btn reminder-btn-secondary"
              onClick={handleSendTest}
              disabled={!isOnline || status === 'loading'}
            >
              {status === 'loading' ? 'Sending...' : 'Send test notification'}
            </button>
            <button
              type="button"
              className="reminder-btn reminder-btn-danger"
              onClick={disable}
              disabled={!isOnline || status === 'loading'}
            >
              Turn off
            </button>
          </div>
        </>
      ) : (
        /* State: Not Enabled */
        <>
          <p className="reminder-body">
            Get a quiet morning heads-up with today&apos;s temperature and weather conditions.
          </p>
          <div className="reminder-actions">
            <button
              type="button"
              className="reminder-btn reminder-btn-primary"
              onClick={() => openDialog(false)}
              disabled={!isOnline || status === 'loading'}
            >
              {status === 'loading' ? 'Setting up...' : 'Enable reminder'}
            </button>
          </div>
        </>
      )}

      {/* Explainer Dialog before browser prompt */}
      <dialog
        ref={dialogRef}
        className="reminder-dialog"
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        aria-labelledby="reminder-dialog-title"
      >
        <form className="reminder-dialog-content" onSubmit={handleDialogSubmit} noValidate>
          <h4 id="reminder-dialog-title" className="reminder-dialog-title">
            {isEditingExisting ? 'Change reminder time' : 'Daily weather reminder'}
          </h4>

          <p className="reminder-dialog-intro">
            We will send you one quiet weather heads-up each day at your chosen time:
          </p>

          <ul className="reminder-dialog-points">
            <li>Today&apos;s current temperature and forecasted conditions</li>
            <li>Delivered quietly once a day at your chosen time</li>
            <li>No promotional spam or tracking; turn it off at any time</li>
          </ul>

          <div className="reminder-form-group">
            <label htmlFor="reminder-time-input" className="reminder-time-label">
              Reminder time:
            </label>
            <input
              id="reminder-time-input"
              type="time"
              required
              value={chosenTime}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              className={`reminder-time-input ${timeError ? 'has-error' : ''}`}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? 'reminder-time-error' : undefined}
            />
            {timeError && (
              <p id="reminder-time-error" className="reminder-time-error" role="alert">
                {timeError}
              </p>
            )}
          </div>

          <div className="reminder-dialog-actions">
            <button
              type="button"
              className="reminder-btn reminder-btn-secondary"
              onClick={closeDialog}
            >
              Not now
            </button>
            <button
              type="submit"
              className="reminder-btn reminder-btn-primary"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
};
