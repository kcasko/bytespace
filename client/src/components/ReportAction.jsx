import { useState } from 'react';
import { reportReasons, submitReport } from '../api/reportApi.js';

export default function ReportAction({ currentUser, targetType, targetId, targetUsername, label = 'Report' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    setMessage('');

    try {
      await submitReport({ targetType, targetId, targetUsername, reason, details });
      setMessage('Report submitted. An admin will review it.');
      setDetails('');
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Report could not be submitted.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <div className="report-action">
      <button type="button" className="subtle-button" onClick={() => setOpen((current) => !current)}>
        {label}
      </button>
      {message && <div className="comment-success">{message}</div>}
      {error && <div className="comment-error">{error}</div>}
      {open && (
        <form className="report-form" onSubmit={handleSubmit}>
          <label>
            Reason
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {reportReasons.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Details
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength="1000"
              placeholder="Optional context for the admins"
            />
          </label>
          <div className="comment-form__footer">
            <span>{details.trim().length}/1000</span>
            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
