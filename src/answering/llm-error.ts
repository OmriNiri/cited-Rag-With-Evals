/**
 * Any failure to get a usable reply from the model.
 * `retryable` tells the caller whether trying again could help:
 *   true  -> timeout, network error, server error (5xx/429), malformed reply
 *   false -> request error (4xx, e.g. unknown model name): retrying gives the same result
 */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'LlmError';
  }
}
