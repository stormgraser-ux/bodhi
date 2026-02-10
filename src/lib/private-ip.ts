/** Validate that an IP address belongs to a private/link-local range. */
export function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Parse user input (bare IP, IP:port, or full URL) into a normalized sync URL.
 * Returns `{ url }` on success or `{ error }` on failure.
 */
export function validateSyncUrl(input: string): { url: string } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Please enter your desktop's IP address" };

  let ip: string;
  let port = 8108;

  // Full URL: http://192.168.1.5:8108
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      ip = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
    } catch {
      return { error: "Invalid URL format" };
    }
  } else if (trimmed.includes(":")) {
    // IP:port
    const [ipPart, portPart] = trimmed.split(":");
    ip = ipPart;
    const p = Number(portPart);
    if (isNaN(p) || p < 1 || p > 65535) return { error: "Invalid port number" };
    port = p;
  } else {
    // Bare IP
    ip = trimmed;
  }

  if (!isPrivateIp(ip)) {
    return { error: "Not a private IP address. Bodhi only syncs over your local network." };
  }

  return { url: `http://${ip}:${port}` };
}
