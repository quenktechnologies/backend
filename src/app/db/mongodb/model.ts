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
import { empty, mapTo, rmerge } from '@quenk/noni/lib/data/record';

import { Id, Count, Model } from '../../model';

const ERR_CREATE_NO_ID = 'create(): could not retrieve id for target document!';
const ERR_CREATE_MANY_ID = 'createMany(): some documents returned no id!';

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
    id: Id

    /**
     * database connection.
     */
    database: mongo.Db

    /**
     * collection provides the driver handle for the actual collection.
     */
    collection: mongo.Collection

    /**
     * createMany attempts to create multiple documents in one go.
     *
     * This operation is not expected to be atomic and should be used with care.
     *
     * @param data - A list of documents to create.
     */
    createMany(data: T[]): Future<Id[]>

    /**
     * updateMany updates multiple documents in the collection.
     *
     * This uses the $set operation but enables the "multi" flag by default.
     *
     * @param qry      - The query to use to select the documents.
     * @param changes  - The changes to apply in a $set update.
     * @param opts     - Optional options passed to the driver.
     */
    updateMany(qry: object, changes: object, opts?: object): Future<Count>

    /**
     * unsafeUpdate allows for an update command to be executed using a 
     * custom query and update operator(s).
     *
     * Care should be taken when using this method as one can easily
     * accidentally overwrite data!
     *
     * @param qry      - The query to use to select the documents.
     * @param spec     - The raw update operation object.
     * @param opts     - Optional options passed to the driver.
     */
    unsafeUpdate(qry: object, spec: object, opts?: object): Future<Count>

    /**
     * removeMany documents in the collection that match the query.
     *
     * @param qry  - The query to use to select the documents.
     * @param opts - Optional options passed to the driver. 
     */
    removeMany(qry: object, opts?: object): Future<Count>

    /**
     * count the number of documents that match the query.
     *
     * @param qry - The query used to filter the counted documents.
     */
    count(qry: object): Future<Count>

    /**
     * aggregate runs an aggregation pipeline against documents 
     * in the collection.
     *
     * @param pipeline - A list of object representing a MongoDB aggregation 
     *                   pipeline.
     * @param opts     - Options to pass to the driver.
     */
    aggregate(pipeline: object[], opts: object): Future<Object[]>

}

/**
 * BaseModel is an abstract MongoModel that can be extended to satisfy the 
 * interface.
 */
export abstract class BaseModel<T extends Object> implements MongoModel<T> {

    constructor(
        public database: mongo.Db,
        public collection: mongo.Collection) { }

    id = 'id';

    create(data: T): Future<Id> {

        let that = this;

        return doFuture<Id>(function*() {

            let result = yield noniMongo.insertOne(that.collection, data);

            let qry = { _id: result.insertedId };

            let mDoc = yield noniMongo.findOne(that.collection, qry);

            return mDoc.isJust() ?
                pure(<Id>mDoc.get()[that.id]) :
                raise<Id>(new Error(ERR_CREATE_NO_ID))

        });

    }

    createMany(data: T[]): Future<Id[]> {

        let that = this;

        return doFuture<Id[]>(function*() {

            let result = yield noniMongo.insertMany(that.collection, data);

            let qry = { _id: { $in: mapTo(result.insertedIds, id => id) } };

            let opts = { projection: { [that.id]: 1 } };

            let results = yield noniMongo.find(that.collection, qry, opts);

            if (results.length !== data.length)
                return raise<Id[]>(new Error(ERR_CREATE_MANY_ID));

            return pure(results.map((r: Object) => <Id>r[that.id]));

        });

    }

    search(qry: object, opts?: object): Future<T[]> {

        let actualOpts = rmerge({ projection: { _id: false } }, <Object>opts);

        return noniMongo.find(this.collection, qry, actualOpts);

    }

    update(id: Id, changes: object, qry?: object, opts?: object): Future<boolean> {

        let spec = { $set: changes };

        let actualQry = getIdQry(this, id, qry || {});

        return noniMongo.updateOne(this.collection, actualQry, spec, opts)
            .map(result => result.matchedCount > 0);

    }

    updateMany(qry: object, changes: object, opts?: object): Future<number> {

        let { collection } = this;

        return noniMongo.updateMany(collection, qry, { $set: changes }, opts)
            .map(result => result.matchedCount);

    }

    unsafeUpdate(qry: object, spec: object, opts?: object): Future<number> {

        let { collection } = this;

        return noniMongo.updateMany(collection, qry, spec, opts)
            .map(result => result.matchedCount);

    }

    get(id: Id, qry?: object, opts?: object): Future<Maybe<T>> {

        let that = this;

        let actualQry = getIdQry(this, id, qry || {});

        return noniMongo.findOne(that.collection, actualQry, opts);

    }

    remove(id: Id, qry?: object, opts?: object): Future<boolean> {

        let actualQry = getIdQry(this, id, qry || {});

        return noniMongo.deleteOne(this.collection, actualQry, opts)
            .map(result => result.deletedCount > 0);

    }

    removeMany(qry: object, opts?: object): Future<number> {

        return noniMongo.deleteMany(this.collection, qry, opts)
            .map(r => <number>r.deletedCount);

    }

    count(qry: object): Future<number> {

        return noniMongo.count(this.collection, qry);

    }

    aggregate(pipeline: object[], opts?: object): Future<Object[]> {

        return noniMongo.aggregate<Object>(this.collection, pipeline, opts);

    }

}

const getIdQry =
    <T extends Object>(model: MongoModel<T>, id: Id, qry: object): object => {

        let idQry = {

            $or: [

                { [model.id]: id },

                { [model.id]: Number(id) }

            ]

        };

        return empty(qry) ? idQry : { $and: [idQry, qry] };

    }
