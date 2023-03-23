import { assert } from '@quenk/test/lib/assert';

import { pure, voidPure } from '@quenk/noni/lib/control/monad/future';

import { Pool } from '@quenk/tendril/lib/app/connection';

import { Testkit } from '../../../../lib/app/db/mongodb/testkit';
import { exists, inc, unique } from '../../../../lib/app/db/mongodb/checks';

let dbkit = new Testkit({ dropDatabase: true, removeAllCollections: true });

describe('checks', () => {
    before(async () => {
        await dbkit.setUp();

        Pool.getInstance().conns['mongo'] = {
            open() {
                return voidPure;
            },

            checkout() {
                return pure(dbkit.db);
            },

            close() {
                return voidPure;
            }
        };
    });

    describe('exists', () => {
        it('should pass if the value exists', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await exists('users', 'id', 'mongo')(2);

            assert(result.isRight()).true();

            assert(result.takeRight()).equate(2);
        });

        it('should fail if the value does not exist', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await exists('users', 'id', 'mongo')(4);

            assert(result.isLeft()).true();
        });
    });

    describe('unique', () => {
        it('should pass if the value does not exist', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await unique('users', 'id', 'mongo')(4);

            assert(result.isRight()).true();

            assert(result.takeRight()).equate(4);
        });

        it('should fail if the value exists', async () => {
            await dbkit.populate('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);

            let result = await unique('users', 'id', 'mongo')(1);

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
                collection: 'settings',
                filter: { id: 'conf' },
                field: 'users',
                target: 'counter',
                dbid: 'mongo'
            })({ active: true });

            assert(result.isRight()).true();

            let settings = await dbkit.findOne('settings', { id: 'conf' });

            assert((<{ users: number }>settings.get()).users).equal(2);
        });

        it('should upsert', async () => {
            await dbkit.populate('settings', [{ id: 'conf', users: 5 }]);

            let result = await inc({
                collection: 'settings',
                filter: { id: 'conf' },
                field: 'users',
                target: 'counter',
                dbid: 'mongo'
            })({ active: true });

            assert(result.isRight()).true();

            let settings = await dbkit.findOne('settings', { id: 'conf' });

            assert((<{ users: number }>settings.get()).users).equal(6);
        });
    });

    afterEach(() => dbkit.tearDown());

    after(() => dbkit.setDown());
});
