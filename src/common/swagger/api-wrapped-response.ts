import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

type WrappedResponseOptions = {
  status: number;
  description: string;
  example: unknown;
  model?: Type<unknown>;
  isArray?: boolean;
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
              data: dataSchema,
            },
          },
          example: {
            statusCode: options.status,
            message: 'Success',
            data: options.example,
          },
        },
      },
    }),
  );
}
