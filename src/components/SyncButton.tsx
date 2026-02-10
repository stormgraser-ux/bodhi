import { useState, useCallback, useEffect } from "react";
import { IS_SYNC, IS_PWA } from "../lib/env";
import { performSync, setSyncBaseUrl } from "../lib/sync-client";
import * as db from "../lib/db";

type SyncState = "idle" | "syncing" | "synced" | "error";

interface SyncButtonProps {
  onSyncComplete: () => void;
  /** Whether the phone PWA is paired with a desktop (ignored for sync PWA). */
  paired?: boolean;
}

export function SyncButton({ onSyncComplete, paired }: SyncButtonProps) {
  const [state, setState] = useState<SyncState>("idle");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount (PWA only): load saved server URL so sync-client knows where to call
  useEffect(() => {
    if (!IS_PWA || IS_SYNC) return;
    (async () => {
      const saved = await db.getSetting("sync-server-url");
      if (saved) setSyncBaseUrl(saved);
    })();
  }, []);

  const handleSync = useCallback(async () => {
    setState("syncing");
    setError(null);
    try {
      await performSync();
      setState("synced");
      setLastSynced(new Date().toLocaleTimeString());
      onSyncComplete();
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Sync failed");
    }
  }, [onSyncComplete]);

  // Show when: sync PWA (always), or PWA when paired
  const visible = IS_SYNC || (IS_PWA && paired);
  if (!visible) return null;

  return (
    <div className="sync-button-container">
      <button
        className={`btn-sync ${state}`}
        onClick={handleSync}
        disabled={state === "syncing"}
      >
        {state === "syncing" ? (
          <span className="sync-spinner" />
        ) : (
          <span className="sync-icon">&#x21BB;</span>
        )}
        <span className="sync-label">
          {state === "syncing" ? "Syncing..." : "Sync"}
        </span>
      </button>
      {lastSynced && state === "synced" && (
        <span className="sync-time">Last: {lastSynced}</span>
      )}
      {error && <span className="sync-error">{error}</span>}
    </div>
  );
}
