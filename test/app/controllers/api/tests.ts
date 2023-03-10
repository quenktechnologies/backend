import { assert } from '@quenk/test/lib/assert';

import { Record } from '@quenk/noni/lib/data/record';
import { unflatten } from '@quenk/noni/lib/data/record/path';
import { Value, Object } from '@quenk/noni/lib/data/jsonx';
import { doFuture, pure, Future } from '@quenk/noni/lib/control/monad/future';
import { Type } from '@quenk/noni/lib/data/type';

import { PartialRequest } from '@quenk/tendril/lib/app/api/request';
import { Api, Action } from '@quenk/tendril/lib/app/api';

import {
    KEY_CONNECTION,
    KEY_PARSERS_BODY,
    KEY_PARSERS_QUERY
} from '../../../../lib/app/controllers/api';
import { TestResource, TestContext } from './fixtures';

/**
 * TestHook is a function invoked either before the test or as the test itself.
 */
export type TestHook = (ctx: TestContext, ctl: TestResource) => Future<void>;

interface TestConf {
    method: string;

    context?: PartialRequest;

    before?: TestHook;

    attest?: {
        query?: boolean;

        body?: boolean;
    };

    skipParsers?: boolean;

    connectionOverride?: string;

    expect?: {
        model?: Record<false | Value[]>;

        strategy?: false | object;

        response?: Record<Type[]>;
    };

    test?: TestHook;
}

export const noop = () => pure(<void>undefined);

export const exec = (ctx: TestContext) => (next: Api<Type>) =>
    next.exec(<Type>ctx);

const methodMap: { [key: string]: string } = {
    create: 'post',
    search: 'get',
    update: 'patch',
    get: 'get',
    remove: 'delete'
};

export const doTest = (conf: TestConf) =>
    doFuture(function* () {
        let {
            method,
            context = {},
            before,
            attest,
            skipParsers,
            connectionOverride,
            expect,
            test
        } = conf;

        context.prsData = context.prsData || {};

        if (attest) {
            if (attest.body) (<Object>context.prsData)[KEY_PARSERS_BODY] = true;

            if (attest.query)
                (<Object>context.prsData)[KEY_PARSERS_QUERY] = true;
        }

        context.prsData = unflatten(<Object>context.prsData);

        if (skipParsers)
            process.env.QTL_API_CONTROLLER_SKIP_PARSER_CHECKS = 'yes';
        else delete process.env.QTL_API_CONTROLLER_SKIP_PARSER_CHECKS;

        if (connectionOverride)
            context.routeConf = {
                method: methodMap[method],
                path: '/',
                filters: [],
                tags: unflatten({ [KEY_CONNECTION]: connectionOverride })
            };

        let ctx = new TestContext(context);

        let ctl = new TestResource();

        let action: Action<void>;

        if (before) yield before(ctx, ctl);

        switch (method) {
            case 'create':
                action = ctl.create(ctx.request);
                break;

            case 'search':
                action = ctl.search(ctx.request);
                break;

            case 'update':
                action = ctl.update(ctx.request);
                break;

            case 'get':
                action = ctl.get(ctx.request);
                break;

            case 'remove':
                action = ctl.remove(ctx.request);
                break;

            default:
                throw new Error(`Bad method: "${method}"`);
        }

        yield action.foldM(noop, exec(ctx));

        if (expect) {
            for (let [name, args] of Object.entries(expect.model || {})) {
                if (args === false)
                    assert(
                        ctl.provider.model.MOCK.wasCalled(name),
                        `model.${name} was not called`
                    ).false();
                else
                    assert(
                        ctl.provider.model.MOCK.wasCalledWithDeep(name, args),
                        `model.${name} was called with ...`
                    ).true();
            }

            if (expect.strategy === false)
                assert(
                    ctl.strategy.MOCK.wasCalled('execute'),
                    `strategy.execute was not called`
                ).false();
            else if (expect.strategy)
                assert(
                    ctl.strategy.MOCK.wasCalledWithDeep('execute', [
                        ctl.provider.model,
                        expect.strategy
                    ]),
                    `strategy.execute was called with ...`
                ).true();

            for (let [name, args] of Object.entries(expect.response || {}))
                assert(
                    ctx.response.MOCK.wasCalledWithDeep(name, args),
                    `response.${name} was called with ...`
                ).true();
        }

        if (connectionOverride)
            assert(
                ctl.provider.model.connection.id,
                `connection.${connectionOverride} used`
            ).equal(connectionOverride);

        if (test) yield test(ctx, ctl);

        return pure(undefined);
    });
