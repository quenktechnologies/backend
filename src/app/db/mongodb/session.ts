import * as session from 'express-session';

import MongoStore, {
    ConnectMongoOptions
} from 'connect-mongo/build/main/lib/MongoStore';

import { Maybe, nothing, just } from '@quenk/noni/lib/data/maybe';
import { Future, raise, pure } from '@quenk/noni/lib/control/monad/future';

import {
    SessionFunc,
    SessionStoreConnection
} from '@quenk/tendril/lib/app/middleware/session/store/connection';

/**
 * MongoDBSessionStore allows a MongoDB cluster to be used as a tendril session
 * store.
 */
export class MongoDBSessionStore implements SessionStoreConnection {
    constructor(public opts: ConnectMongoOptions) {}

    client: Maybe<MongoStore> = nothing();

    /**
     * create a new MongoDBSessionStore instance.
     */
    static create(opts: ConnectMongoOptions) {
        return new MongoDBSessionStore(opts);
    }

    open(): Future<void> {
        let { opts } = this;
        return Future.do(async () => {
            this.client = just(MongoStore.create(<ConnectMongoOptions>opts));
        });
    }

    checkout(): Future<session.Store> {
        return <Future<session.Store>>(
            (this.client.isNothing()
                ? raise(notConnectedErr())
                : pure(this.client.get()))
        );
    }

    close(): Future<void> {
        return Future.do(async () => {
            if (this.client.isJust()) await this.client.get().close();
        });
    }
}

const notConnectedErr = () =>
    new Error(
        'tendril-session-mongodb: Cannot checkout client, not initialized!'
    );

/**
 * create a new MongoDBSession store instance.
 */
export const create = (_: SessionFunc, opts: ConnectMongoOptions = {}) =>
    MongoDBSessionStore.create(opts);
