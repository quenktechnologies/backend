import * as noniCollection from '@quenk/noni-mongodb/lib/database/collection';
import * as noniDb from '@quenk/noni-mongodb/lib/database';

import {
    toPromise,
    attempt,
    doFuture,
    liftP
} from '@quenk/noni/lib/control/monad/future';
import { assert } from '@quenk/test/lib/assert';

import { Testkit } from '../../../../lib/app/db/mongodb/testkit';

let kit = new Testkit({ dropDatabase: true, removeAllCollections: true });

describe('Testkit', () => {
    before(() => toPromise(kit.setUp()));

    describe('setUp', () => {
        it('should connect using MONGO_URL if no url specified', () =>
            toPromise(
                doFuture(function* () {
                    process.env.MONGO_URL = 'mongodb://localhost/fooman';

                    let lkit = new Testkit({ url: '' });

                    yield lkit.setUp();

                    yield attempt(() =>
                        assert(lkit.db.databaseName).equal('fooman')
                    );

                    return liftP(() => lkit.client.close());
                })
            ));
    });

    describe('tearDown', () => {
        it('should only remove intended collections', () =>
            toPromise(
                doFuture(function* () {
                    let lkit = new Testkit({ collectionNames: ['pains'] });

                    yield lkit.setUp();
                    yield lkit.populate('names', [{ f: 1 }]);
                    yield lkit.populate('games', [{ f: 1 }]);
                    yield lkit.populate('pains', [{ f: 1 }]);
                    yield lkit.tearDown();

                    let res = yield noniDb.collections(lkit.db);

                    yield attempt(() => assert(res.length).equal(2));

                    return liftP(() => lkit.client.close());
                })
            ));

        it('should remove all collections when told to', () =>
            toPromise(
                doFuture(function* () {
                    let lkit = new Testkit({ removeAllCollections: true });

                    yield lkit.setUp();
                    yield lkit.populate('names', [{ f: 1 }]);
                    yield lkit.populate('games', [{ f: 1 }]);
                    yield lkit.populate('pains', [{ f: 1 }]);
                    yield lkit.tearDown();

                    let res = yield noniDb.collections(lkit.db);

                    yield attempt(() => assert(res.length).equal(0));

                    return liftP(() => lkit.client.close());
                })
            ));
    });

    describe('setDown', () => {
        it('should not drop the database if not told to', () => {
            it('should remove all collections when told to', () =>
                toPromise(
                    doFuture(function* () {
                        let lkit = new Testkit();

                        yield lkit.setUp();
                        yield lkit.populate('names', [{ f: 1 }]);
                        yield lkit.populate('games', [{ f: 1 }]);
                        yield lkit.populate('pains', [{ f: 1 }]);
                        yield lkit.setDown();

                        let res = yield noniDb.collections(kit.db);

                        return attempt(() => assert(res.length).equal(3));
                    })
                ));
        });
    });

    describe('populate', () => {
        it('should populate data', () =>
            toPromise(
                doFuture(function* () {
                    let data = [{ id: 1 }, { id: 2 }, { id: 3 }];

                    yield kit.populate('datums', data);

                    let results = yield noniCollection.find(
                        kit.db.collection('datums'),
                        {}
                    );

                    return attempt(() => assert(results.length).equal(3));
                })
            ));
    });

    describe('removeCollection', () => {
        it('should remove collections', () =>
            toPromise(
                doFuture(function* () {
                    yield kit.populate('datums', [{ name: 1 }]);

                    let results = yield noniCollection.find(
                        kit.db.collection('datums'),
                        {}
                    );

                    yield attempt(() => assert(results.length).equal(1));

                    yield kit.removeCollection('datums');

                    let newResults = yield noniCollection.find(
                        kit.db.collection('datums'),
                        {}
                    );

                    return attempt(() => assert(newResults.length).equal(0));
                })
            ));
    });

    describe('find', () => {
        it('should find documents', () =>
            toPromise(
                doFuture(function* () {
                    yield kit.populate('datums', [
                        { name: 1 },
                        { name: 2 },
                        { name: 1 },
                        { name: 1 }
                    ]);

                    let results = yield kit.find('datums', { name: 1 });

                    return attempt(() => assert(results.length).equal(3));
                })
            ));
    });

    describe('count', () => {
        it('should count documents', () =>
            toPromise(
                doFuture(function* () {
                    yield kit.populate('datums', [
                        { name: 1 },
                        { name: 2 },
                        { name: 1 },
                        { name: 1 }
                    ]);

                    let n = yield kit.count('datums', { name: 1 });

                    return attempt(() => assert(n).equal(3));
                })
            ));
    });

    describe('findOne', () => {
        it('should find a document', () =>
            toPromise(
                doFuture(function* () {
                    yield kit.populate('datums', [
                        { name: 1 },
                        { name: 2 },
                        { name: 1 }
                    ]);

                    let mresult = yield kit.findOne('datums', { name: 2 });

                    return attempt(() => assert(mresult.isJust()).true());
                })
            ));
    });

    describe('update', () => {
        it('should update documents', () =>
            toPromise(
                doFuture(function* () {
                    yield kit.populate('datums', [
                        { name: 1 },
                        { name: 2 },
                        { name: 1 }
                    ]);

                    let r = yield kit.update(
                        'datums',
                        { name: 1 },
                        { $set: { name: 2 } }
                    );

                    yield attempt(() => assert(r.modifiedCount).equal(2));

                    let results = yield kit.find('datums', {});

                    return attempt(() => assert(results.length).equal(3));
                })
            ));
    });

    afterEach(() => toPromise(kit.tearDown()));

    after(() => toPromise(kit.setDown()));
});
