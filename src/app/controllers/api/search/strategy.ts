import { Future, doFuture, pure } from '@quenk/noni/lib/control/monad/future';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { rmerge } from '@quenk/noni/lib/data/record';

import { Count, FieldSet, Index, Model, SortSet } from '../../../model';
import { SearchResult, PageData } from '.';

/**
 * PagedSearchParams encapsulates a request to search desiring a paginated
 * result
 */
export interface PagedSearchParams {
    /**
     * filters object used to filter documents.
     */
    filters?: Object;

    /**
     * page indicates the current page to return results for.
     */
    page?: Index;

    /**
     * perPage indicates how many documents to consider part of a page.
     */
    perPage?: Count;

    /**
     * sort is an object indicating how to sort the results.
     */
    sort?: SortSet;

    /**
     * fields to retrieve for each document.
     */
    fields?: FieldSet;
}

/**
 * SearchStrategy executes a model search on behalf of a controller.
 *
 * Apps may have different requirements for how searches are executed, instead
 * of embedding the logic directly in a controller, this class allows it to
 * be swapped out as needed.
 */
export interface SearchStrategy {
    /**
     * execute the search.
     */
    execute(
        model: Model<Object>,
        qry: Partial<PagedSearchParams>
    ): Future<SearchResult<Object>>;
}

const searchDefaults = {
    filters: {},
    page: 1,
    perPage: 25,
    sort: {},
    fields: {}
};

/**
 * SkipAndLimit uses the skip and limit method to paginate results.
 *
 * This strategy counts the total number of documents that may be returned from
 * a query to determine the entire result set size. For large workloads, this
 * is in-efficient even when using indexes. However for data intensive apps this
 * may also allow for a better UX when exploring a large dataset.
 */
export class SkipAndLimit implements SearchStrategy {
    execute(
        model: Model<Object>,
        qry: Partial<PagedSearchParams>
    ): Future<SearchResult<Object>> {
        return doFuture(function* () {
            let { filters, page, perPage, sort, fields } = rmerge(
                searchDefaults,
                qry
            );

            let totalCount = yield model.count({ filters });

            let pageCount = Math.ceil(totalCount / perPage);

            //adjust page value so first page will skip 0 records
            page = page - 1;

            let currentPage =
                page < 0 || pageCount === 0
                    ? 0
                    : page >= pageCount
                    ? pageCount - 1
                    : page;

            let offset = currentPage * perPage;

            let data = yield model.search({
                filters,
                offset,
                limit: perPage,
                sort,
                fields
            });

            return pure({
                data,
                pages: new PageData(
                    currentPage + 1,
                    data.length,
                    perPage,
                    pageCount,
                    totalCount
                )
            });
        });
    }
}
