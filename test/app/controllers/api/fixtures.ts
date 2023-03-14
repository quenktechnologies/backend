import { Mock } from '@quenk/test/lib/mock';

import { Future, pure, voidPure } from '@quenk/noni/lib/control/monad/future';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Type } from '@quenk/noni/lib/data/type';
import { Maybe, just } from '@quenk/noni/lib/data/maybe';
import { pure as freePure } from '@quenk/noni/lib/control/monad/free';
import { make } from '@quenk/noni/lib/data/array';

import { Request, ClientRequest } from '@quenk/tendril/lib/app/api/request';
import { noop } from '@quenk/tendril/lib/app/api/control';
import { Action, Api } from '@quenk/tendril/lib/app/api';

import {
    ApiController,
} from '../../../../lib/app/controllers/api';
import {
    Id,
    SearchParams,
    Model,
    UpdateParams,
    GetParams,
    ModelProvider
} from '../../../../lib/app/model';
import {
    PagedSearchParams,
    SearchStrategy
} from '../../../../lib/app/controllers/api/search/strategy';
import {
    PageData,
    SearchResult
} from '../../../../lib/app/controllers/api/search';

export class MockModel implements Model<Object> {
    constructor(
        public connection: { id: string } = { id: 'main' },
        public name = 'user'
    ) { }

    MOCK = new Mock();

    data = make(10, id => ({
        id,
        name: id < 3 ? 'chippy' : id < 6 ? 'adom' : 'patrick'
    }));

    create(data: Object): Future<Id> {
        return this.MOCK.invoke('create', [data], pure(<Id>1));
    }

    count(qry: SearchParams): Future<number> {
        /*    let results = this.data.filter(rec => {
                if (qry.filters.id) return rec.id === qry.filters.id;
    
                if (qry.filters.name) return rec.name === qry.filters.name;
    
                return true;
            });

        return this.MOCK.invoke('count', [qry], pure(results.length));
        */
        return this.MOCK.invoke('count', [qry], pure(0));
    }

    search(qry: SearchParams): Future<Object[]> {
        /* let results = this.data.filter((rec, idx) => {
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
         */
        return this.MOCK.invoke('search', [qry], pure([]));
    }

    update(id: Id, changes: object, qry?: UpdateParams): Future<boolean> {
        return this.MOCK.invoke(
            'update',
            [id, changes, qry],
            pure(<boolean>true)
        );
    }

    get(id: Id, qry?: GetParams): Future<Maybe<Object>> {
        return this.MOCK.invoke('get', [id, qry], pure(just({ name: 'adom' })));
    }

    remove(id: Id, qry?: UpdateParams): Future<boolean> {
        return this.MOCK.invoke('remove', [id, qry], pure(<boolean>true));
    }

}

export class TestModelProvider
    implements ModelProvider<{ id: string }, Object>
{
    MOCK = new Mock();

    model = new MockModel({ id: 'test' }, 'test');

    getInstance(conn: { id: string }, name: string) {
        let model = new MockModel(conn, name);

        this.model = model;

        return this.MOCK.invoke('getInstance', [conn, name], just(model));
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
                pages: new PageData(1, 1, 1, 1, 1)
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

    MOCK = new Mock();

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

    next() {
        return this.MOCK.invoke('next', [], pure(noop()));
    }

    abort() {
        this.filters = [];
        return this.MOCK.invoke('abort', [], pure(freePure(<Type>undefined)));
    }

    run(action: Action<Type>): Future<void> {
        return action.foldM(
            () => pure(<void>undefined),
            (next: Api<Type>) => next.exec(<Type>this)
        );
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
