import { Mock } from '@quenk/test/lib/mock';

import { pure, voidPure, Future } from '@quenk/noni/lib/control/monad/future';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Type } from '@quenk/noni/lib/data/type';
import { Maybe, just } from '@quenk/noni/lib/data/maybe';
import { pure as freePure } from '@quenk/noni/lib/control/monad/free';

import { make } from '@quenk/noni/lib/data/array';
import { Request, ClientRequest } from '@quenk/tendril/lib/app/api/request';

import { ApiController, ModelProvider } from '../../../../lib/app/controllers/api';
import { Id, SearchParams, Model } from '../../../../lib/app/model';
import {
    PagedSearchParams,
    SearchStrategy
} from '../../../../lib/app/controllers/api/search/strategy';
import { SearchResult } from '../../../../lib/app/controllers/api/search/result';

export class MockModel implements Model<Object> {
    constructor(public connection: { id: string }, public name: string) { }

    MOCK = new Mock();

    data = make(10, id => ({
        id,
        name: id < 3 ? 'chippy' : id < 6 ? 'adom' : 'patrick'
    }));

    create(data: Object): Future<Id> {
        return this.MOCK.invoke('create', [data], pure(<Id>1));
    }

    createAll(data: Object[]): Future<Id[]> {
        return this.MOCK.invoke('createAll', [data], pure(<Id[]>[]));
    }

    search(qry: SearchParams): Future<Object[]> {
        let results = this.data.filter((rec, idx) => {
            if (
                (qry.offset && idx + 1 < qry.offset) ||
                (qry.limit && idx + 1 >= qry.limit)
            )
                return false;

            if (qry.filters.id) return rec.id === qry.filters.id;

            if (qry.filters.name) return rec.name === qry.filters.name;

            return true;
        });

        return this.MOCK.invoke('search', [qry], pure(results));
    }

    update(id: Id, changes: object, qry?: object): Future<boolean> {
        return this.MOCK.invoke(
            'update',
            [id, changes, qry],
            pure(<boolean>true)
        );
    }

    get(id: Id, qry?: object): Future<Maybe<Object>> {
        return this.MOCK.invoke('get', [id, qry], pure(just({ name: 'adom' })));
    }

    remove(id: Id, qry?: object): Future<boolean> {
        return this.MOCK.invoke('remove', [id, qry], pure(<boolean>true));
    }

    count(qry: SearchParams): Future<number> {
        let results = this.data.filter(rec => {
            if (qry.filters.id) return rec.id === qry.filters.id;

            if (qry.filters.name) return rec.name === qry.filters.name;

            return true;
        });

        return this.MOCK.invoke('count', [qry], pure(results.length));
    }
}

export class TestModelProvider
    implements ModelProvider<Object, { id: string }>
{
    MOCK = new Mock();

    model = new MockModel({ id: 'test' }, 'test');

    getInstance(conn: { id: string }, name: string) {
        let model = new MockModel(conn, name);

        this.model = model;

        return this.MOCK.invoke('getInstance', [conn, name], model);
    }
}

export class TestSearchStrategy implements SearchStrategy {
    MOCK = new Mock();

    execute(
        model: Model<Object>,
        qry: Partial<PagedSearchParams>
    ): Future<SearchResult<Object>> {
        return this.MOCK.invoke(
            'execute',
            [model, qry],
            pure({
                data: [],

                meta: {
                    pagination: {
                        current: {
                            count: 1,

                            page: 1,

                            limit: 1
                        },

                        total: {
                            count: 1,

                            pages: 1
                        }
                    }
                }
            })
        );
    }
}

export class TestResource extends ApiController<object> {
    constructor(
        public provider = new TestModelProvider(),
        public strategy = new TestSearchStrategy()
    ) {
        super('main', provider, strategy);
    }

    MOCK = new Mock();

    create(r: Request) {
        this.MOCK.invoke('create', [r], undefined);
        return super.create(r);
    }

    search(r: Request) {
        this.MOCK.invoke('search', [r], undefined);
        return super.search(r);
    }

    update(r: Request) {
        this.MOCK.invoke('update', [r], undefined);
        return super.update(r);
    }

    get(r: Request) {
        this.MOCK.invoke('get', [r], undefined);
        return super.get(r);
    }

    remove(r: Request) {
        this.MOCK.invoke('remove', [r], undefined);
        return super.remove(r);
    }
}

export class TestContext {
    constructor(public req: object) { }

    module = {
        app: {
            pool: {
                MOCK: new Mock(),

                get(id: string) {
                    return this.MOCK.invoke(
                        'get',
                        [id],
                        just({
                            checkout() {
                                return pure({});
                            }
                        })
                    );
                }
            }
        }
    };

    request = ClientRequest.fromPartial(this.req);

    response = {
        MOCK: new Mock(),

        status(code: number) {
            this.MOCK.invoke('status', [code], undefined);
        },

        send(value: Type) {
            this.MOCK.invoke('send', [value], undefined);
        },

        end() {
            this.MOCK.invoke('end', [], undefined);
        }
    };

    onError = () => { };

    filters = [];

    abort() {
        this.filters = [];

        return pure(freePure(<Type>undefined));
    }
}

export class TestConnection {
    constructor(public name: string) { }

    open() {
        return voidPure;
    }

    checkout() {
        return pure({ id: this.name });
    }

    close() {
        return voidPure;
    }
}
