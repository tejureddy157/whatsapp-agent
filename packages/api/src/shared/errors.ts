export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class SignatureVerificationError extends AppError {
  constructor(message = "Invalid webhook signature") {
    super(message, "INVALID_SIGNATURE", 401);
  }
}

export class WhatsAppSendError extends AppError {
  constructor(message: string) {
    super(message, "WHATSAPP_SEND_FAILED", 502);
  }
}

export class LlmError extends AppError {
  constructor(message: string) {
    super(message, "LLM_REQUEST_FAILED", 502);
  }
}
