import { AlertCircle, Ban } from "lucide-react";

interface LimitedAccountAlertProps {
  reason: string;
}

export function LimitedAccountAlert({ reason }: LimitedAccountAlertProps) {
  return (
    <>
      <div className="limited-account-alert">
        <div className="alert-content">
          <AlertCircle className="alert-icon" size={32} />
          <div className="alert-text">
            <h3>⚠️ Your Account is Limited</h3>
            <p className="reason">Reason: {reason}</p>
            <p className="info">
              Your account has been restricted. You cannot create new companies,
              products, or cryptocurrencies. If you believe this is an error,
              please contact support.
            </p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .limited-account-alert {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          max-width: 600px;
          width: 90%;
        }

        .limited-account-alert .alert-content {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border: 3px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          gap: 15px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .limited-account-alert .alert-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .limited-account-alert .alert-text {
          flex: 1;
        }

        .limited-account-alert .alert-text h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: bold;
          color: #92400e;
        }

        .limited-account-alert .reason {
          margin: 5px 0;
          font-weight: 600;
          color: #b45309;
          font-size: 14px;
        }

        .limited-account-alert .info {
          margin: 10px 0 0 0;
          font-size: 13px;
          color: #78350f;
          line-height: 1.4;
        }
      `,
        }}
      />
    </>
  );
}

interface BannedAccountScreenProps {
  reason: string;
}

export function BannedAccountScreen({ reason }: BannedAccountScreenProps) {
  return (
    <>
      <div className="banned-screen">
        <div className="banned-content">
          <Ban className="banned-icon" size={80} />
          <h1>🚫 Account Banned 🚫</h1>
          <div className="ban-info">
            <p className="ban-reason">
              <strong>Reason:</strong> {reason}
            </p>
            <p className="ban-message">
              Your account has been permanently banned from Quickbuck. You no
              longer have access to any features or content.
            </p>
            <p className="contact-info">
              If you believe this ban was made in error, please contact support
              at{" "}
              <a href="mailto:support@quickbuck.com">support@quickbuck.com</a>
            </p>
          </div>
          <a href="/" className="return-home">
            Return to Home
          </a>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .banned-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .banned-screen .banned-content {
          max-width: 600px;
          width: 90%;
          background: #ffffff;
          border: 5px solid #dc2626;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          animation: scaleIn 0.3s ease-out 0.2s backwards;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .banned-screen .banned-icon {
          color: #dc2626;
          margin-bottom: 20px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .banned-screen .banned-content h1 {
          color: #dc2626;
          font-size: 32px;
          margin: 0 0 20px 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .banned-screen .ban-info {
          background: #fee2e2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: left;
        }

        .banned-screen .ban-reason {
          font-size: 16px;
          margin: 0 0 15px 0;
          color: #991b1b;
          line-height: 1.5;
        }

        .banned-screen .ban-reason strong {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .banned-screen .ban-message {
          font-size: 14px;
          margin: 15px 0;
          color: #7f1d1d;
          line-height: 1.6;
        }

        .banned-screen .contact-info {
          font-size: 13px;
          margin: 15px 0 0 0;
          color: #991b1b;
          line-height: 1.5;
        }

        .banned-screen .contact-info a {
          color: #dc2626;
          text-decoration: underline;
          font-weight: bold;
        }

        .banned-screen .return-home {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #dc2626;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          transition: background 0.2s;
        }

        .banned-screen .return-home:hover {
          background: #b91c1c;
        }
      `,
        }}
      />
    </>
  );
}
