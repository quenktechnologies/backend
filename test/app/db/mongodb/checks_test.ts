import { assert } from '@quenk/test/lib/assert';

import { pure } from '@quenk/noni/lib/control/monad/future';

import { Testkit } from '../../../../lib/app/db/mongodb/testkit';
import { exists, inc, unique } from '../../../../lib/app/db/mongodb/checks';

let dbkit = new Testkit({ dropDatabase: true, removeAllCollections: true });

const getCol = (name: string) => () => pure(dbkit.db.collection(name));

describe('checks', () => {
    before(async () => {
        await dbkit.setUp();
    });

    describe('exists', () => {
        it('should pass if the value exists', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await exists(getCol('users'), 'id')(2);

            assert(result.isRight()).true();

            assert(result.takeRight()).equate(2);
        });

        it('should fail if the value does not exist', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await exists(getCol('users'), 'id')(4);

            assert(result.isLeft()).true();
        });
    });

    describe('unique', () => {
        it('should pass if the value does not exist', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await unique(getCol('users'), 'id')(4);

            assert(result.isRight()).true();

            assert(result.takeRight()).equate(4);
        });

        it('should fail if the value exists', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await unique(getCol('users'), 'id')(1);

            assert(result.isLeft()).true();
        });
    });

    describe('inc', () => {
        it('should increment the value', async () => {
            await dbkit.populate('settings', [
                { id: 'settings', users: 0 },
                { id: 'conf', users: 1 }
            ]);

            let result = await inc({
                collection: getCol('settings'),
                filter: { id: 'conf' },
                field: 'users',
                target: 'counter'
            })({ active: true });

            assert(result.isRight()).true();

            let settings = await dbkit.findOne('settings', { id: 'conf' });

            assert((<{ users: number }>settings.get()).users).equal(2);
        });

        it('should upsert', async () => {
            await dbkit.populate('settings', [{ id: 'conf', users: 5 }]);

            let result = await inc({
                collection: getCol('settings'),
                filter: { id: 'conf' },
                field: 'users',
                target: 'counter'
            })({ active: true });

            assert(result.isRight()).true();

            let settings = await dbkit.findOne('settings', { id: 'conf' });

            assert((<{ users: number }>settings.get()).users).equal(6);
        });
    });

    afterEach(() => dbkit.tearDown());

    after(() => dbkit.setDown());
});
