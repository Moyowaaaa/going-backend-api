import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

type WrappedResponseOptions = {
  status: number;
  description: string;
  example: unknown;
  model?: Type<unknown>;
  isArray?: boolean;
  meta?: Record<string, number | boolean>;
};

const metaSchema = {
  type: 'object',
  required: [
    'total',
    'page',
    'limit',
    'totalPages',
    'hasNextPage',
    'hasPreviousPage',
  ],
  properties: {
    total: { type: 'number', example: 125 },
    page: { type: 'number', example: 1 },
    limit: { type: 'number', example: 20 },
    totalPages: { type: 'number', example: 7 },
    hasNextPage: { type: 'boolean', example: true },
    hasPreviousPage: { type: 'boolean', example: false },
  },
};

function schemaForExample(example: unknown) {
  if (Array.isArray(example)) {
    return { type: 'array', example };
  }
  if (example === null) {
    return { nullable: true, example: null };
  }
  const type = typeof example;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return { type, example };
  }
  return { type: 'object', example };
}

export function ApiWrappedResponse(options: WrappedResponseOptions) {
  const dataSchema = options.model
    ? options.isArray
      ? { type: 'array', items: { $ref: getSchemaPath(options.model) } }
      : { $ref: getSchemaPath(options.model) }
    : schemaForExample(options.example);

  const bodySchema = options.meta
    ? {
        type: 'object',
        required: ['data', 'meta'],
        properties: { data: dataSchema, meta: metaSchema },
      }
    : dataSchema;

  const bodyExample = options.meta
    ? { data: options.example, meta: options.meta }
    : options.example;

  return applyDecorators(
    ...(options.model ? [ApiExtraModels(options.model)] : []),
    ApiResponse({
      status: options.status,
      description: options.description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['statusCode', 'message', 'data'],
            properties: {
              statusCode: { type: 'number', example: options.status },
              message: { type: 'string', example: 'Success' },
              data: bodySchema,
            },
          },
          example: {
            statusCode: options.status,
            message: 'Success',
            data: bodyExample,
          },
        },
      },
    }),
  );
}
