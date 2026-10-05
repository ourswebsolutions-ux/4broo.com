// Application error model.
//
// Anything thrown as an AppError carries a status code and a message that is
// safe to show to customers. Every other error is treated as internal: it is
// logged server-side and the customer only sees a generic message + error id.

export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", details, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Attach a dictionary key (+ variables) so storefront actions can show the
   * message in the customer's language. `message` stays the English fallback.
   */
  localized(key, vars) {
    this.i18n = { key, vars };
    return this;
  }
}

export class ValidationError extends AppError {
  /** @param {Record<string, string[]>} fieldErrors */
  constructor(message = "Please check the highlighted fields.", fieldErrors = {}) {
    super(message, { status: 422, code: "VALIDATION_ERROR", details: { fieldErrors } });
    this.fieldErrors = fieldErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, { status: 401, code: "UNAUTHENTICATED" });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, { status: 403, code: "FORBIDDEN" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super(message, { status: 404, code: "NOT_FOUND" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "This resource already exists.") {
    super(message, { status: 409, code: "CONFLICT" });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Please wait a moment and try again.", retryAfterSeconds) {
    super(message, { status: 429, code: "RATE_LIMITED", details: { retryAfterSeconds } });
  }
}

/** Server misconfiguration (missing env vars etc.). The public message stays generic. */
export class ConfigurationError extends AppError {
  constructor(internalMessage) {
    super("This service is temporarily unavailable.", { status: 503, code: "SERVICE_UNAVAILABLE" });
    this.internalMessage = internalMessage;
  }
}

/** Failure of a third-party dependency (email, WhatsApp, Cloudinary, payments). */
export class ExternalServiceError extends AppError {
  constructor(service, internalMessage, { status = 502, cause, upstreamStatus } = {}) {
    super("An external service is temporarily unavailable. Please try again shortly.", {
      status,
      code: "EXTERNAL_SERVICE_ERROR",
      cause,
    });
    this.service = service;
    this.internalMessage = internalMessage;
    this.upstreamStatus = upstreamStatus;
  }
}

const PRISMA_ERROR_MAP = {
  P2002: () => new ConflictError(),
  P2025: () => new NotFoundError(),
  P2003: () => new AppError("This action conflicts with related data.", { status: 409, code: "CONFLICT" }),
};

/**
 * Convert any thrown value into an AppError. Known Prisma request errors map
 * to meaningful HTTP errors; everything else becomes a generic 500.
 */
export function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error && typeof error === "object" && typeof error.code === "string" && error.code in PRISMA_ERROR_MAP) {
    const mapped = PRISMA_ERROR_MAP[error.code]();
    mapped.cause = error;
    return mapped;
  }

  return new AppError("Something went wrong. Please try again.", { cause: error });
}

/** Shape sent to clients — never includes stacks, causes or internal messages. */
export function toPublicError(appError, errorId) {
  return {
    code: appError.code,
    message: appError.message,
    ...(appError.code === "VALIDATION_ERROR" && { fieldErrors: appError.fieldErrors }),
    ...(appError.code === "RATE_LIMITED" && { retryAfterSeconds: appError.details?.retryAfterSeconds }),
    ...(errorId && { errorId }),
  };
}
