import { useState } from "react";
import { IS_TAURI } from "../lib/env";

type UpdateState = "idle" | "checking" | "up-to-date" | "available" | "installing" | "error";

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!IS_TAURI) return null;

  async function handleCheck() {
    setState("checking");
    setErrorMsg("");

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        setState("up-to-date");
        return;
      }

      setState("available");

      // Small pause so user sees the "available" state
      await new Promise((r) => setTimeout(r, 600));
      setState("installing");

      await update.downloadAndInstall();

      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Update check failed");
    }
  }

  return (
    <div className="update-checker">
      {state === "idle" && (
        <button className="btn-update" onClick={handleCheck}>
          Check for updates
        </button>
      )}

      {state === "checking" && (
        <span className="update-status">Checking...</span>
      )}

      {state === "up-to-date" && (
        <span className="update-status update-ok">
          You have the latest version
        </span>
      )}

      {state === "available" && (
        <span className="update-status">Update found, preparing...</span>
      )}

      {state === "installing" && (
        <span className="update-status">Installing update...</span>
      )}

      {state === "error" && (
        <div className="update-error">
          <span>{errorMsg}</span>
          <button className="btn-update" onClick={handleCheck}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
