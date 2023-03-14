/**
 * This module provides an interface used elsewhere for database models.
 */

import { Future } from '@quenk/noni/lib/control/monad/future';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Record } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';

/**
 * Id of a record or document.
 *
 * This is usually a string or a number depending on the application's needs.
 */
export type Id = string | number;

/**
 * Index is a pointer to a document in a result set.
 */
export type Index = number;

/**
 * Count of records or documents usually returned from count or update
 * operations.
 */
export type Count = number;

/**
 * FieldSet specifies a set of fields to include or omit in the query results.
 */
export interface FieldSet extends Record<boolean | 1 | 0> { }

/**
 * SortDir indicates ordering to apply to a sort key.
 *
 * 1 indicates ascending, -1 indicates descending.
 */
export type SortDir = 1 | -1;

/**
 * SortSet maps key names to sort indicators for query results.
 */
export type SortSet = Record<SortDir>;

/**
 * GetParams used for the Model's get() operation.
 */
export interface GetParams {
    /**
     * filters to apply to the query.
     */
    filters?: Object;

    /**
     * fields to include in the query results.
     */
    fields?: FieldSet;
}

/**
 * SearchParams used by the Model's search operation.
 */
export interface SearchParams extends GetParams {
    /**
     * offset indicates which document in the result to start returning
     * documents from.
     */
    offset?: Index;

    /**
     * limit indicates how many documents to limit the result by.
     */
    limit?: Count;

    /**
     * sort is an object indicating how to sort the results.
     */
    sort?: SortSet;
}

/**
 * UpdateParams serve as additonal query parameters to a Model's update()
 * method.
 */
export interface UpdateParams {

    /**
     * filters to include in the update request.
     */
    filters: Object

}

/**
 * Model describing common CSUGR operations on documents stored in a database.
 *
 * This interface handles the most common operations; Create,Search,Update,Get,
 * Remove. Implementers may want to add additional methods specific to the
 * backing database (e.g. aggregate() for mongodb).
 */
export interface Model<T extends Object> {
    /**
     * create a new document.
     *
     * @param data - The object to create in the database.
     */
    create(data: T): Future<Id>;

    /**
     * count the number of documents that match the query.
     *
     * @param params - Parameters for the count.
     */
    count(params: SearchParams): Future<Count>;

    /**
     * search for matching documents in the database.
     *
     * @param params - Parameters for the search.
     */
    search(params: SearchParams): Future<T[]>;

    /**
     * update a single document in the database.
     *
     * @param id       - The id of the target document.
     * @param changes  - Object representing the desired changes.
     * @param params   - An optional object representing additional query params
     *                   that may be used to further filter the updated document.
     */
    update(id: Id, changes: Object, params?: UpdateParams): Future<boolean>;

    /**
     * get a single document by its id.
     * @param id       - The id of the target document.
     * @param params   - An optional object representing additional query params
     *                   that may be used to further filter the document.
     */
    get(id: Id, params?: GetParams): Future<Maybe<T>>;

    /**
     * remove a single document by id.
     * @param id       - The id of the target document.
     * @param params   - An optional object representing additional query params
     *                   that may be used to further filter the removed document.
     */
    remove(id: Id, params?: UpdateParams): Future<boolean>;
}
