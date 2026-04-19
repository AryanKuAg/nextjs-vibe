export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string | undefined;
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
            callback: (response: { credential: string }) => Promise<void>;
          }) => void;
          prompt: (callback: (notification: {
            isNotDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
            isSkippedMoment: () => boolean;
            getSkippedReason: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
    _googleOneTapPrompted?: boolean;
  }
}
