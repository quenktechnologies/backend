import { assert } from '@quenk/test/lib/assert';

import { ClientRequest } from '@quenk/tendril/lib/app/api/request';

import { expand, shapeGet } from '../../../lib/app/filters/shape';

const ctx = {
    id: 1,
    name: { first: 'Lasana', last: 'Murray' },
    $lists: { tags: ['active', 'enabled'] },
    trueString: 'true',
    randomString: 'xyz',
    undef: undefined,
    nullish: null
}

describe('shape', () => {

    describe('expand', () => {

        it('should expand properties', () => {

            let input = {
                id: 'id',
                name: 'name.first',
                status: '$lists.tags[1]',
                'tokens.oauth.google': 'randomString'
            };

            assert(expand(ctx, input, {}))
                .equate({
                    id: 1,
                    name: 'Lasana',
                    status: 'enabled',
                    tokens: { oauth: { google: 'xyz' } }
                })

        });

        it('should omit null, undefined or missing values', () => {

            assert(expand(ctx, {
                id: 'nullish',
                name: 'undefined',
                status: '?',
                token: 'randomString'
            }, {})).equate({ token: 'xyz' })

        });

        it('should cast to supported types', () => {

            assert(expand(ctx, {
                id: { path: 'id', cast: 'string' },
                active: { path: 'trueString', cast: 'boolean' },
                status: { path: '$lists.tags[1]' },
                'created_by.id': { path: 'id', cast: 'number' }
            }, {})).equate({
                id: '1',
                active: true,
                status: 'enabled',
                created_by: { id: 1 }
            })

        });
    });

    describe('shapeGet', () => {

        it('it should shape the request query', async () => {

            let query = { name: '1', age: '1', status: 'active' };

            let params = { name: '2', age: '2' };

            let req = ClientRequest.fromPartialExpress({ params, query });

            let shape = {
                name: {
                    path: '$params.name', cast: 'number'
                },
                age: '$params.age'
            };

            let action = (shapeGet(shape)(req));

            while (true) {
                let result = action.resume();
                if (result.isLeft()) break;
            }

            assert(req.query).equate({
                name: 2,
                age: '2',
                status: 'active'
            });

        });

    });
});
