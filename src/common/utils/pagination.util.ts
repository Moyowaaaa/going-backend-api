import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../dto/pagination.dto.js';

export type PaginationArgs = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};


export function paginationArgs(
  page?: number,
  limit?: number,
): PaginationArgs {
  const safePage = page ?? DEFAULT_PAGE;
  const safeLimit = limit ?? DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}


export function paginate<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationArgs,
): Paginated<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
