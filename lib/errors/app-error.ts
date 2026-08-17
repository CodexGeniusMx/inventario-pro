export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "MISSING_PROFILE"
  | "INACTIVE_USER"
  | "NETWORK_ERROR"
  | "UNKNOWN"

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = "AppError"
    this.code = code
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to continue.") {
    super("UNAUTHORIZED", message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message)
    this.name = "ForbiddenError"
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the form and try again.") {
    super("VALIDATION_ERROR", message)
    this.name = "ValidationError"
  }
}

export class MissingProfileError extends AppError {
  constructor(
    message = "Your account is not fully set up. Contact an administrator."
  ) {
    super("MISSING_PROFILE", message)
    this.name = "MissingProfileError"
  }
}

export class InactiveUserError extends AppError {
  constructor(message = "Your account has been deactivated.") {
    super("INACTIVE_USER", message)
    this.name = "InactiveUserError"
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends AppError {
  constructor(message = "This record conflicts with existing data.") {
    super("CONFLICT", message)
    this.name = "ConflictError"
  }
}
