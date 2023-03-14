/**
 * This module provides an interface an abstract class for implementing a basic
 * model in application built with tendril and mongodb.
 */
import * as mongo from 'mongodb';
import * as noniMongo from '@quenk/noni-mongodb/lib/database/collection';

import {
    Future,
    pure,
    raise,
    doFuture
} from '@quenk/noni/lib/control/monad/future';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { empty, merge } from '@quenk/noni/lib/data/record';
import { flatten } from '@quenk/noni/lib/data/record/path';

import { Id, Model, SearchParams, GetParams, UpdateParams } from '../../model';

const ERR_CREATE_NO_ID = 'create(): could not retrieve id for target document!';

/**
 * CollectionName is the name of a collection.
 */
export type CollectionName = string;

/**
 * MongoModel is a Model implementation specialized for use with MongoDB.
 */
export interface MongoModel<T extends Object> extends Model<T> {
    /**
     * id is the name of the property that is used as the id key for each
     * document in the collection.
     */
    id: Id;

    /**
     * database connection.
     */
    database: mongo.Db;

    /**
     * collection provides the driver handle for the actual collection.
     */
    collection: mongo.Collection;

    /**
     * aggregate runs an aggregation pipeline against documents
     * in the collection.
     *
     * @param pipeline - A list of object representing a MongoDB aggregation
     *                   pipeline.
     * @param opts     - Options to pass to the driver.
     */
    aggregate(pipeline: object[], opts: object): Future<Object[]>;
}

/**
 * BaseModel is an abstract MongoModel that can be extended to satisfy the
 * interface.
 */
export abstract class BaseModel<T extends Object> implements MongoModel<T> {
    constructor(
        public database: mongo.Db,
        public collection: mongo.Collection
    ) { }

    id = 'id';

    create(data: T): Future<Id> {
        let that = this;

        return doFuture<Id>(function*() {
            let result = yield noniMongo.insertOne(that.collection, data);

            let qry = { _id: result.insertedId };

            let mDoc = yield noniMongo.findOne(that.collection, qry);

            return mDoc.isJust()
                ? pure(<Id>mDoc.get()[that.id])
                : raise<Id>(new Error(ERR_CREATE_NO_ID));
        });
    }

    count(params: SearchParams): Future<number> {
        let {
            filters = {},
            offset,
            limit,
        } = params;
        return noniMongo.count(this.collection, filters, {
            limit,
            skip: offset,
        });
    }

    search(params: SearchParams): Future<T[]> {
        let {
            filters = {},
            offset,
            limit,
            sort,
            fields
        } = params;
        return noniMongo.find(this.collection, filters, {
            projection: merge({ _id: false }, fields || {}),
            limit,
            skip: offset,
            sort
        });
    }

    update(
        id: Id,
        changes: Object,
        params?: UpdateParams,
    ): Future<boolean> {
        let actualQry = getIdQry(this, id, params && params.filters || {});

        return noniMongo
            .updateOne(this.collection, actualQry, { $set: flatten(changes) })
            .map(result => result.matchedCount > 0);
    }

    get(id: Id, params?: GetParams): Future<Maybe<T>> {
        let that = this;

        let { filters = {}, fields = {} } = params || {};

        let qry = getIdQry(this, id, filters);

        return noniMongo.findOne(that.collection, qry, {
            projection: merge({ _id: false }, fields)
        });
    }

    remove(id: Id, params?: UpdateParams): Future<boolean> {
        let { filters = {} } = params || {};

        let qry = getIdQry(this, id, filters);

        return noniMongo
            .deleteOne(this.collection, qry)
            .map(result => result.deletedCount > 0);
    }

    aggregate(pipeline: object[], opts?: object): Future<Object[]> {
        return noniMongo.aggregate<Object>(this.collection, pipeline, opts);
    }
}

const getIdQry = <T extends Object>(
    model: MongoModel<T>,
    id: Id,
    qry: object
): object => {
    let idQry = {
        $or: [{ [model.id]: id }, { [model.id]: Number(id) }]
    };

    return empty(qry) ? idQry : { $and: [idQry, qry] };
};
