import * as mongodb from 'mongodb';

import { Object } from '@quenk/noni/lib/data/jsonx';
import { Future, pure, doFuture } from '@quenk/noni/lib/control/monad/future';
import { unsafeGet } from '@quenk/noni/lib/data/record/path';
import { merge } from '@quenk/noni/lib/data/record';

import { succeed, fail } from '@quenk/preconditions/lib/result';

import {
    findOneAndUpdate,
    count
} from '@quenk/noni-mongodb/lib/database/collection';
import { AsyncResult } from '../../data/checks';

/**
 * CollectionName indicates the name of a collection.
 */
export type CollectionName = string;

/**
 * FieldName indicates the name or path of a field.
 */
export type FieldName = string;

/**
 * Provider provides a collection.
 */
export type Provider = (name?: CollectionName) => Future<mongodb.Collection>;

/**
 * exists checks if a value exists in the database before proceeding.
 */
export const exists =
    <A>(getter: Provider, collection: CollectionName, field = 'id') =>
    (value: A): AsyncResult<A, A> =>
        doFuture(function* () {
            let n = yield count(yield getter(collection), { [field]: value });

            return pure(
                n < 1
                    ? fail<A, A>('exists', value, { value })
                    : succeed<A, A>(value)
            );
        });

/**
 * unique fails if the value specified for the field is already stored in the
 * database.
 */
export const unique =
    <A>(getter: Provider, collection: CollectionName, field: FieldName) =>
    (value: A): AsyncResult<A, A> =>
        doFuture(function* () {
            let db = yield getter(collection);

            let n = yield count(db.collection(collection), {
                [field]: value
            });
            return pure(
                n > 0
                    ? fail<A, A>('unique', value, { value })
                    : succeed<A, A>(value)
            );
        });

/**
 * IncOptions used by the inc check to generate and maintain counters.
 */
export interface IncOptions {
    /**
     * collection provider to use.
     */
    collection: Provider;

    /**
     * filter to apply to the collection to find the desired object with the
     * counter.
     */
    filter?: object;

    /**
     * field to update to increment the counter.
     */
    field: FieldName;

    /**
     * target is the property in the document to store the incremented value at
     */
    target?: string;
}

const defaultIncOptions = {
    filter: {},
    target: 'id'
};

/**
 * inc increments a counter stored in the database returning the value.
 *
 * This is used mostly for generating sequential ids.
 *
 * Note: This was previously used at the field level but that wastes ids when
 * other checks fail. Instead, it now expects the whole object and will assign
 * the value to the target property directly.
 */
export const inc =
    <T extends Object>(incOpts: IncOptions) =>
    (value: T): AsyncResult<T, T> =>
        doFuture(function* () {
            let conf = merge(defaultIncOptions, incOpts);

            let db = yield conf.collection();

            let target = db.collection(conf.collection);

            let update = { $inc: { [conf.field]: 1 } };

            let opts = { returnDocument: 'after', upsert: true };

            let mresult = yield findOneAndUpdate(
                target,
                conf.filter,
                update,
                opts
            );

            (<Object>value)[conf.target] = unsafeGet(conf.field, mresult.get());

            return pure(succeed(value));
        });
