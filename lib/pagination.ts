export interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
): PaginationResult {
  const defaultPageSize = options.defaultPageSize ?? 20;
  const maxPageSize = options.maxPageSize ?? 50;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const requestedPageSize = parsePositiveInt(
    searchParams.get("pageSize"),
    defaultPageSize
  );
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function getPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
