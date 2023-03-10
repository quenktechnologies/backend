import { assert } from '@quenk/test/lib/assert';

import { merge } from '@quenk/noni/lib/data/record';
import { pure } from '@quenk/noni/lib/control/monad/future';

import {
    PagedSearchParams,
    SkipAndLimit
} from '../../../../../lib/app/controllers/api/search/strategy';

import { PageData } from '../../../../../lib/app/controllers/api/search';

import { MockModel } from '../fixtures';

interface TestConf {
    count: number;

    search: number;

    query: PagedSearchParams;

    expect: {
        model: object;

        pages: PageData;
    };
}

const doTest = async ({ count, search, query, expect }: TestConf) => {
    let model = new MockModel();

    model.MOCK.setReturnValue('count', pure(count));

    let data = Array(search).fill({});

    model.MOCK.setReturnValue('search', pure(data));

    let strategy = new SkipAndLimit();

    let result = await strategy.execute(model, query);

    assert(
        model.MOCK.wasCalledWithDeep('count', [
            {
                filters: query.filters || {}
            }
        ])
    ).true();

    assert(
        model.MOCK.wasCalledWithDeep('search', [
            merge(
                {
                    filters: query.filters || {},
                    sort: query.sort || {},
                    fields: query.fields || {}
                },
                expect.model
            )
        ])
    ).true();

    assert(result).equate({
        data,
        pages: expect.pages
    });
};

describe('strategy', () => {
    describe('SkipAndLimit', () => {
        describe('execute', () => {
            it('should return results', () =>
                doTest({
                    count: 1,
                    search: 1,
                    query: {
                        filters: { name: 1 },
                        page: 1,
                        perPage: 1,
                        sort: { name: 1 },
                        fields: { name: 1 }
                    },
                    expect: {
                        model: { offset: 0, limit: 1 },

                        pages: new PageData(1, 1, 1, 1, 1)
                    }
                }));

            it('should default the parameters when missing', () =>
                doTest({
                    count: 1,
                    search: 1,
                    query: {},
                    expect: {
                        model: {
                            filters: {},
                            offset: 0,
                            limit: 25,
                            sort: {},
                            fields: {}
                        },
                        pages: new PageData(1, 1, 25, 1, 1)
                    }
                }));

            it('should round up negative page numbers', () =>
                doTest({
                    count: 1,
                    search: 1,
                    query: { page: -1 },
                    expect: {
                        model: {
                            filters: {},
                            offset: 0,
                            limit: 25,
                            sort: {},
                            fields: {}
                        },
                        pages: new PageData(1, 1, 25, 1, 1)
                    }
                }));

            it('should work work when there are no results', () =>
                doTest({
                    count: 0,
                    search: 0,
                    query: { page: 2, perPage: 50 },
                    expect: {
                        model: {
                            filters: {},
                            offset: 0,
                            limit: 50,
                            sort: {},
                            fields: {}
                        },
                        pages: new PageData(1, 0, 50, 0, 0)
                    }
                }));

            it('should return first page when page 0 requested', () =>
                doTest({
                    count: 25,
                    search: 10,
                    query: { page: 0, perPage: 10 },
                    expect: {
                        model: { offset: 0, limit: 10 },
                        pages: new PageData(1, 10, 10, 3, 25)
                    }
                }));

            it('should return results within range when page is not', () =>
                doTest({
                    count: 25,
                    search: 5,
                    query: { page: 4, perPage: 10 },
                    expect: {
                        model: { offset: 20, limit: 10 },
                        pages: new PageData(3, 5, 10, 3, 25)
                    }
                }));

            it('should page properly', async () => {
                await doTest({
                    count: 26,
                    search: 10,
                    query: { page: 1, perPage: 10 },
                    expect: {
                        model: { offset: 0, limit: 10 },
                        pages: new PageData(1, 10, 10, 3, 26)
                    }
                });

                await doTest({
                    count: 26,
                    search: 10,
                    query: { page: 2, perPage: 10 },
                    expect: {
                        model: { offset: 10, limit: 10 },
                        pages: new PageData(2, 10, 10, 3, 26)
                    }
                });

                await doTest({
                    count: 26,
                    search: 1,
                    query: { page: 3, perPage: 10 },
                    expect: {
                        model: { offset: 20, limit: 10 },
                        pages: new PageData(3, 1, 10, 3, 26)
                    }
                });
            });

            it('should return one page if the results are < maxPerPage', async () => {
                await doTest({
                    count: 6,
                    search: 6,
                    query: { page: 1, perPage: 100 },
                    expect: {
                        model: { offset: 0, limit: 100 },
                        pages: new PageData(1, 6, 100, 1, 6)
                    }
                });
            });
        });
    });
});
