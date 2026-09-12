import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing at all unless PUBLIC_TURNSTILE_SITE_KEY is configured, so an
 * unconfigured environment ships no third-party script and makes no requests.
 * There is deliberately no built-in test site key - see lib/security/turnstile.ts.
 *
 * Pair with TURNSTILE_SECRET on the server: the site key produces the token,
 * the secret verifies it. Setting only one of the two is a misconfiguration -
 * secret-without-sitekey rejects every real user (fail closed), and
 * sitekey-without-secret renders a challenge nobody checks.
 */

const SITE_KEY = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined)?.trim();
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

export const turnstileConfigured = Boolean(SITE_KEY);

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.turnstile) return resolve();

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile failed")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile failed"));
    document.head.appendChild(s);
  });
}

type Props = {
  /** Receives the solved token, or null when it expires / errors out. */
  onToken: (token: string | null) => void;
  className?: string;
};

export default function TurnstileWidget({ onToken, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
          theme: "light",
          action: "lead",
        });
      })
      .catch(() => {
        // Script blocked or offline. Leave the token null - the server decides
        // whether that is fatal, which it is whenever the secret is set.
        onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already torn down */
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={hostRef} className={className} />;
}
