import * as mongo from 'mongodb';
import * as noniClient from '@quenk/noni-mongodb/lib/client';
import * as noniDb from '@quenk/noni-mongodb/lib/database';
import * as noniCollection from '@quenk/noni-mongodb/lib/database/collection';

import { merge } from '@quenk/noni/lib/data/record';
import {
    pure,
    doFuture,
    sequential,
    Future
} from '@quenk/noni/lib/control/monad/future';
import { Type } from '@quenk/noni/lib/data/type';

const defaultConfig = {
    url: 'mongodb://localhost/testkittest',

    collectionNames: [],

    removeAllCollections: false,

    dropDatabase: false
};

/**
 * Configuration for Testkit instances.
 */
export interface Configuration {
    /**
     * url to use to connect the client.
     *
     * The environment variable MONGO_URL is used if this is not specified.
     */
    url: string;

    /**
     * collectionNames is an array of collection names that can be configured to
     * automically remove after each test.
     */
    collectionNames: string[];

    /**
     * removeAlLCollections if true, removes all collections after each test
     * instead of the ones in collectionNames.
     */
    removeAllCollections: boolean;

    /**
     * dropDatabase if true, will drop the database at the end of testing.
     */
    dropDatabase: boolean;
}

/**
 * Testkit provides an API for manipulating a MongoDB database during testing.
 */
export class Testkit {
    constructor(public __config: Partial<Configuration> = {}) {}

    config: Configuration = merge(defaultConfig, this.__config);

    client: mongo.MongoClient = <Type>undefined;

    db: mongo.Db = <Type>undefined;

    /**
     * setUp initializes the client and connects to the database.
     */
    setUp = (): Future<void> => {
        let that = this;

        return doFuture(function* () {
            let { url } = that.config;

            that.client = yield noniClient.connect(
                url ? url : <string>process.env.MONGO_URL
            );

            that.db = that.client.db();

            return pure(<void>undefined);
        });
    };

    /**
     * tearDown should be ran after each test so that the desired collections can
     * be removed after each test.
     */
    tearDown = () => {
        let that = this;

        return doFuture<void>(function* () {
            let { db, config } = that;
            let { removeAllCollections, collectionNames } = config;

            let names =
                removeAllCollections === true
                    ? (yield noniDb.collections(db)).map(
                          (c: mongo.Collection) => c.collectionName
                      )
                    : collectionNames;

            yield sequential(
                names.map((c: string) => noniDb.dropCollection(that.db, c))
            );

            return pure(<void>undefined);
        });
    };

    /*
     * setDown should be ran at the end of the entire suite to drop the database
     * and terminate the connection.
     */
    setDown = () => {
        let that = this;

        return doFuture<void>(function* () {
            if (that.config.dropDatabase) yield noniDb.drop(that.db);

            let client = that.client;

            that.client = <Type>undefined;
            that.db = <Type>undefined;

            return noniClient.disconnect(client);
        });
    };

    /**
     * removeCollection by name.
     */
    removeCollection = (name: string) => noniDb.dropCollection(this.db, name);

    /**
     * populate a collection with the provided data.
     */
    populate = (collection: string, data: object[]) =>
        noniCollection.insertMany(this.db.collection(collection), data);

    /**
     * find documents in a collection that match the provided query object.
     */
    find = (collection: string, qry: object, opts?: object) =>
        noniCollection.find(this.db.collection(collection), qry, opts);

    /**
     * findOne document in a collection that matches the provided query object.
     */
    findOne = (collection: string, qry: object, opts?: object) =>
        noniCollection.findOne(this.db.collection(collection), qry, opts);

    /**
     * update documents in a collection that match the provided query object.
     */
    update = (collection: string, qry: object, spec: object) =>
        noniCollection.updateMany(this.db.collection(collection), qry, spec);

    /**
     * count the number of documetns occuring in a collection.
     */
    count = (collection: string, qry: object) =>
        noniCollection.count(this.db.collection(collection), qry);
}
