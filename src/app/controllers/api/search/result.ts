import { Object } from '@quenk/noni/lib/data/jsonx';

/**
 * CurrentSection holds pagination information on the current page.
 */
export interface CurrentSection {
    /**
     * count of the current set.
     */
    count: number;

    /**
     * page number of the current set in the total result.
     */
    page: number;

    /**
     * perPage indicates how many rows are allowed per page.
     */
    limit: number;
}

/**
 * TotalSection holds pagination information for the entire result.
 */
export interface TotalSection {
    /**
     * count of the entire result set.
     */
    count: number;

    /**
     * pages available for the entire result.
     */
    pages: number;
}

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
     * meta contains various useful pieces of information about the search
     * result.
     */
    meta: {
        /**
         * pagination information for the result.
         */
        pagination: {
            /**
             * current page information.
             */
            current: CurrentSection;

            /**
             * total section (the entire result).
             */
            total: TotalSection;
        };
    };
}
