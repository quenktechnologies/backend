import { Object } from '@quenk/noni/lib/data/jsonx';

import { Count, Index } from '../../../model';

/**
 * SearchResult contains the result of a successful search as well as additional
 * meta information related to paging.
 */
export interface SearchResult<T extends Object> {
    /**
     * data is the paginated data returned from the query.
     */
    data: T[];

    /**
     * pages holds meta data for pagination.
     */
    pages: PageData;
}

/**
 * PageData holds information about the pagination and size of the entire
 * result set.
 */
export class PageData {
    /**
     * @param current       - The current page returned in the results.
     * @param currentCount  - The count of the current page.
     * @param maxPerPage    - The max number of results to expect in one page.
     * @param totalPages    - The total number of result pages.
     * @param totalCount    - The count of the entire result set.
     */
    constructor(
        public current: Index,
        public currentCount: Count,
        public maxPerPage: Count,
        public totalPages: Count,
        public totalCount: Count
    ) {}
}
