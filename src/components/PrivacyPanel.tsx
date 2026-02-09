interface PrivacyPanelProps {
  onClose: () => void;
}

export function PrivacyPanel({ onClose }: PrivacyPanelProps) {
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="privacy-panel" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-header">
          <h2>Privacy Guarantees</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="privacy-content">
          <div className="privacy-section">
            <h3>Your notes never leave this device.</h3>
            <p>
              Bodhi is built with a strict Content Security Policy (CSP) that blocks
              all external network connections. Your notes are stored in a local SQLite
              database on your computer — nowhere else.
            </p>
          </div>

          <div className="privacy-section">
            <h3>No analytics. No telemetry. No accounts.</h3>
            <p>
              There are no tracking scripts, no usage analytics, no crash reporting,
              and no user accounts. The app doesn't know who you are and doesn't care.
            </p>
          </div>

          <div className="privacy-section">
            <h3>Works completely offline.</h3>
            <p>
              After installation, Bodhi never needs an internet connection. You can
              disconnect from WiFi entirely and the app continues to work perfectly.
            </p>
          </div>

          <div className="privacy-section">
            <h3>Verify it yourself</h3>
            <p>Don't take our word for it. Here's how to prove it:</p>
            <ol>
              <li>
                <strong>Network tab test:</strong> Open Developer Tools (Ctrl+Shift+I),
                go to the Network tab, and use the app normally. You'll see only internal
                IPC calls — zero external requests.
              </li>
              <li>
                <strong>Offline test:</strong> Disconnect from the internet entirely.
                Create, edit, and delete notes. Everything works.
              </li>
              <li>
                <strong>CSP block test:</strong> Open the Console tab in Developer Tools
                and type: <code>fetch("https://example.com")</code>. You'll see a
                "Refused to connect" error — the app blocks all outbound connections.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
