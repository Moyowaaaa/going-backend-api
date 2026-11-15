import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiErrorResponse } from '../swagger/api-error.js';

/** `400` for a body that failed validation, with one example message. */
export function ApiValidationError(
  description: string,
  messages: string | string[],
) {
  return applyDecorators(
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      description,
      messages,
      'Bad Request',
    ),
  );
}

/** `404` for a resource that is missing or not visible to the caller. */
export function ApiNotFound(description: string, message: string) {
  return applyDecorators(
    ApiErrorResponse(HttpStatus.NOT_FOUND, description, message, 'Not Found'),
  );
}

/** `409` for a request blocked by a duplicate or the resource's current state. */
export function ApiConflict(description: string, message: string) {
  return applyDecorators(
    ApiErrorResponse(HttpStatus.CONFLICT, description, message, 'Conflict'),
  );
}
