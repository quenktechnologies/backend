import * as lib from '../../../../lib/app/db/mongodb/model';

import { assert } from '@quenk/test/lib/assert';

import {
    attempt,
    doFuture
} from '@quenk/noni/lib/control/monad/future';
import { Type } from '@quenk/noni/lib/data/type';

import { Testkit } from '../../../../lib/app/db/mongodb/testkit';

let dbkit = new Testkit({ dropDatabase: true, removeAllCollections: true });

class Instance extends lib.BaseModel<Type> {

    id = 'id';

}

describe('BaseModel', () => {

    before(() => dbkit.setUp());

    describe('create()', () => {

        it('should create a document', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let id = yield model.create({ id: 1, items: [] });

            let mdoc = yield dbkit.findOne('orders', { id });

            return attempt(() => {

                assert(id).equal(1);
                assert(mdoc.isJust()).true();

            });

        }));

    });

    describe('createMany()', () => {

        it('should create documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, items: [] },
                { id: 2, items: [] },
                { id: 3, items: [] }
            ];

            yield model.createMany(orders);

            let docs = yield dbkit.find('orders', {});

            return attempt(() => assert(docs.length).equal(3));

        }));

    });

    describe('search()', () => {

        it('should find documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let qry = { customer: 'Sally' };
            let opts = { projection: { id: 1 } };
            let docs = yield model.search(qry, opts);

            return attempt(() => {

                assert(docs.length).equal(2);
                assert(docs[0]).equate({ id: 1 });
                assert(docs[1]).equate({ id: 3 });

            });

        }));

    });

    describe('update()', function() {

        it('should update a document', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let yes = yield model.update(2, { customer: 'Sally' });

            let mdoc = yield dbkit.findOne('orders', { id: 2 },
                { projection: { _id: 0 } });

            return attempt(() => {

                assert(yes).true();
                assert(mdoc.get()).equate({
                    id: 2,
                    customer: 'Sally',
                    items: []
                });

            });

        }));

    });

    describe('updateMany()', function() {

        it('should update documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let n = yield model.updateMany({ customer: 'Sally' },
                { customer: 'Hatty' });

            let docs = yield dbkit.find('orders', { customer: 'Hatty' },
                { projection: { _id: 0 } });

            return attempt(() => {

                assert(n).equal(2);
                assert(docs.length).equal(2);
                assert(docs).equate([{
                    id: 1,
                    customer: 'Hatty',
                    items: []
                },
                {
                    id: 3,
                    customer: 'Hatty',
                    items: []
                }
                ]);

            });

        }));

    })

    describe('unsafeUpdate()', function() {

        it('should update documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let n = yield model.unsafeUpdate({ customer: 'Sally' },
                { $set: { customer: 'Hatty' } });

            let docs = yield dbkit.find('orders', { customer: 'Hatty' },
                { projection: { _id: 0 } });

            return attempt(() => {

                assert(n).equal(2);
                assert(docs.length).equal(2);
                assert(docs).equate([{
                    id: 1,
                    customer: 'Hatty',
                    items: []
                },
                {
                    id: 3,
                    customer: 'Hatty',
                    items: []
                }
                ]);

            });

        }));

    })

    describe('get()', () => {

        it('should find a document', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let opts = { projection: { id: 1, _id: 0 } };
            let mdoc = yield model.get(1, undefined, opts);

            return attempt(() => {

                assert(mdoc.get()).equate({
                    id: 1
                });

            });

        }));

    });

    describe('remove()', function() {

        it('should remove a document', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let yes = yield model.remove(2);
            let docs = yield dbkit.find('orders', {});

            return attempt(() => {

                assert(yes).true();
                assert(docs.length).equal(2);

            });

        }));

    });

    describe('removeMany()', function() {

        it('should remove documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let n = yield model.removeMany({ id: { $in: [3, 1] } });
            let docs = yield dbkit.find('orders', {});

            return attempt(() => {

                assert(n).equal(2);
                assert(docs.length).equal(1);

            });

        }));

    });

    describe('count()', function() {

        it('should count documents', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let n = yield model.count({ customer: 'Sally' });

            return attempt(() => assert(n).equal(2));

        }))
    });

    describe('aggregate()', function() {

        it('should run a pipeline', () => doFuture(function*() {

            let model = new Instance(dbkit.db, dbkit.db.collection('orders'));

            let orders = [
                { id: 1, customer: 'Sally', items: [] },
                { id: 2, customer: 'Yui', items: [] },
                { id: 3, customer: 'Sally', items: [] }
            ];

            yield dbkit.populate('orders', orders);

            let docs = yield model.aggregate([{ $match: { customer: 'Yui' } }]);

            delete docs[0]._id;

            return attempt(() => {

                assert(docs.length).equal(1);
                assert(docs).equate([
                    { id: 2, customer: 'Yui', items: [] },
                ]);

            });

        }));

    });

    afterEach(() => dbkit.tearDown());

    after(() => dbkit.setDown());

});
