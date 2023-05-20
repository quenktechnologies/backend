import * as conn from '@quenk/tendril/lib/app/connection';

import { MongoClient, Db, MongoClientOptions } from 'mongodb';

import { Future, pure, liftP } from '@quenk/noni/lib/control/monad/future';

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
        url: string,
        opts: MongoClientOptions = {}
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
 * connector for creating Connections to a MongoDB instance.
 */
export const connector = MongoDBConnection.create;
