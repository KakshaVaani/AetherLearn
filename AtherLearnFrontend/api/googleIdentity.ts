type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

const GIS_SCRIPT_ID = "google-identity-services";

function webClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
}

function ensureWeb() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function loadGoogleScript() {
  if (!ensureWeb()) {
    return Promise.reject(new Error("Google web sign-in is only available in the web build right now."));
  }
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in script failed to load.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in script failed to load."));
    document.head.appendChild(script);
  });
}

export async function requestGoogleIdToken() {
  const clientId = webClientId();
  if (!clientId) {
    throw new Error("Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in AtherLearnFrontend/.env first.");
  }
  await loadGoogleScript();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    window.google?.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        settled = true;
        if (response.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error("Google did not return an ID token."));
      }
    });
    window.google?.accounts.id.prompt((notification) => {
      if (settled) return;
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        settled = true;
        reject(
          new Error(
            notification.getNotDisplayedReason?.() ||
              notification.getSkippedReason?.() ||
              "Google sign-in was cancelled."
          )
        );
      }
    });
  });
}
