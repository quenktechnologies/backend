import * as lib from '../../../../lib/app/db/mongodb/model';

import { assert } from '@quenk/test/lib/assert';

import { merge } from '@quenk/noni/lib/data/record';
import { Type } from '@quenk/noni/lib/data/type';

import { Testkit } from '../../../../lib/app/db/mongodb/testkit';

let dbkit = new Testkit({ dropDatabase: true, removeAllCollections: true });

class Instance extends lib.BaseModel<Type> {
    id = 'id';

    static get orders() {

        return [
            { id: 1, customer: 'Sally', items: [], group: 1 },
            { id: 2, customer: 'Yui', items: [], group: 1 },
            { id: 3, customer: 'May', items: [], group: 2 },
            { id: 4, customer: 'Tim', items: [], group: 2 },
            { id: 5, customer: 'Joe', items: [], group: 3 },
            { id: 6, customer: 'Obafemi', items: [], group: 3 }
        ];

    }

    static get() {

        return new Instance(
            dbkit.db,
            dbkit.db.collection('orders')
        );

    }

    static populate() {
        return dbkit.populate('orders', Instance.orders);
    }
}

describe('BaseModel', () => {
    before(() => dbkit.setUp());

    describe('create()', () => {
        it('should create a document', async () => {
            let model = Instance.get();
            let doc = { id: 1, customer: 'Sana', items: [{}] };
            let id = await model.create(doc);
            let found = await dbkit.findOne('orders', doc);

            assert(id).equal(1);
            assert(found.isJust()).true();
        });
    });

    describe('search()', () => {
        it('should find documents', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: { group: 2 },
            });
            assert(docs).equate([Instance.orders[2], Instance.orders[3]]);
        });

        it('should limit results', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: {},
                limit: 1
            });
            assert(docs.length).equal(1);
        });

        it('should sort results', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: {},
                sort: { id: -1 }
            });
            assert(docs).equate(Instance.orders.reverse());
        });

        it('should skip results', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: {},
                offset: Instance.orders.length - 1
            });
            assert(docs).equate([Instance.orders[Instance.orders.length - 1]]);
        });

        it('should project results', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: {},
                fields: { id: true }
            });
            assert(docs).equate(Instance.orders.map(order => ({ id: order.id })));
        });

        it('should do it all together', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.search({
                filters: { group: 3 },
                limit: 1,
                offset: 1,
                sort: { id: 1 },
                fields: { id: true }
            });
            assert(docs).equate([{ id: 6 }]);
        });
    });

    describe('update()', function() {
        it('should update a document', async () => {
            let model = Instance.get();
            await Instance.populate();

            let yes = await model.update(2, { customer: 'George' });
            assert(yes, 'update complete').true();

            let mdoc = await dbkit.findOne(
                'orders',
                { id: 2 },
                { projection: { _id: 0 } }
            );

            assert(mdoc.get()).equate(merge(Instance.orders[1], { customer: 'George' }))
        });

        it('should return false if it cannot update', async () => {
            let model = Instance.get();
            await Instance.populate();

            let yes = await model.update(24, { customer: 'George' });
            assert(yes, 'update failed').false();

            let docs = await dbkit.find('orders', {}, { projection: { _id: 0 } });
            assert(docs).equate(Instance.orders);
        });

        it('should return false if it cannot update', async () => {
            let model = Instance.get();
            await Instance.populate();

            let yes = await model.update(24, { customer: 'George' });
            assert(yes, 'update failed').false();

            let docs = await dbkit.find('orders', {}, { projection: { _id: 0 } });
            assert(docs).equate(Instance.orders);
        });

        it('should apply additonal filters', async () => {
            let model = Instance.get();
            await Instance.populate();

            await dbkit.update('orders', {}, { $set: { id: 1 } });

            let yes = await model.update(1, { customer: 'Oba' }, { filters: { customer: 'Obafemi' } });
            assert(yes, 'update complete').true();

            let doc = await dbkit.findOne('orders', { customer: 'Oba' }, { projection: { _id: 0 } });
            assert(doc.get()).equate(merge(Instance.orders[5], { id: 1, customer: 'Oba' }));
        });
    });

    describe('get()', () => {
        it('should find a document', async () => {
            let model = Instance.get();
            await Instance.populate();
            let mdoc = await model.get(3);
            assert(mdoc.get()).equate(Instance.orders[2]);
        });

        it('should project fields', async () => {
            let model = Instance.get();
            await Instance.populate();
            let mdoc = await model.get(3, { fields: { id: 1 } });
            assert(mdoc.get()).equate({ id: 3 });
        });

        it('should apply additional filters', async () => {
            let model = Instance.get();
            await Instance.populate();
            await dbkit.update('orders', {}, { $set: { id: 3 } });

            let mdoc = await model.get(3, { filters: { customer: 'Obafemi' } });
            assert(mdoc.get()).equate(merge(Instance.orders[5], { id: 3 }));
        });

        it('should project and apply additional filters', async () => {
            let model = Instance.get();
            await Instance.populate();
            await dbkit.update('orders', {}, { $set: { id: 3 } });

            let mdoc = await model.get(3, { filters: { customer: 'Obafemi' }, fields: { id: 1, customer: 1 } });
            assert(mdoc.get()).equate({ id: 3, customer: 'Obafemi' });
        });

    });

    describe('remove()', function() {
        it('should remove a document', async () => {
            let model = Instance.get();
            await Instance.populate();
            let yes = await model.remove(3);
            assert(yes, 'delete successful').true();

            let hit = await dbkit.findOne('orders', { id: 3 });
            assert(hit.isNothing(), 'document deleted').true();
        });

        it('should apply additional filters', async () => {
            let model = Instance.get();
            await Instance.populate();
            await dbkit.update('orders', {}, { $set: { id: 3 } });

            let yes = await model.remove(3, { filters: { customer: 'Obafemi' } });
            assert(yes, 'delete successful').true();

            let hit = await dbkit.findOne('orders', { customer: 'Obafemi' });
            assert(hit.isNothing(), 'document deleted').true();
            assert(await dbkit.count('orders', {}), 'other docs remain').
                equal(Instance.orders.length - 1);
        });
    });

    describe('count()', function() {
        it('should count documents', async () => {
            let model = Instance.get();
            await Instance.populate();

            let n = await model.count({});
            assert(n).equate(Instance.orders.length);
        });

        it('should apply filters', async () => {
            let model = Instance.get();
            await Instance.populate();

            let n = await model.count({ filters: { group: 3 } });
            assert(n).equate(Instance.orders.filter(order => order.group === 3).length);
        });

        it('should limit', async () => {
            let model = Instance.get();
            await Instance.populate();

            let n = await model.count({
                filters: {},
                limit: 3
            });
            assert(n).equal(3);
        });

        it('should skip', async () => {
            let model = Instance.get();
            await Instance.populate();

            let n = await model.count({
                filters: {},
                offset: 4
            });
            assert(n).equal(2);
        });
    });

    describe('aggregate()', function() {
        it('should run a pipeline', async () => {
            let model = Instance.get();
            await Instance.populate();

            let docs = await model.aggregate([
                { $match: { customer: 'Yui' } }
            ]);

            delete docs[0]._id;
            assert(docs.length).equal(1);
            assert(docs).equate([Instance.orders[1]]);
        });
    });

    afterEach(() => dbkit.tearDown());
    after(() => dbkit.setDown());
});
