import { Value } from '@quenk/noni/lib/data/jsonx';
import { hasKey, Record } from '@quenk/noni/lib/data/record';
import { isString } from '@quenk/noni/lib/data/type';
import { Except } from '@quenk/noni/lib/control/error';
import { left } from '@quenk/noni/lib/data/either';

import { EnabledPolicies as _EnabledPolicies } from '@quenk/search-filters/lib/compile/policy';
import { Source } from '@quenk/search-filters/lib/compile';

import { SortDir, SortSet } from '../model';

/**
 * EnabledPolicies type specialized to JSON values.
 */
export type EnabledPolicies = _EnabledPolicies<Value>;

/**
 * PoliciesAvailable is a mapping of model names to search-filter policies
 * allowed.
 */
export type PoliciesAvailable = Record<EnabledPolicies>;

/**
 * SortString is a comma delimited string of the form 'name', '+name' or '-name'
 * which  indicates what field(s) to sort results on.
 *
 * "+" indicates ascending, "-" indicates descending. Omitting either defaults
 * to ascending.
 */
export type SortString = string;

/**
 * FilterCompiler is any object capable of compiling a search-filters string.
 */
export interface FilterCompiler {
    /**
     * compile the source string using provided policy document.
     *
     * @param polices - The policies enabled for this compilation.
     * @param src     - The source string.
     */
    compile(policies: EnabledPolicies, src: Source): Except<Value>;
}

/**
 * compileFilter compiles a search-filters string into its target.
 */
export const compileFilter = (
    fc: FilterCompiler,
    policies: EnabledPolicies,
    str: Source
): Except<Value> => {
    if (!isString(str) || str === '')
        return left(new Error(`compileFilter: empty filter encountered!`));

    let ret = fc.compile(policies, str);

    if (ret.isLeft())
        return left(new Error(`compileFilter: ${ret.takeLeft()}`));

    return ret;
};

/**
 * compileSort compiles a string indicating the sort direction on one or more
 * fields into a SortSet object.
 *
 * @param refs - Only fields appearing here will be allowed in the final
 *               SortSet.
 *
 * @param src  - The string to turn into a SortSet.
 */
export const compileSort = (refs: Record<Value>, src: SortString): SortSet => {
    if (!isString(src) || src === '') return {};

    return src.split(',').reduce((target, key) => {
        key = key.trim();

        if (key === '') return target;

        let dir: SortDir = key[0] === '-' ? -1 : 1;

        key = key[0] === '+' || key[0] === '-' ? key.slice(1) : key;

        if (hasKey(refs, key)) target[key] = dir;

        return target;
    }, <SortSet>{});
};
