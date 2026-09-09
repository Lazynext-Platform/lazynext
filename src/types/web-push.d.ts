/**
 * Minimal ambient type declaration for the `web-push` library.
 *
 * The dependency is optional — push sending is a progressive enhancement and
 * the service falls back to `{ sent: 0, error: 'not_configured' }` when the
 * module cannot be imported. This declaration lets `tsc` type-check the dynamic
 * import site without requiring the package to be installed.
 */
declare module 'web-push' {
  export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
  }
  export interface PushSubscription {
    endpoint: string;
    keys: PushSubscriptionKeys;
    expirationTime: number | null;
  }
  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string,
  ): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload: string,
  ): Promise<SendResult>;
  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default _default;
}
