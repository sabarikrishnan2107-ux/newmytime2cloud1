import axios from "axios";

/**
 * Central handling for HTTP 429 (Too Many Requests) across every axios call.
 *
 * The backend rate-limits per authenticated user, or — for our many
 * unauthenticated, company_id-scoped endpoints — per IP (Laravel `throttle`,
 * see backend RouteServiceProvider). When several dashboard widgets fan out at
 * once, or a few users share one office/public IP, a burst trips the limit and
 * the server returns 429. Without handling, that 429 rejects unhandled and the
 * diagnostic overlay shows "AxiosError: Request failed with status code 429".
 *
 * A 429 is not an error to report to the user — it's the server saying "retry
 * shortly". We honor the `Retry-After` header when present, otherwise back off
 * exponentially with jitter, and transparently retry a bounded number of times
 * before finally surfacing the error to the caller.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry-After may be delta-seconds ("5") or an HTTP-date. Returns ms, or null.
const retryAfterMs = (headerVal) => {
  if (!headerVal) return null;
  const secs = Number(headerVal);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const dateMs = Date.parse(headerVal);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
};

const makeRejectedHandler = (instance) => async (error) => {
  const config = error?.config;
  const status = error?.response?.status;

  // Only retry rate-limit responses, and only if we can still replay the request.
  if (status !== 429 || !config) return Promise.reject(error);

  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= MAX_RETRIES) return Promise.reject(error);
  config.__retryCount += 1;

  const serverDelay = retryAfterMs(error.response?.headers?.["retry-after"]);
  // Exponential backoff with jitter when the server gives no explicit hint.
  const backoff = BASE_DELAY_MS * 2 ** (config.__retryCount - 1);
  const jitter = Math.floor(backoff * 0.3 * Math.random());
  const delay = serverDelay != null ? serverDelay : backoff + jitter;

  await sleep(delay);
  return instance(config);
};

// Register at most once per axios instance.
const attached = new WeakSet();

export const attachRetryInterceptor = (instance) => {
  if (!instance || attached.has(instance)) return instance;
  attached.add(instance);
  instance.interceptors.response.use((response) => response, makeRejectedHandler(instance));
  return instance;
};

// Cover the shared global default axios so the many bare `axios.get/post`
// calls (e.g. in lib/api.js) are protected without touching each call site.
attachRetryInterceptor(axios);

export default attachRetryInterceptor;
