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
  constructor(message = "Debes iniciar sesión para continuar.") {
    super("UNAUTHORIZED", message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super("FORBIDDEN", message)
    this.name = "ForbiddenError"
  }
}

export class ValidationError extends AppError {
  constructor(message = "Revisa el formulario e inténtalo de nuevo.") {
    super("VALIDATION_ERROR", message)
    this.name = "ValidationError"
  }
}

export class MissingProfileError extends AppError {
  constructor(
    message = "Tu cuenta no está completamente configurada. Contacta a un administrador."
  ) {
    super("MISSING_PROFILE", message)
    this.name = "MissingProfileError"
  }
}

export class InactiveUserError extends AppError {
  constructor(message = "Tu cuenta ha sido desactivada.") {
    super("INACTIVE_USER", message)
    this.name = "InactiveUserError"
  }
}

export class NotFoundError extends AppError {
  constructor(message = "El recurso solicitado no fue encontrado.") {
    super("NOT_FOUND", message)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends AppError {
  constructor(message = "Este registro entra en conflicto con datos existentes.") {
    super("CONFLICT", message)
    this.name = "ConflictError"
  }
}

export class InsufficientStockError extends AppError {
  constructor(
    message = "Este ajuste resultaría en stock negativo para uno o más artículos."
  ) {
    super("CONFLICT", message)
    this.name = "InsufficientStockError"
  }
}

export class InventoryError extends AppError {
  constructor(message = "No se pudo completar la operación de inventario.") {
    super("UNKNOWN", message)
    this.name = "InventoryError"
  }
}
