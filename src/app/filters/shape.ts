/**
 * Filters for shaping the body and query parts of requests.
 *
 * Often it's easier to automatically pull values from other parts of a request
 * such as the path or session, in order to construct queries instead of writing
 * code to do this for each route.
 *
 * This module helps with the former by providing filters that evaluate a
 * declared "shape" upon request, and merge it into the target request property
 * (body or query). These filters should only be invoked after the entire 
 * request was been properly validated and transformed to suite your needs.
 *
 * See them as the last step before sending data to the database.
 */
import { Path, unsafeGet } from '@quenk/noni/lib/data/record/path';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { Record, merge, map } from '@quenk/noni/lib/data/record';

import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { next } from '@quenk/tendril/lib/app/api/control';
import { isObject } from '@quenk/noni/lib/data/type';
import { SessionStorage } from '@quenk/tendril/lib/app/api/storage/session';
import { PRSStorage } from '@quenk/tendril/lib/app/api/storage/prs';

/**
 * ShapeContext provides common values that can be used to retrieve values to
 * shape a mutable property on a Request.
 *
 * Each property in the context begins with a '$' and most are properties of 
 * Request themselves.
 */
export interface ShapeContext {

    /**
     * $request is the current incoming Request object that the context is 
     * created to handle.
     */
    $request: Request,

    /**
     * $params is the params property of the Request object.
     */
    $params: Record<string>,

    /**
     * $query is the query property of the Request object/
     */
    $query: Object,

    /**
     * $body is the body property of the Request object.
     */
    $body: Object,

    /**
     * $session is the session property of the Request object.
     *
     * If no session support is detected, an empty object is provided.
     */
    $session: SessionStorage,

    /**
     * $prs is the prs property of the Request object.
     */
    $prs: PRSStorage,

    /**
     * $now is an instance of Date for the current time.
     */
    $now: Date,

    /**
     * $env is the process.env object.
     */
    $env: NodeJS.ProcessEnv

}

const mkCtx = (req: Request): ShapeContext => ({
    $request: req,
    $params: req.params,
    $body: <Object>req.body,
    $query: req.query,
    $prs: req.prs,
    $session: req.session || {},
    $now: new Date(),
    $env: process.env
})

/**
 * CastType indicates how to cast the value of a Shape property.
 *
 * Valid values are 'string', 'number' or 'boolean' however any other string
 * value leaves the value unchanged.
 */
export type CastType = string;

/**
 * PropertyOptions can be specified to modify how path values are resolved.
 */
export interface PropertyOptions {

    /**
     * path to the value in the context.
     */
    path: Path

    /**
     * cast indicates what type to cast the value to.
     */
    cast?: CastType

}

/**
 * Shape is an object where each key is a property name and the value a path
 * expression that will be used to tag a target object with its context resolved
 * value.
 */
export interface Shape extends Record<Path | PropertyOptions> { }

/**
 * expand a Shape to its final value using values from a context object.
 */
export const expand = (ctx: ShapeContext, src: Shape): Object =>
    <Object>map(src, (_, spec) => {

        if (isObject(spec)) {

            let { path, cast } = <PropertyOptions>spec;

            let val = unsafeGet(path, <Object><object>ctx);

            if (cast != null) {

                switch (cast) {

                    case 'number':
                        val = (val != null) ? Number(val) : 0;
                        break;

                    case 'boolean':
                        val = (val != null) ? Boolean(val) : false;
                        break;

                    case 'string':
                        val = (val != null) ? String(val) : '';
                        break;

                    default:
                        break;

                }

            }

            return val;

        } else {

            return spec;

        }
    });

const doShape =
    (req: Request, target: Shape): Action<void> =>
        doAction(function*() {

            let ctx = mkCtx(req);

            req.body = merge(<Object>req.body || {}, expand(ctx, target));

            return next(req);

        })

/**
 * shapePost merges an expanded Shape to the body of a POST request.
 */
export const shapePost = (target: Shape) => (req: Request): Action<void> => {

    if (req.method !== 'POST') return next(req);

    return doShape(req, target);

}

/**
 * shapePatch merges an expanded Shape into the body of a PATCH request.
 */
export const shapePatch = (target: Shape) => (req: Request): Action<void> => {

    if (req.method !== 'PATCH') return next(req);

    return doShape(req, target);

}

/**
 * shapeGet merges an expanded Shape into the query section of a GET request.
 */
export const tagGet = (target: Shape) => (req: Request): Action<void> => {

    if (req.method !== 'GET') return next(req);

    let ctx = mkCtx(req);

    req.query = merge(<Object>req.query || {}, expand(ctx, target));

    return next(req);

}
