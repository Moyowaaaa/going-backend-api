import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiErrorExamples, ApiProtected } from '../swagger/api-error.js';
import { ApiWrappedResponse } from '../swagger/api-wrapped-response.js';
import { paginationMetaExample } from '../swagger/samples.js';

type ApiOperationOptions = {
  /** Operation summary, shown as its title in Swagger UI. */
  summary: string;
  /** Operation description, shown under the title. */
  description?: string;
  /** What a successful call returns, shown under the response code. */
  responseDescription: string;
  model?: Type<unknown>;
  example: unknown;
  isArray?: boolean;
  meta?: Record<string, number | boolean>;
  /** The 2xx status. Defaults to 200; creation answers 201. */
  status?: number;
  /** Add the Bearer requirement and its documented 401. */
  protected?: boolean;
};

function documented(options: ApiOperationOptions) {
  const {
    summary,
    description,
    responseDescription,
    status = HttpStatus.OK,
    protected: isProtected,
    ...body
  } = options;

  return applyDecorators(
    ...(isProtected ? [ApiProtected()] : []),
    ApiOperation({ summary, description }),
    ApiWrappedResponse({ ...body, status, description: responseDescription }),
  );
}

/**
 * `POST` that creates a resource: 201 Created carrying the created model.
 * Errors specific to the handler (400, 404, 409) stay at the call site.
 */
export function ApiCreate(options: Omit<ApiOperationOptions, 'status'>) {
  return documented({ ...options, status: HttpStatus.CREATED });
}

/** `GET` returning the success envelope. */
export function ApiGet(options: ApiOperationOptions) {
  return documented(options);
}

/** `PATCH`/`PUT` returning the updated model. Same options as `ApiGet`. */
export function ApiUpdate(options: ApiOperationOptions) {
  return documented(options);
}

/** One page of a collection: `data` is an array, alongside `meta`. */
export function ApiPaginatedList(
  options: Omit<ApiOperationOptions, 'status' | 'meta'>,
) {
  return documented({
    ...options,
    isArray: true,
    meta: paginationMetaExample,
  });
}

/** `DELETE` answering 200 with a confirmation string in `data`. */
export function ApiDelete(options: Omit<ApiOperationOptions, 'status'>) {
  return documented(options);
}

/**
 * A read that accepts an optional token: an anonymous caller gets public data
 * only, while a token that is sent must be valid.
 */
export function ApiOptionalAuth() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiErrorExamples(
      HttpStatus.UNAUTHORIZED,
      'A Bearer token was sent but it is invalid or expired.',
      {
        invalidToken: {
          summary: 'Token rejected',
          message: 'Invalid or expired access token',
          error: 'Unauthorized',
        },
      },
    ),
  );
}
