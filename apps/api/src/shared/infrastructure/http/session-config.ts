// Sessions last 30 days. Activity renews them, so regular users are not signed out.
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_WHEN_LEFT_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
