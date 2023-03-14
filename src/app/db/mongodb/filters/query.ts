import { Object } from '@quenk/noni/lib/data/jsonx';
import { isNumber, isObject, isString } from '@quenk/noni/lib/data/type';
import { merge, Record } from '@quenk/noni/lib/data/record';
import { interpolate } from '@quenk/noni/lib/data/string';

import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { abort, next } from '@quenk/tendril/lib/app/api/control';
import { badRequest, error } from '@quenk/tendril/lib/app/api/response';

import { sanitize } from '@quenk/search-filters';

import { MongoDBFilterCompiler, Options } from '@quenk/search-filters-mongodb';

import { PagedSearchParams } from '../../../controllers/api/search/strategy';
import { compileFilter, compileSort, PoliciesAvailable } from '../../search';
import { KEY_PARSERS_QUERY } from '../../../controllers/api';
import { mkCtx } from '../../../filters/shape';
import { Count, FieldSet } from '../../../model';

export const DEFAULT_PAGE_SIZE = 100;

/**
 * CompileQueryTagConf is the configuration interface for compileQueryTag().
 */
export interface CompileQueryTagConf {
    /**
     * compilerOptions passed to the MongoDBFilterCompiler instance.
     */
    compilerOptions: Partial<Options>;

    /**
     * policiesAvailable to be used in determining the filter part of the query.
     */
    policiesAvailable: PoliciesAvailable;
}

/**
 * compileQueryTag treats the value of the "query" tag as a search-filters
 * string to compile into a mongodb query filter.
 *
 * This function only executes if the "query" tag is present and will execute
 * regardless of the request method. The tag "model" must be also set which
 * serves as a pointer to the filter policy to use. If the prs value
 * KEY_PARSERS_QUERY is set, then the existing request.query object will be
 * preserved and the query tag's filter $and'd to request.query.filters. If not,
 * request.query is overwritten completely.
 */
export const compileQueryTag = (conf: Partial<CompileQueryTagConf>) => {
    let { policiesAvailable, compilerOptions } = merge(
        { policiesAvailable: {}, compilerOptions: {} },
        conf
    );

    let mfc = new MongoDBFilterCompiler(compilerOptions);

    return (req: Request): Action<void> =>
        doAction(function* () {
            let str = <string>req.route.tags.query;

            if (!isString(str)) return next(req);

            let ptr = <string>req.route.tags.model;

            if (!ptr)
                if (isString(req.route.tags.search))
                    ptr = req.route.tags.search;
                else if (isString(req.route.tags.get)) ptr = req.route.tags.get;

            let policy = policiesAvailable[ptr];

            if (!policy) {
                yield error(new Error('ERR_NO_FILTER_POLICY'));

                return abort();
            }

            let mquery = compileFilter(mfc, policy, expandTemplate(req, str));

            if (mquery.isLeft()) {
                yield error(new Error('ERR_QUERY_TAG_INVALID'));

                return abort();
            }

            let filters = mquery.takeRight();

            let trustQuery = req.prs.getOrElse(KEY_PARSERS_QUERY, false);

            let query: PagedSearchParams = trustQuery ? req.query : {};

            query.filters = <Object>(
                (trustQuery && isObject(filters)
                    ? { $and: [req.query.filters, filters] }
                    : filters)
            );

            req.query = <Object>query;

            req.prs.set(KEY_PARSERS_QUERY, true);

            return next(req);
        });
};

/**
 * CompileSearchTagConf is the configuration for compileSearchTag().
 */
export interface CompileSearchTagConf extends CompileQueryTagConf {
    /**
     * filterKey indicates the property on the query object that should
     * be treated as the query filter string. Defaults to "q"
     */
    filterKey: string;

    /**
     * maxPageSize indicates the maximum amount of documents allowed in a page.
     *
     * Set this to avoid abuse of APIs
     */
    maxPageSize: Count;

    /**
     * fieldsAvailable is a mapping of names (typically model names) to mongodb
     * field projection specifiers.
     */
    fieldsAvailable: Record<FieldSet>;
}

const compileSearchTagDefaults = {
    filterKey: 'q',
    maxPageSize: DEFAULT_PAGE_SIZE,
    compilerOptions: {},
    policiesAvailable: {},
    fieldsAvailable: {}
};

/**
 * compileSearchTag shapes the query parameters of an incoming search request to
 * form a mongodb query from a @quenk/search-filters string.
 *
 * This function is only applied if the "search" tag is present and its value is
 * truthy. If the value of that tag is a string, then it is used as a pointer
 * to the correct search filter policy, otherwise the tag "model" is used as the
 * pointer instead.
 *
 * This function shapes the request's query object to be compliant with the
 * PagedSearchParams object. Once successful, it will also set KEY_PARSERS_QUERY
 * on the prs object flagging it as safe for other filters and handlers.
 */
export const compileSearchTag = (conf: Partial<CompileSearchTagConf>) => {
    let {
        policiesAvailable,
        filterKey,
        maxPageSize,
        compilerOptions,
        fieldsAvailable
    } = merge(compileSearchTagDefaults, conf);

    let mfc = new MongoDBFilterCompiler(compilerOptions);

    return (req: Request): Action<void> => {
        return doAction(function* () {
            if (!req.route.tags.search) return next(req);

            let ptr = isString(req.route.tags.search)
                ? req.route.tags.search
                : <string>req.route.tags.model;

            if (!ptr) {
                yield error(new Error('ERR_NO_SEARCH_PTR'));
                return abort();
            }

            let policy = policiesAvailable[ptr];

            if (!policy) {
                yield error(new Error('ERR_FILTER_POLICY_NOT_FOUND'));

                return abort();
            }

            let page = Number(req.query.page);

            page = isNumber(page) ? page : 1;

            let perPage = Number(req.query.perPage);

            perPage = isNumber(perPage) ? perPage : DEFAULT_PAGE_SIZE;

            perPage = perPage > maxPageSize ? maxPageSize : perPage;

            let str = <string>req.query[filterKey] || '';

            let mQuery = compileFilter(mfc, policy, str);

            if (mQuery.isLeft()) {
                yield badRequest({ error: 'ERR_SEARCH_FILTER_PARSER' });

                if (process.env.QTL_LOG_SEARCH_FILTER_PARSE_ERROR)
                    console.error(mQuery.takeLeft());

                return abort();
            }

            let filters = mQuery.takeRight();

            let fields = <Object>fieldsAvailable[ptr];

            if (!fields) {
                yield error(new Error('ERR_FIELDS_NOT_FOUND'));

                return abort();
            }

            let sort = compileSort(<FieldSet>fields, <string>req.query.sort);

            req.query = { filters, page, perPage, sort, fields };

            req.prs.set(KEY_PARSERS_QUERY, true);

            return next(req);
        });
    };
};
/**
 * compileGetTag shapes the query parameters of an incoming get request to
 * form a mongodb query.
 *
 * This function is only applied if the "get" tag is present and its value is
 * truthy. If the value of that tag is a string, it is used as a pointer to
 * determine the correct FieldSet to use otherwise the tag "model" is used as
 * the pointer instead.
 */
export const compileGetTag =
    (fieldsAvailable: Record<FieldSet>) =>
    (req: Request): Action<void> => {
        return doAction(function* () {
            if (!req.route.tags.get) return next(req);

            let ptr = isString(req.route.tags.get)
                ? req.route.tags.get
                : <string>req.route.tags.model;

            if (!ptr) return next(req);

            let fields = fieldsAvailable[ptr];

            if (!fields) {
                yield error(new Error('ERR_NO_FIELDS'));

                return abort();
            }

            req.query = { fields };

            req.prs.set(KEY_PARSERS_QUERY, true);

            return next(req);
        });
    };

const expandTemplate = (req: Request, str: string) =>
    interpolate(str, mkCtx(req), { transform: sanitize });
