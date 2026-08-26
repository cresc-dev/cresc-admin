import type { TablePaginationConfig } from 'antd/es/table';
import type {
  FilterValue,
  SorterResult,
  SortOrder,
} from 'antd/es/table/interface';
import { useEffect, useState } from 'react';
import { type SetURLSearchParams, useSearchParams } from 'react-router-dom';
import { patchSearchParams } from '@/utils/helper';
import { useIsMobile } from '@/utils/responsive';

/**
 * URL-driven table state (pagination / keyword / sort / column filters).
 * Everything lives in the search params so reloads, back navigation and
 * shared links restore it; this only shuttles "URL <-> table", pages still
 * parse their own business filters out of searchParams.
 */

export type SortDirection = 'asc' | 'desc';

/** Debounce between keyword input and the URL, same as the old hand-rolled pages */
const SEARCH_DEBOUNCE_MS = 300;

export const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseOptionalPositiveInt = (value: string | null) => {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/** A mobile screen fits fewer rows, so the default page is smaller */
export const getDefaultPageSize = (isMobile: boolean) => (isMobile ? 10 : 20);

export interface UrlTableStateOptions {
  /** URL param name for the keyword (differs per page for historical reasons, default `search`) */
  searchParam?: string;
  /** Columns allowed in orderBy; omit when the table has no sorting */
  sortableColumns?: ReadonlySet<string>;
  /** Column keys with header filters; handleTableChange mirrors the single value into the same-named URL param */
  filterKeys?: readonly string[];
  /** Normalize a header filter value before writing it to the URL; undefined clears the param */
  normalizeFilter?: (
    key: string,
    value: string | undefined,
  ) => string | undefined;
}

export interface UrlTableState {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  isMobile: boolean;
  page: number;
  pageSize: number;
  /** Keyword currently in effect in the URL (trimmed) */
  searchQuery: string;
  /** Controlled input value, written to the URL after the debounce */
  searchInput: string;
  setSearchInput: (value: string) => void;
  orderBy: string | undefined;
  order: SortDirection | undefined;
  /** For a column's sortOrder, so the header arrow matches the URL */
  sortOrderOf: (field: string) => SortOrder | undefined;
  handleTableChange: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<any> | SorterResult<any>[],
  ) => void;
}

const firstFilterValue = (
  filters: Record<string, FilterValue | null>,
  key: string,
) => {
  const raw = filters[key]?.[0];
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return undefined;
  }
  return String(raw) || undefined;
};

/** Sort params from the URL: a column outside the whitelist counts as unsorted; order is asc only when it says so, otherwise desc */
export const parseSortState = (
  searchParams: URLSearchParams,
  sortableColumns?: ReadonlySet<string>,
): { orderBy: string | undefined; order: SortDirection | undefined } => {
  const orderByParam = searchParams.get('orderBy') ?? undefined;
  const orderBy =
    orderByParam && sortableColumns?.has(orderByParam)
      ? orderByParam
      : undefined;
  const order: SortDirection | undefined =
    searchParams.get('order') === 'asc' ? 'asc' : orderBy ? 'desc' : undefined;
  return { orderBy, order };
};

/** The three antd Table onChange args -> the patch to write back to the URL (undefined removes the param) */
export const buildTableChangePatch = ({
  pagination,
  filters,
  sorter,
  pageSize,
  filterKeys = [],
  sortableColumns,
  normalizeFilter,
}: Pick<
  UrlTableStateOptions,
  'filterKeys' | 'sortableColumns' | 'normalizeFilter'
> & {
  pagination: TablePaginationConfig;
  filters: Record<string, FilterValue | null>;
  sorter: SorterResult<any> | SorterResult<any>[];
  /** Page size currently in effect, the fallback when pagination omits it */
  pageSize: number;
}): Record<string, string | undefined> => {
  const patch: Record<string, string | undefined> = {
    page: String(pagination.current ?? 1),
    pageSize: String(pagination.pageSize ?? pageSize),
  };

  for (const key of filterKeys) {
    const value = firstFilterValue(filters, key);
    patch[key] = normalizeFilter ? normalizeFilter(key, value) : value;
  }

  if (sortableColumns) {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const field =
      single?.order && typeof single.field === 'string'
        ? single.field
        : undefined;
    patch.orderBy = field && sortableColumns.has(field) ? field : undefined;
    patch.order =
      field && single?.order
        ? single.order === 'ascend'
          ? 'asc'
          : 'desc'
        : undefined;
  }

  return patch;
};

export const useUrlTableState = ({
  searchParam = 'search',
  sortableColumns,
  filterKeys = [],
  normalizeFilter,
}: UrlTableStateOptions = {}): UrlTableState => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get(searchParam)?.trim() ?? '';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    getDefaultPageSize(isMobile),
  );
  const { orderBy, order } = parseSortState(searchParams, sortableColumns);

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Realign the input when the URL changes externally (back navigation, clear)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmedKeyword = searchInput.trim();
    if (trimmedKeyword === searchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      patchSearchParams(setSearchParams, {
        [searchParam]: trimmedKeyword || undefined,
        page: '1',
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, searchQuery, searchParam, setSearchParams]);

  const sortOrderOf = (field: string): SortOrder | undefined =>
    orderBy === field ? (order === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: UrlTableState['handleTableChange'] = (
    pagination,
    filters,
    sorter,
  ) => {
    patchSearchParams(
      setSearchParams,
      buildTableChangePatch({
        pagination,
        filters,
        sorter,
        pageSize,
        filterKeys,
        sortableColumns,
        normalizeFilter,
      }),
    );
  };

  return {
    searchParams,
    setSearchParams,
    isMobile,
    page,
    pageSize,
    searchQuery,
    searchInput,
    setSearchInput,
    orderBy,
    order,
    sortOrderOf,
    handleTableChange,
  };
};

/**
 * Pull the current page back to the last page when it exceeds the page count
 * (common after deletes and filters). Does nothing while ready is false: a
 * keepPreviousData placeholder carries the previous total, and clamping on it
 * would yank back the page the user just navigated to.
 */
export const usePageClamp = (
  {
    page,
    pageSize,
    setSearchParams,
  }: Pick<UrlTableState, 'page' | 'pageSize' | 'setSearchParams'>,
  total: number,
  ready: boolean,
) => {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (ready && page > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [ready, page, maxPage, setSearchParams]);
};

/** Pagination config shared by the list pages: simple mode on mobile, quick jumper and size changer on desktop */
export const getTablePagination = (
  {
    isMobile,
    page,
    pageSize,
  }: Pick<UrlTableState, 'isMobile' | 'page' | 'pageSize'>,
  total: number,
  showTotal: (count: number) => string,
): TablePaginationConfig => ({
  current: page,
  pageSize,
  total,
  simple: isMobile,
  showQuickJumper: !isMobile,
  showSizeChanger: !isMobile,
  showTotal: isMobile ? undefined : showTotal,
});
