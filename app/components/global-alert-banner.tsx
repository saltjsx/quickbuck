import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState, useEffect } from "react";
import type { Id } from "convex/_generated/dataModel";

/**
 * GlobalAlertBanner Component
 * Displays unread global alerts to users at the top of the page
 * Auto-marks alerts as read when dismissed
 */
export function GlobalAlertBanner() {
  // @ts-ignore - alerts API will be available after Convex regenerates types
  const unreadAlerts = useQuery(api.alerts?.getUnreadAlerts);
  // @ts-ignore
  const markAsRead = useMutation(api.alerts?.markAlertAsRead);

  const [displayedAlerts, setDisplayedAlerts] = useState<any[]>([]);

  // Sync with unread alerts
  useEffect(() => {
    if (unreadAlerts) {
      setDisplayedAlerts(unreadAlerts);
    }
  }, [unreadAlerts]);

  const handleDismiss = async (alertId: Id<"globalAlerts">) => {
    try {
      await markAsRead({ alertId });
      setDisplayedAlerts((prev) => prev.filter((a) => a._id !== alertId));
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  if (displayedAlerts.length === 0) {
    return null;
  }

  return (
    <div className="global-alerts-container">
      {displayedAlerts.map((alert) => (
        <div key={alert._id} className={`global-alert alert-${alert.type}`}>
          <div className="alert-content">
            <div className="alert-title-line">
              <strong>{alert.title}</strong>
              <span className={`alert-badge alert-badge-${alert.type}`}>
                {alert.type.toUpperCase()}
              </span>
            </div>
            <p className="alert-text">{alert.message}</p>
          </div>
          <button
            className="alert-close-btn"
            onClick={() => handleDismiss(alert._id)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        .global-alerts-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9000;
          display: flex;
          flex-direction: column;
          gap: 0;
          max-height: 100vh;
          overflow-y: auto;
          pointer-events: none;
        }

        .global-alert {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          margin: 0;
          border-bottom: 2px solid;
          background: #ffffff;
          pointer-events: auto;
          animation: slideDown 0.3s ease-out;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .global-alert.alert-info {
          border-color: #0000ff;
          background: #e6f2ff;
        }

        .global-alert.alert-success {
          border-color: #008000;
          background: #e6ffe6;
        }

        .global-alert.alert-warning {
          border-color: #ff8c00;
          background: #fff9e6;
        }

        .global-alert.alert-error {
          border-color: #ff0000;
          background: #ffe6e6;
        }

        .alert-content {
          flex: 1;
          min-width: 0;
        }

        .alert-title-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .alert-content strong {
          color: #000000;
          font-size: 14px;
          font-weight: 600;
        }

        .alert-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 2px;
          white-space: nowrap;
        }

        .alert-badge-info {
          background: #0000ff;
          color: #ffffff;
        }

        .alert-badge-success {
          background: #008000;
          color: #ffffff;
        }

        .alert-badge-warning {
          background: #ff8c00;
          color: #ffffff;
        }

        .alert-badge-error {
          background: #ff0000;
          color: #ffffff;
        }

        .alert-text {
          margin: 0;
          color: #000000;
          font-size: 13px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .alert-close-btn {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: none;
          color: #808080;
          font-size: 20px;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
        }

        .alert-close-btn:hover {
          color: #000000;
        }

        @media (max-width: 768px) {
          .global-alerts-container {
            max-height: 50vh;
          }

          .global-alert {
            padding: 10px 12px;
            gap: 8px;
          }

          .alert-content strong {
            font-size: 13px;
          }

          .alert-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
