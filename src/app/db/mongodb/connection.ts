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
export const connector = (
    url: string,
    opts: MongoClientOptions = {}
): MongoDBConnection => new MongoDBConnection(new MongoClient(url, opts));
