import * as session from 'express-session';
import * as cmongo from 'connect-mongodb-session';

import { MongoDBStore } from 'connect-mongodb-session';

import { isString } from '@quenk/noni/lib/data/type';
import { Maybe, nothing, just } from '@quenk/noni/lib/data/maybe';
import {
    Future,
    raise,
    pure,
    fromCallback
} from '@quenk/noni/lib/control/monad/future';

import {
    SessionFunc,
    SessionStoreConnection
} from '@quenk/tendril/lib/app/middleware/session/store/connection';

/**
 * MongoDBSessionStore allows a MongoDB cluster to be used as a tendril session
 * store.
 */
export class MongoDBSessionStore implements SessionStoreConnection {
    constructor(public expressSession: SessionFunc, public opts?: object) {}

    client: Maybe<cmongo.MongoDBStore> = nothing();

    /**
     * create a new MongoDBSessionStore instance.
     */
    static create(expressSession: SessionFunc, opts?: object) {
        return new MongoDBSessionStore(expressSession, opts);
    }

    open(): Future<void> {
        let { opts, expressSession } = this;

        return fromCallback(cb => {
            let Cons: MongoDBStore = cmongo(expressSession);

            if (!isString((<{ uri: string }>opts).uri))
                return cb(uriNotConfiguredErr());

            this.client = just(new Cons(<cmongo.ConnectionInfo>opts));

            cb(null);
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
        if (this.client.isNothing()) return pure(<void>undefined);
        return fromCallback(cb => this.client.get().client.close(cb));
    }
}

const uriNotConfiguredErr = () =>
    new Error('tendril-session-mongodb: No uri specified!');

const notConnectedErr = () =>
    new Error(
        'tendril-session-mongodb: Cannot checkout client, not initialized!'
    );

export const provider = (expressSession: SessionFunc, opts?: object) =>
    new MongoDBSessionStore(expressSession, opts);
