import { assert } from '@quenk/test/lib/assert';

import { Object } from '@quenk/noni/lib/data/jsonx';
import { Record } from '@quenk/noni/lib/data/record';

import { KEY_PARSERS_QUERY } from '../../../../../lib/app/controllers/api';
import {
    compileGetTag,
    compileQueryTag,
    CompileQueryTagConf,
    compileSearchTag,
    CompileSearchTagConf,
    DEFAULT_PAGE_SIZE,
    unsupportedMethods
} from '../../../../../lib/app/db/mongodb/filters/query';

import { TestContext } from '../../../controllers/api/fixtures';
import { merge } from '@quenk/noni/lib/data/record';
import { Action } from '@quenk/tendril/lib/app/api';
import { PoliciesAvailable } from '../../../../../lib/app/db/search';
import { FieldSet } from '../../../../../lib/app/model';
import { Type } from '@quenk/noni/lib/data/type';
import { unflatten } from '@quenk/noni/lib/data/record/path';

process.env.TENDRIL_SEND_500_ERRORS = 'yes';
process.env.TENDRIL_DISABLE_500_ERROR_LOG = 'yes';

interface TestConf {
    method: string;

    tags: Object;

    verb?: string;

    query: object;

    prs: object;

    args: Partial<CompileSearchTagConf> | PoliciesAvailable | Record<FieldSet>;

    expect: {
        query?: object;

        prs: Record<boolean | undefined>;

        response?: Record<false | Type[]>;

        context?: Record<false | Type[]>;
    };
}

const defaultConf = { tags: {}, query: {}, prs: {}, args: {}, expect: {} };

const doTest = async (conf: Partial<TestConf>) => {
    let { method, tags, verb, query, prs, args, expect } = merge(
        defaultConf,
        conf
    );

    let ctx = new TestContext({
        query,
        method: verb ? verb : '',
        prsData: unflatten(<Object>prs),
        routeConf: {
            method: 'get',
            path: '/',
            filters: [],
            tags
        }
    });

    let action: Action<void>;

    switch (method) {
        case 'search':
            action = compileSearchTag(args)(ctx.request);
            break;

        case 'get':
            action = compileGetTag(<Record<FieldSet>>args)(ctx.request);
            break;

        default:
            action = compileQueryTag(args)(ctx.request);
            break;
    }

    await ctx.run(action);

    if (expect) {
        if (expect.query) assert(ctx.request.query).equate(expect.query);

        for (let [key, value] of Object.entries(expect.prs || {}))
            if (value === undefined)
                assert(
                    ctx.request.prs.exists(key),
                    `prs."${key}" not set`
                ).false();
            else
                assert(
                    ctx.request.prs.get(key).get(),
                    `prs."${key}" is ${value}`
                ).true();

        for (let [name, args] of Object.entries(expect.response || {}))
            if (args === false)
                assert(
                    ctx.response.MOCK.wasCalled(name),
                    `response.${name} not called`
                ).false();
            else
                assert(
                    ctx.response.MOCK.wasCalledWithDeep(name, args),
                    `response.${name} was called with ...`
                ).true();

        for (let [name, args] of Object.entries(expect.context || {}))
            if (args === false)
                assert(
                    ctx.MOCK.wasCalled('name'),
                    `context.${name} not called`
                ).false();
            else
                assert(
                    ctx.MOCK.wasCalledWithDeep(name, args),
                    `context.${name} was called with ...`
                ).true();
    }
};

describe('query', () => {
    describe('compileQueryTag', () => {
        let args: CompileQueryTagConf = {
            compilerOptions: {},
            policiesAvailable: {
                customer: { name: 'string' },
                user: { age: 'number' }
            }
        };

        it('should compile the query tag', async () => {
            await doTest({
                tags: { query: 'name:attiba', model: 'customer' },
                args,
                expect: {
                    query: {
                        filters: { name: { $eq: 'attiba' } }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            });
        });

        it('should use the search tag if model not specified', () =>
            doTest({
                tags: { query: 'name:attiba', search: 'customer' },
                args,
                expect: {
                    query: {
                        filters: { name: { $eq: 'attiba' } }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should use the get tag if model not specified', () =>
            doTest({
                tags: { query: 'name:attiba', get: 'customer' },
                args,
                expect: {
                    query: {
                        filters: { name: { $eq: 'attiba' } }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should $and existing fitlers if KEY_PARSERS_QUERY is set', () =>
            doTest({
                tags: { query: 'age:>40', model: 'user' },
                query: { filters: { name: 'test' }, page: 2 },
                args,
                prs: { [KEY_PARSERS_QUERY]: true },
                expect: {
                    query: {
                        filters: {
                            $and: [{ name: 'test' }, { age: { $gt: 40 } }]
                        },
                        page: 2
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run if query is not a string', () =>
            doTest({
                tags: { query: true, model: 'customer' },
                args,
                expect: {
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run for unsupported request methods', async () => {
            for (let verb of unsupportedMethods)
                await doTest({
                    tags: { query: 'name:attiba', model: 'customer' },
                    args,
                    verb,
                    expect: {
                        query: {},
                        prs: {
                            [KEY_PARSERS_QUERY]: undefined
                        },
                        response: {
                            status: false
                        },
                        context: { next: [] }
                    }
                });
        });

        it('should abort if model is omitted', () =>
            doTest({
                tags: { query: 'name:me' },
                args,
                expect: {
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { next: false, abort: [] }
                }
            }));

        it('should abort if policy not found', () =>
            doTest({
                tags: { model: 'admin', query: 'name:ferisha' },
                args,
                expect: {
                    query: {},
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [], next: false }
                }
            }));

        it('should send 500 when parsing fails', () =>
            doTest({
                tags: { query: 'user', model: 'user' },
                args: {
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: { user: { age: 1 } }
                },
                expect: {
                    query: {},
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    }
                }
            }));
    });

    describe('compileSearchTag', () => {
        let query = {
            qry: 'name:justin',
            page: 1,
            perPage: 15,
            sort: '-balance',
            extraKey: 'unsafe'
        };

        let args: CompileSearchTagConf = {
            filterKey: 'qry',
            maxPageSize: 15,
            compilerOptions: {},
            policiesAvailable: {
                customer: { name: 'string' },
                user: { age: 'number' }
            },
            fieldsAvailable: {
                customer: { name: 1, balance: 1 },
                user: { age: 1 }
            }
        };

        let expectedQry = {
            filters: { name: { $eq: 'justin' } },
            page: 1,
            perPage: 15,
            sort: { balance: -1 },
            fields: { name: 1, balance: 1 }
        };

        it('should compile queries', () =>
            doTest({
                method: 'search',
                query,
                tags: { search: 'customer' },
                args,
                expect: {
                    query: expectedQry,
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should use the model tag if search is true', () =>
            doTest({
                method: 'search',
                query,
                tags: { search: true, model: 'customer' },
                args,
                expect: {
                    query: expectedQry,
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should set defaults', () =>
            doTest({
                method: 'search',
                query: { q: 'age:>18' },
                tags: { search: true, model: 'user' },
                args: <Partial<CompileSearchTagConf>>{
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: { user: { age: 1 } }
                },
                expect: {
                    query: {
                        filters: { age: { $gt: 18 } },
                        page: 1,
                        perPage: DEFAULT_PAGE_SIZE,
                        sort: {},
                        fields: { age: 1 }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not exceed maxPageSize', () =>
            doTest({
                method: 'search',
                query: { q: 'age:>18', perPage: 5000 },
                tags: { search: 'user' },
                args: <Partial<CompileSearchTagConf>>{
                    maxPageSize: 10,
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: { user: { age: 1 } }
                },
                expect: {
                    query: {
                        filters: { age: { $gt: 18 } },
                        page: 1,
                        perPage: 10,
                        sort: {},
                        fields: { age: 1 }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run if search is false', () =>
            doTest({
                method: 'search',
                query: { page: 1, qry: 'name:nimo' },
                tags: { search: false, model: 'customer' },
                args,
                expect: {
                    query: { page: 1, qry: 'name:nimo' },
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run for unsupported request methods', async () => {
            for (let verb of unsupportedMethods)
                await doTest({
                    method: 'search',
                    query,
                    verb,
                    tags: { search: 'customer' },
                    args,
                    expect: {
                        query,
                        prs: {
                            [KEY_PARSERS_QUERY]: undefined
                        },
                        response: {
                            status: false
                        },
                        context: { next: [] }
                    }
                });
        });

        it('should abort if no pointer', () =>
            doTest({
                method: 'search',
                query: { q: 'name:ferisha' },
                tags: { search: ' ' },
                args,
                expect: {
                    query: { q: 'name:ferisha' },
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [] }
                }
            }));

        it('should abort if policy not found', () =>
            doTest({
                method: 'search',
                query: { q: 'name:ferisha' },
                tags: { search: 'admin' },
                args,
                expect: {
                    query: { q: 'name:ferisha' },
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [], next: false }
                }
            }));

        it('should abort if fields not found', () =>
            doTest({
                method: 'search',
                query: { q: 'age:>21' },
                tags: { search: 'user' },
                args: {
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: {}
                },
                expect: {
                    query: { q: 'age:>21' },
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [], next: false }
                }
            }));

        //XXX: Disabled because of search-filters #17
        //https://github.com/quenktechnologies/search-filters/issues/17
        xit('should pass options to the compiler', () =>
            doTest({
                method: 'search',
                query: { q: 'age:>21' },
                tags: { search: 'user' },
                args: {
                    maxPageSize: 10,
                    compilerOptions: { ignoreUnknownFields: true },
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: { user: { age: 1 } }
                },
                expect: {
                    query: {
                        filter: { age: { $gt: 21 } },
                        page: 1,
                        perPage: 10,
                        sort: {},
                        fields: { age: 1 }
                    },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    context: { next: [] }
                }
            }));

        it('should send 400 when parsing fails', () =>
            doTest({
                method: 'search',
                query: { q: 'age 21' },
                tags: { search: 'user' },
                args: {
                    policiesAvailable: { user: { age: 'number' } },
                    fieldsAvailable: { user: { age: 1 } }
                },
                expect: {
                    query: { q: 'age 21' },
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [400]
                    }
                }
            }));
    });

    describe('compileGetTag', () => {
        let args: Record<FieldSet> = {
            customer: { name: 1, balance: 1 },
            user: { age: 1 }
        };

        it('should compile the query fields property', () =>
            doTest({
                method: 'get',
                query: { fields: 'unsafe', filters: {} },
                tags: { get: 'customer' },
                args,
                expect: {
                    query: { fields: { name: 1, balance: 1 } },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should use the model tag if search is true', () =>
            doTest({
                method: 'get',
                tags: { get: true, model: 'customer' },
                args,
                expect: {
                    query: { fields: { name: 1, balance: 1 } },
                    prs: {
                        [KEY_PARSERS_QUERY]: true
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run if get is false', () =>
            doTest({
                method: 'get',
                tags: { get: false, model: 'customer' },
                args,
                expect: {
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: false
                    },
                    context: { next: [] }
                }
            }));

        it('should not run for unsupported request methods', async () => {
            for (let verb of unsupportedMethods)
                await doTest({
                    method: 'get',
                    query: { fields: 'unsafe', filters: {} },
                    verb,
                    tags: { get: 'customer' },
                    args,
                    expect: {
                        query: { fields: 'unsafe', filters: {} },
                        prs: {
                            [KEY_PARSERS_QUERY]: undefined
                        },
                        response: {
                            status: false
                        },
                        context: { next: [] }
                    }
                });
        });

        it('should abort if no pointer', () =>
            doTest({
                method: 'get',
                tags: { get: ' ' },
                args,
                expect: {
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [] }
                }
            }));

        it('should abort if fields not found', () =>
            doTest({
                method: 'get',
                tags: { get: 'user' },
                args: {
                    fieldsAvailable: {}
                },
                expect: {
                    prs: {
                        [KEY_PARSERS_QUERY]: undefined
                    },
                    response: {
                        status: [500]
                    },
                    context: { abort: [], next: false }
                }
            }));
    });
});
