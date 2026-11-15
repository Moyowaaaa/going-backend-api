import { ApiTags } from '@nestjs/swagger';

/**
 * Controller-level tag. A thin `@ApiTags()` wrapper provided so a controller
 * declares its tag the same way it declares its operations: with one named
 * decorator per documentation concern, kept in `src/common/decorators/`.
 */
export function ApiControllerTag(...tags: string[]): ClassDecorator {
  return ApiTags(...tags);
}
