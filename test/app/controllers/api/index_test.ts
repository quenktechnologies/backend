import * as tests from './tests';

import { Type } from '@quenk/noni/lib/data/type';

import { Pool } from '@quenk/tendril/lib/app/connection';

import {
    ERR_PARSERS_BODY,
    ERR_PARSERS_QUERY,
    ERR_PAYLOAD_INVALID
} from '../../../../lib/app/controllers/api';
import { PageData } from '../../../../lib/app/controllers/api/search';
import { TestConnection } from './fixtures';

process.env.TENDRIL_SEND_500_ERRORS = 'yes';

const pool = Pool.getInstance();

describe('api', () => {
    describe('ApiController', () => {
        before(() => {
            pool.add('main', new TestConnection('main'));

            pool.add('other', new TestConnection('other'));
        });

        describe('create', () => {
            let body = { name: 'patrick' };

            it('should refuse if body not attested', () =>
                tests.doTest({
                    method: 'create',
                    context: { body },
                    expect: {
                        model: { create: false },
                        response: {
                            status: [500],
                            send: [{ error: ERR_PARSERS_BODY }]
                        }
                    }
                }));

            it('should refuse if body is not an object', () =>
                tests.doTest({
                    method: 'create',
                    attest: { body: true },
                    context: { body: '<html>' },
                    expect: {
                        model: { create: false },
                        response: {
                            status: [409],
                            send: [{ error: ERR_PAYLOAD_INVALID }]
                        }
                    }
                }));

            it('should create', () =>
                tests.doTest({
                    method: 'create',
                    attest: { body: true },
                    context: { body },
                    expect: {
                        model: { create: [body] },
                        response: {
                            status: [201],
                            send: [{ data: { id: 1 } }]
                        }
                    }
                }));

            it('should honour the connection override', () =>
                tests.doTest({
                    method: 'create',
                    attest: { body: true },
                    connectionOverride: 'other',
                    context: { body },
                    expect: {
                        model: { create: [body] },
                        response: {
                            status: [201],
                            send: [{ data: { id: 1 } }]
                        }
                    }
                }));

            it('should honour QTL_API_CONTROLLER_SKIP_PARSER_CHECKS', () =>
                tests.doTest({
                    method: 'create',
                    skipParsers: true,
                    context: { body },
                    expect: {
                        model: { create: [body] },
                        response: {
                            status: [201],
                            send: [{ data: { id: 1 } }]
                        }
                    }
                }));
        });

        describe('search', () => {
            let searchQuery = {
                filters: { name: 'chippy' },
                perPage: 10,
                page: 3,
                sort: 'name',
                fields: { name: 1 }
            };

            let searchResult = {
                status: [200],
                send: [
                    {
                        data: [],
                        pages: new PageData(1, 1, 1, 1, 1)
                    }
                ]
            };

            it('should refuse if query not attested', () =>
                tests.doTest({
                    method: 'search',
                    expect: {
                        model: { search: false },
                        response: {
                            status: [500],
                            send: [{ error: ERR_PARSERS_QUERY }]
                        }
                    }
                }));

            it('should refuse if query is not an object', () =>
                tests.doTest({
                    method: 'search',
                    attest: { query: true },
                    context: { query: <Type>'<html>' },
                    expect: {
                        model: { search: false },
                        response: {
                            status: [400],
                            send: [{ error: ERR_PAYLOAD_INVALID }]
                        }
                    }
                }));

            it('should return results', () =>
                tests.doTest({
                    method: 'search',
                    attest: { query: true },
                    context: {
                        query: <Type>searchQuery
                    },
                    expect: {
                        strategy: searchQuery,
                        response: searchResult
                    }
                }));

            it('should honour QTL_API_CONTROLLER_SKIP_PARSER_CHECKS', () =>
                tests.doTest({
                    method: 'search',
                    skipParsers: true,
                    context: {
                        query: <Type>searchQuery
                    },
                    expect: {
                        strategy: searchQuery,
                        response: searchResult
                    }
                }));

            it('should honour the connection override', () =>
                tests.doTest({
                    method: 'search',
                    attest: { query: true },
                    connectionOverride: 'other',
                    context: {
                        query: <Type>searchQuery
                    },
                    expect: {
                        strategy: searchQuery,
                        response: searchResult
                    }
                }));
        });

        describe('update', () => {
            let body = { name: 'chippy' };

            let params = { id: <Type>1 };

            let query = { location: 'tto' };

            it('should refuse if body not attested', () =>
                tests.doTest({
                    method: 'update',
                    context: { body, params },
                    expect: {
                        model: { update: false },
                        response: {
                            status: [500],
                            send: [{ error: ERR_PARSERS_BODY }]
                        }
                    }
                }));

            it('should refuse if body is not an object', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true },
                    context: { body: '<html>', params },
                    expect: {
                        model: { update: false },
                        response: {
                            status: [409],
                            send: [{ error: ERR_PAYLOAD_INVALID }]
                        }
                    }
                }));

            it('should 404 if no params id', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true },
                    context: { body },
                    expect: {
                        model: { update: false },
                        response: { status: [404] }
                    }
                }));

            it('should update', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true },
                    context: { body, params },
                    expect: {
                        model: { update: [params.id, body, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should honour QTL_API_CONTROLLER_SKIP_PARSER_CHECKS', () =>
                tests.doTest({
                    method: 'update',
                    skipParsers: true,
                    context: { body, params },
                    expect: {
                        model: { update: [params.id, body, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should not use query if not attested', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true },
                    context: { body, query, params },
                    expect: {
                        model: { update: [params.id, body, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should use query if attested', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true, query: true },
                    context: { body, query, params },
                    expect: {
                        model: { update: [params.id, body, query] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should honour the connection override', () =>
                tests.doTest({
                    method: 'update',
                    attest: { body: true },
                    connectionOverride: 'other',
                    context: { body, params },
                    expect: {
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));
        });

        describe('get', () => {
            let params = { id: <Type>1 };

            let query = { location: 'tto' };

            let data = { name: 'adom' };

            it('should 404 if no id', () =>
                tests.doTest({
                    method: 'get',
                    expect: {
                        model: { get: false },
                        response: { status: [404] }
                    }
                }));

            it('should get', () =>
                tests.doTest({
                    method: 'get',
                    context: { params },
                    expect: {
                        model: { get: [params.id, {}] },
                        response: {
                            status: [200],
                            send: [data]
                        }
                    }
                }));

            it('should not use query if not attested', () =>
                tests.doTest({
                    method: 'get',
                    context: { query, params },
                    expect: {
                        model: { get: [params.id, {}] },
                        response: {
                            status: [200],
                            send: [data]
                        }
                    }
                }));

            it('should use query if attested', () =>
                tests.doTest({
                    method: 'get',
                    attest: { query: true },
                    context: { query, params },
                    expect: {
                        model: { get: [params.id, query] },
                        response: {
                            status: [200],
                            send: [data]
                        }
                    }
                }));

            it('should honour the connection override', () =>
                tests.doTest({
                    method: 'get',
                    connectionOverride: 'other',
                    context: { params },
                    expect: {
                        model: { get: [params.id, {}] },
                        response: {
                            status: [200],
                            send: [data]
                        }
                    }
                }));
        });

        describe('remove', () => {
            let params = { id: <Type>1 };

            let query = { location: 'tto' };

            it('should 404 if no id', () =>
                tests.doTest({
                    method: 'remove',
                    expect: {
                        model: { remove: false },
                        response: { status: [404] }
                    }
                }));

            it('should remove', () =>
                tests.doTest({
                    method: 'remove',
                    context: { params },
                    expect: {
                        model: { remove: [params.id, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should not use query if not attested', () =>
                tests.doTest({
                    method: 'remove',
                    context: { query, params },
                    expect: {
                        model: { remove: [params.id, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should use query if attested', () =>
                tests.doTest({
                    method: 'remove',
                    attest: { query: true },
                    context: { query, params },
                    expect: {
                        model: { remove: [params.id, query] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));

            it('should honour the connection override', () =>
                tests.doTest({
                    method: 'remove',
                    connectionOverride: 'other',
                    context: { params },
                    expect: {
                        model: { remove: [params.id, {}] },
                        response: {
                            status: [200],
                            end: []
                        }
                    }
                }));
        });
    });
});
