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
};

describe('shape', () => {
    describe('expand', () => {
        it('should expand properties', () => {
            let input = {
                id: 'id',
                name: 'name.first',
                status: '$lists.tags[1]',
                'tokens.oauth.google': 'randomString'
            };

            assert(expand(ctx, input, {})).equate({
                id: 1,
                name: 'Lasana',
                status: 'enabled',
                tokens: { oauth: { google: 'xyz' } }
            });
        });

        it('should omit null, undefined or missing values', () => {
            assert(
                expand(
                    ctx,
                    {
                        id: 'nullish',
                        name: 'undefined',
                        status: '?',
                        token: 'randomString'
                    },
                    {}
                )
            ).equate({ token: 'xyz' });
        });

        it('should cast to supported types', () => {
            assert(
                expand(
                    ctx,
                    {
                        id: { path: 'id', cast: 'string' },
                        active: { path: 'trueString', cast: 'boolean' },
                        status: { path: '$lists.tags[1]' },
                        'created_by.id': { path: 'id', cast: 'number' }
                    },
                    {}
                )
            ).equate({
                id: '1',
                active: true,
                status: 'enabled',
                created_by: { id: 1 }
            });
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
                        path: '$params.name',
                        cast: 'number'
                    },
                    age: '$params.age'
                },
                expected: {
                    name: 2,
                    age: '2',
                    status: 'active'
                }
            });
        });

        it('it should ignore other methods', () => {
            doBodyTest('GET', {
                request: {
                    method: 'POST',
                    query: { name: '1', age: '1', status: 'active' },
                    params: { name: '2', age: '2' }
                },
                shape: {
                    name: {
                        path: '$params.name',
                        cast: 'number'
                    },
                    age: '$params.age'
                },
                expected: { name: '1', age: '1', status: 'active' }
            });
        });

        it('should retrieve the specified properties', () => {
            process.env.port = '80';

            doContextTest('GET', {
                request: {
                    url: 'test.tld',
                    params: { id: '1' },
                    query: { q: { x: '1', y: '2' }, sort: '-name' },
                    prsData: {
                        parsed: true,
                        limit: '10',
                        $in: [1, 2, 3, 4, 5]
                    },
                    sessionData: { user: 1, name: 'test', tags: ['active'] }
                },

                shape: {
                    url: '$request.url',
                    params: { path: '$params.id', cast: 'number' },
                    queryx: '$query.q.x',
                    querySort: '$query.sort',
                    prs: '$prs.parsed',
                    prsn: '$prs.$in[2]',
                    session: '$session.name',
                    port: '$env.port'
                },

                expected: {
                    url: 'test.tld',
                    params: 1,
                    q: { x: '1', y: '2' },
                    sort: '-name',
                    queryx: '1',
                    querySort: '-name',
                    prs: true,
                    prsn: 3,
                    session: 'test',
                    port: '80'
                }
            });
        });
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

        it('should retrieve the specified values', () => {
            process.env.port = '80';

            doContextTest('POST', {
                request: {
                    url: 'test.tld',
                    method: 'POST',
                    params: { id: '1' },
                    body: { q: { x: '1', y: '2' }, sort: '-name' },
                    prsData: {
                        parsed: true,
                        limit: '10',
                        $in: [1, 2, 3, 4, 5]
                    },
                    sessionData: { user: 1, name: 'test', tags: ['active'] }
                },

                shape: {
                    url: '$request.url',
                    params: { path: '$params.id', cast: 'number' },
                    queryx: '$body.q.x',
                    querySort: '$body.sort',
                    prs: '$prs.parsed',
                    prsn: '$prs.$in[2]',
                    session: '$session.name',
                    port: '$env.port'
                },

                expected: {
                    url: 'test.tld',
                    params: 1,
                    q: { x: '1', y: '2' },
                    sort: '-name',
                    queryx: '1',
                    querySort: '-name',
                    prs: true,
                    prsn: 3,
                    session: 'test',
                    port: '80'
                }
            });
        });
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

        it('should retrieve the specified values', () => {
            process.env.port = '80';

            doContextTest('PATCH', {
                request: {
                    url: 'test.tld',
                    method: 'PATCH',
                    params: { id: '1' },
                    body: { q: { x: '1', y: '2' }, sort: '-name' },
                    prsData: {
                        parsed: true,
                        limit: '10',
                        $in: [1, 2, 3, 4, 5]
                    },
                    sessionData: { user: 1, name: 'test', tags: ['active'] }
                },

                shape: {
                    url: '$request.url',
                    params: { path: '$params.id', cast: 'number' },
                    queryx: '$body.q.x',
                    querySort: '$body.sort',
                    prs: '$prs.parsed',
                    prsn: '$prs.$in[2]',
                    session: '$session.name',
                    port: '$env.port'
                },

                expected: {
                    url: 'test.tld',
                    params: 1,
                    q: { x: '1', y: '2' },
                    sort: '-name',
                    queryx: '1',
                    querySort: '-name',
                    prs: true,
                    prsn: 3,
                    session: 'test',
                    port: '80'
                }
            });
        });
    });
});

interface BodyTest {
    request: object;

    shape: Shape;

    expected: object;
}

const doBodyTest = (method: string, { request, shape, expected }: BodyTest) => {
    let req = ClientRequest.fromPartial(request);

    let action = (
        method === 'GET' ? shapeGet : method === 'POST' ? shapePost : shapePatch
    )(shape)(req);

    while (action.resume().isRight()) {}

    assert(method === 'GET' ? req.query : req.body).equate(expected);
};

const doContextTest = (
    method: string,
    { request, shape, expected }: BodyTest
) => {
    let req = ClientRequest.fromPartial(request);

    let action = (
        method === 'GET' ? shapeGet : method === 'POST' ? shapePost : shapePatch
    )(shape)(req);

    while (action.resume().isRight()) {}

    assert(method === 'GET' ? req.query : req.body).equate(expected);
};
