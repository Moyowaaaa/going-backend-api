import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

type ErrorExample = {
  summary: string;
  message: string | string[];
  error: string;
};

function errorSchema(status: number) {
  return {
    type: 'object',
    required: ['statusCode', 'message', 'error'],
    properties: {
      statusCode: { type: 'number', example: status },
      message: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
      error: { type: 'string' },
    },
  };
}

export function ApiErrorResponse(
  status: number,
  description: string,
  message: string | string[],
  error: string,
) {
  return ApiResponse({
    status,
    description,
    content: {
      'application/json': {
        schema: errorSchema(status),
        example: { statusCode: status, message, error },
      },
    },
  });
}

export function ApiErrorExamples(
  status: number,
  description: string,
  examples: Record<string, ErrorExample>,
) {
  return ApiResponse({
    status,
    description,
    content: {
      'application/json': {
        schema: errorSchema(status),
        examples: Object.fromEntries(
          Object.entries(examples).map(([name, example]) => [
            name,
            {
              summary: example.summary,
              value: {
                statusCode: status,
                message: example.message,
                error: example.error,
              },
            },
          ]),
        ),
      },
    },
  });
}

export function ApiProtected() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiErrorExamples(401, 'The access token is missing, invalid, or expired.', {
      missingHeader: {
        summary: 'Authorization header missing',
        message: 'Missing or invalid authorization header',
        error: 'Unauthorized',
      },
      missingToken: {
        summary: 'Bearer keyword present without a token',
        message: 'Missing access token',
        error: 'Unauthorized',
      },
      expired: {
        summary: 'Token rejected',
        message: 'Invalid or expired access token',
        error: 'Unauthorized',
      },
    }),
  );
}
