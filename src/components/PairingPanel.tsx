import { useState, useEffect, useCallback } from "react";
import { IS_TAURI, IS_PWA, IS_SYNC } from "../lib/env";
import { validateSyncUrl } from "../lib/private-ip";
// sync-client is dynamically imported to keep Automerge WASM off the critical load path
async function getSyncClient() { return import("../lib/sync-client"); }
import * as db from "../lib/db";

const SETTING_KEY = "sync-server-url";

interface PairingPanelProps {
  onPaired?: (paired: boolean) => void;
}

export function PairingPanel({ onPaired }: PairingPanelProps) {
  // Sync PWA (served from desktop :8108) — pairing is automatic
  if (IS_SYNC) return null;

  if (IS_TAURI) return <DesktopPairing />;
  if (IS_PWA) return <PhonePairing onPaired={onPaired} />;
  return null;
}

/** Desktop: shows IP/port + QR code */
function DesktopPairing() {
  const [info, setInfo] = useState<{ ip: string; port: number } | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const result = await invoke<{ ip: string; port: number; running: boolean }>("get_sync_info");
        setInfo(result);
        const url = `http://${result.ip}:${result.port}`;
        try {
          const { generateQrSvg } = await import("../lib/qr");
          setQrSvg(generateQrSvg(url, 180));
        } catch {
          // QR generation failed — that's fine, URL is still shown
        }
      } catch (e) {
        console.error("Failed to get sync info:", e);
      }
    })();
  }, []);

  if (!info) return null;

  const url = `http://${info.ip}:${info.port}`;

  return (
    <div className="pairing-panel">
      <h3>Sync with Phone</h3>
      {qrSvg && (
        <div
          className="pairing-qr"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      )}
      <p className="sync-url">
        <code>{url}</code>
      </p>
      <p className="sync-hint">
        Scan the QR code or enter this address on your phone.
        Both devices must be on the same WiFi network.
      </p>
    </div>
  );
}

/** Phone PWA: IP input for pairing with desktop */
function PhonePairing({ onPaired }: { onPaired?: (paired: boolean) => void }) {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Load saved server URL on mount
  useEffect(() => {
    (async () => {
      const saved = await db.getSetting(SETTING_KEY);
      if (saved) {
        setServerUrl(saved);
        const { setSyncBaseUrl } = await getSyncClient();
        setSyncBaseUrl(saved);
        onPaired?.(true);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = useCallback(async () => {
    const result = validateSyncUrl(input);
    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("testing");
    setMessage("Reaching desktop...");
    const { setSyncBaseUrl, checkServerStatus } = await getSyncClient();
    setSyncBaseUrl(result.url);

    try {
      await checkServerStatus();
      // Success — save
      await db.setSetting(SETTING_KEY, result.url);
      setServerUrl(result.url);
      setStatus("success");
      setMessage("Connected");
      onPaired?.(true);
    } catch (e) {
      const sc = await getSyncClient();
      sc.setSyncBaseUrl("");
      setStatus("error");
      // Detect mixed content / CORS failure
      if (e instanceof TypeError && e.message.includes("Failed to fetch")) {
        setMessage(
          "Could not reach desktop. If you installed Bodhi from the web, " +
          "try opening the sync address directly in your browser instead."
        );
      } else {
        setMessage(e instanceof Error ? e.message : "Connection failed");
      }
    }
  }, [input, onPaired]);

  const handleTest = useCallback(async () => {
    if (!serverUrl) return;
    setStatus("testing");
    const { setSyncBaseUrl, checkServerStatus } = await getSyncClient();
    setSyncBaseUrl(serverUrl);
    try {
      await checkServerStatus();
      setStatus("success");
      setMessage("Connected");
    } catch {
      setStatus("error");
      setMessage("Desktop not reachable. Is it on the same WiFi?");
    }
  }, [serverUrl]);

  const handleForget = useCallback(async () => {
    await db.deleteSetting(SETTING_KEY);
    const { setSyncBaseUrl } = await getSyncClient();
    setSyncBaseUrl("");
    setServerUrl(null);
    setInput("");
    setStatus("idle");
    setMessage("");
    onPaired?.(false);
  }, [onPaired]);

  if (loading) return null;

  // Paired state
  if (serverUrl) {
    return (
      <div className="pairing-panel">
        <h3>Desktop Sync</h3>
        <p className="pairing-connected">
          Syncing with <code>{serverUrl}</code>
        </p>
        {message && (
          <p className={`pairing-status ${status === "error" ? "pairing-error" : ""}`}>
            {message}
          </p>
        )}
        <div className="pairing-actions">
          <button
            className="btn-pair"
            onClick={handleTest}
            disabled={status === "testing"}
          >
            {status === "testing" ? "Testing..." : "Test Connection"}
          </button>
          <button className="btn-forget" onClick={handleForget}>
            Forget
          </button>
        </div>
      </div>
    );
  }

  // Unpaired state
  return (
    <div className="pairing-panel">
      <h3>Connect to Desktop</h3>
      <p className="sync-hint">
        Enter your desktop's IP address to sync notes over WiFi.
      </p>
      <div className="pairing-input-group">
        <input
          className="pairing-input"
          type="text"
          inputMode="url"
          placeholder="192.168.1.x"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <button
          className="btn-pair"
          onClick={handleConnect}
          disabled={status === "testing" || !input.trim()}
        >
          {status === "testing" ? "..." : "Connect"}
        </button>
      </div>
      {message && (
        <p className={`pairing-status ${status === "error" ? "pairing-error" : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}
