/**
 * This module provides an interface used elsewhere for database models.
 */

import {
    Future,
} from '@quenk/noni/lib/control/monad/future';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Object } from '@quenk/noni/lib/data/jsonx';

/**
 * Id of a record or document.
 *
 * This is usually a string or a number depending on the application's needs.
 */
export type Id = string | number;

/**
 * Count of records or documents usually returned from count or update 
 * operations.
 */
export type Count = number;

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
    create(data: T): Future<Id>

    /**
     * search for matching documents in the database.
     *
     * @param filter - An object the database driver can use to filter results.
     * @param opts   - An optional object the database driver may accept with
     *                 configuration options.
     */
    search(filter: object, opts?: object): Future<T[]>

    /**
     * update a single document in the database.
     *
     * @param id       - The id of the target document.
     * @param changes  - Object representing the desired changes.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the updated document.
     * @param opts     - An optional object the database driver may accept with
     *                   configuration options.
     */
    update(id: Id, changes: object, qry?: object,
        opts?: object): Future<boolean>

    /**
     * get a single document by its id.
     * @param id       - The id of the target document.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the returned
     *                   document.
     * @param opts     - An optional object the database driver may accept with
     *                   configuration options.
     */
    get(id: Id, qry?: object, opts?: object): Future<Maybe<T>>

    /**
     * remove a single document by id.
     * @param id       - The id of the target document.
     * @param qry      - An optional object representing additional query params
     *                   this may be used to further filter the returned
     *                   document.
     * @param opts     - An optional object the database driver may accept with
     *                   configuration options.
     */
    remove(id: Id, qry?: object, opts?: object): Future<boolean>

}
