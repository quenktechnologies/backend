import * as conn from '@quenk/tendril/lib/app/connection';

import { MongoClient, Db, MongoClientOptions } from 'mongodb';

import { Future, pure, liftP } from '@quenk/noni/lib/control/monad/future';

const DEFAULT_URL = 'mongodb://localhost';

/**
 * MongoDBUrl string used to connect to a database or collection.
 */
export type MongoDBUrl = string;

/**
 * MonogoDBConnectionOptions
 */
export interface MongoDBConnectionOptions extends MongoClientOptions {
    /**
     * url used to establish the db connection.
     */
    url?: MongoDBUrl;
}

/**
 * MongoDBConnection Connection implementation.
 *
 * This uses a single MongoClient and checkouts individual db references.
 */
export class MongoDBConnection implements conn.Connection {
    constructor(public client: MongoClient) {}

    /**
     * create a new MongoDBConnection instance.
     *
     * Note that the actual connection to the database/cluster is only made when
     * the open() method is called.
     */
    static create(
        url: MongoDBUrl,
        opts: MongoDBConnectionOptions = {}
    ): MongoDBConnection {
        return new MongoDBConnection(new MongoClient(url, opts));
    }

    open(): Future<void> {
        return liftP(() => this.client.connect()).map(() => {});
    }

    checkout(): Future<Db> {
        return pure(this.client.db());
    }

    close(): Future<void> {
        return liftP(() => this.client.close());
    }
}

/**
 * create a MongoDB connection.
 */
export const create = (opts: MongoDBConnectionOptions = {}) =>
    MongoDBConnection.create(
        opts.url || process.env.MONGO_URL || DEFAULT_URL,
        opts
    );
