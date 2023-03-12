import * as search from '../../../lib/app/db/search';

import { Mock } from '@quenk/test/lib/mock';
import { assert } from '@quenk/test/lib/assert';

import { left, right } from '@quenk/noni/lib/data/either';
import { Value } from '@quenk/noni/lib/data/jsonx';

import { Except, Source } from '@quenk/search-filters/lib/compile';

describe('search', () => {
    describe('compileFilter', () => {
        class MockCompiler {
            MOCK = new Mock();

            compile(
                policies: search.EnabledPolicies,
                src: Source
            ): Except<Value> {
                return this.MOCK.invoke(
                    'compile',
                    [policies, src],
                    right('txt')
                );
            }
        }

        it('should compile filters', () => {
            let mc = new MockCompiler();

            let policies = { name: 'matchci' };

            let str = 'name:ryu';

            let result = search.compileFilter(mc, policies, str);

            assert(
                mc.MOCK.wasCalledWith('compile', [policies, str]),
                'compile was called correctly'
            ).true();

            assert(result.takeRight(), 'correct result returned').equal('txt');
        });

        it('should return failures', () => {
            let mc = new MockCompiler();

            mc.MOCK.setReturnValue('compile', left(new Error('bad input')));

            let result = search.compileFilter(mc, {}, 'x=y');

            assert(mc.MOCK.wasCalled('compile'), 'compile was called').true();

            assert(result.isLeft(), 'result is left').true();

            assert(result.takeLeft().message).equal(
                'compileFilter: Error: bad input'
            );
        });

        it('should fail empty strings', () => {
            let mc = new MockCompiler();

            let result = search.compileFilter(mc, {}, '');

            assert(
                mc.MOCK.wasCalled('compile'),
                'compile was not called'
            ).not.true();

            assert(result.isLeft(), 'result is left').true();

            assert(result.takeLeft().message).equal(
                'compileFilter: empty filter encountered!'
            );
        });
    });

    describe('compileSort', () => {
        let fields = {
            id: true,
            name: true,
            age: true
        };

        it('should compile sort strings', () => {
            assert(search.compileSort(fields, 'name')).equate({ name: 1 });

            assert(search.compileSort(fields, '+name')).equate({ name: 1 });

            assert(search.compileSort(fields, '-name')).equate({ name: -1 });

            assert(search.compileSort(fields, '+age, -name, id')).equate({
                age: 1,
                name: -1,
                id: 1
            });
        });

        it('should ignore unspecified fields', () => {
            assert(search.compileSort(fields, 'status')).equate({});

            assert(
                search.compileSort(fields, '+id, -status, +stamp, -name')
            ).equate({
                id: 1,
                name: -1
            });
        });

        it('should use the last of repeating fields', () => {
            assert(search.compileSort(fields, '+id, id, -id')).equate({
                id: -1
            });
        });
    });
});
