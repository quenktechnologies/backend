import { assert } from '@quenk/test/lib/assert';

import { ClientRequest } from '@quenk/tendril/lib/app/api/request';

import {
    expand,
    shapeGet,
    shapePost,
    shapePatch,
    Shape
} from '../../../lib/app/filters/shape';

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

        it('it should shape the request query', () => {
            doBodyTest('GET', {
                request: {
                    query: { name: '1', age: '1', status: 'active' },
                    params: { name: '2', age: '2' }
                },
                shape: {
                    name: {
                        path: '$params.name', cast: 'number'
                    },
                    age: '$params.age'
                },
                expected: {
                    name: 2,
                    age: '2',
                    status: 'active'
                }
            })
        })

        it('it should ignore other methods', () => {
            doBodyTest('GET', {
                request: {
                    method: 'POST',
                    query: { name: '1', age: '1', status: 'active' },
                    params: { name: '2', age: '2' }
                },
                shape: {
                    name: {
                        path: '$params.name', cast: 'number'
                    },
                    age: '$params.age'
                },
                expected: { name: '1', age: '1', status: 'active' }
            })
        })

    });

    describe('shapePost', () => {

        it('it should shape the request body', () =>
            doBodyTest('POST', {
                request: {
                    method: 'POST',
                    body: { name: 'Luis', age: 12, gender: 'male' },
                    params: { name: 'Lois', age: 21, gender: 'female' }
                },
                shape: {
                    name: '$params.name',
                    age: '$params.age',
                    gender: '$params.gender'
                },
                expected: {
                    name: 'Lois',
                    age: 21,
                    gender: 'female'
                }
            }));

        it('it should ignore other methods', () =>
            doBodyTest('POST', {
                request: {
                    method: 'PATCH',
                    body: { name: 'Luis', age: 12, gender: 'male' },
                    params: { name: 'Lois', age: 21, gender: 'female' }
                },
                shape: {
                    name: '$params.name',
                    age: '$params.age',
                    gender: '$params.gender'
                },
                expected: {
                    name: 'Luis',
                    age: 12,
                    gender: 'male'
                }
            }));
    });

    describe('shapePatch', () => {

        it('it should shape the request body', () =>
            doBodyTest('PATCH', {
                request: {
                    method: 'PATCH',
                    body: { name: 'Luis', age: 12, gender: 'male' },
                    params: { name: 'Lois', age: 21, gender: 'female' }
                },
                shape: {
                    name: '$params.name',
                    age: '$params.age',
                    gender: '$params.gender'
                },
                expected: {
                    name: 'Lois',
                    age: 21,
                    gender: 'female'
                }
            }));

        it('it should ignore other methods', () =>
            doBodyTest('PATCH', {
                request: {
                    method: 'POST',
                    body: { name: 'Luis', age: 12, gender: 'male' },
                    params: { name: 'Lois', age: 21, gender: 'female' }
                },
                shape: {
                    name: '$params.name',
                    age: '$params.age',
                    gender: '$params.gender'
                },
                expected: {
                    name: 'Luis',
                    age: 12,
                    gender: 'male'
                }
            }));
    })

});

interface BodyTest {

    request: object,

    shape: Shape,

    expected: object

}

const doBodyTest = (method: string, { request, shape, expected }: BodyTest) => {

    let req = ClientRequest.fromPartialExpress(request);

    let action =
        (method === 'GET' ? shapeGet :
            (method === 'POST' ? shapePost : shapePatch))(shape)(req);

    while (action.resume().isRight()) { }

    assert(method === 'GET' ? req.query : req.body).equate(expected);

}
