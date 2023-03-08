/**
 * This module provides an interface used elsewhere for database models.
 */

import { Future } from '@quenk/noni/lib/control/monad/future';
import { Maybe } from '@quenk/noni/lib/data/maybe';
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
 * SearchParams for search operations.
 *
 * This is largely based on MongoDB and may be revisited in the future.
 */
export interface SearchParams {
    /**
     * filters object used to filter documents.
     */
    filters: Object;

    /**
     * offset indicates which document in the result to start returning
     * documents from.
     */
    offset?: Index;

    /**
     * limit indicates how many documents to limit bthe result by.
     */
    limit?: Count;

    /**
     * sort is an object indicating how to sort the results.
     */
    sort?: Object;

    /**
     * fields to retrieve for each document.
     */
    fields?: object;
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
     * search for matching documents in the database.
     *
     * @param qry - Parameters for the search.
     */
    search(qry: SearchParams): Future<T[]>;

    /**
     * count the number of documents that match the query.
     *
     * @param qry  - Parameters for the count.
     */
    count(qry: SearchParams): Future<Count>;

    /**
     * update a single document in the database.
     *
     * @param id       - The id of the target document.
     * @param changes  - Object representing the desired changes.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the updated document.
     */
    update(id: Id, changes: object, qry?: Object): Future<boolean>;

    /**
     * get a single document by its id.
     * @param id       - The id of the target document.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the returned
     *                   document.
     */
    get(id: Id, qry?: Object): Future<Maybe<T>>;

    /**
     * remove a single document by id.
     * @param id       - The id of the target document.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the returned
     *                   document.
     */
    remove(id: Id, qry?: Object): Future<boolean>;
}
