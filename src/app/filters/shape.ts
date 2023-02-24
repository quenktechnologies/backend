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
import { Path, set, unsafeGet } from '@quenk/noni/lib/data/record/path';
import { Object, Value } from '@quenk/noni/lib/data/jsonx';
import { Record, reduce } from '@quenk/noni/lib/data/record';
import { isObject } from '@quenk/noni/lib/data/type';

import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { next } from '@quenk/tendril/lib/app/api/control';

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
     * $session is the session data from the session property of the Request
     * object.
     *
     * If no session support is detected, an empty object is provided.
     */
    $session: Object,

    /**
     * $prs contains the data of the prs property of the Request object.
     */
    $prs: Object,

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
    $prs: req.prs.data,
    $session: req.session.getAll(),
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
export const expand = (ctx: object, src: Shape, dest: object): Object =>
    reduce(src, <Object>dest, (ret, spec, destPath) => {

        spec = isObject(spec) ? spec : { path: spec };

        let { path, cast } = <PropertyOptions>spec;

        let val = unsafeGet(path, <Object>ctx);

        if ((val != null) && cast != null) {

            switch (cast) {

                case 'number':
                    val = Number(val);
                    break;

                case 'boolean':
                    val = Boolean(val);
                    break;

                case 'string':
                    val = (val != null) ? String(val) : '';
                    break;

                default:
                    break;

            }

        }

        return val == null ? ret : set(destPath, <Value>val, ret);

    });

/**
 * @internal
 */
export const doShape =
    (req: Request, method: string, shape: Shape, target: Path): Action<void> =>
        doAction(function*() {
            if (req.method !== method) return next(req);

            let ctx = mkCtx(req);

            let obj = <Object><object>req;

            obj[target] = expand(ctx, shape, <object>obj[target]);

            return next(req);

        })

/**
 * shapeGet merges an expanded Shape into the query section of a GET request.
 */
export const shapeGet = (shape: Shape) => (req: Request): Action<void> =>
    doShape(req, 'GET', shape, 'query');

/**
 * shapePost merges an expanded Shape to the body of a POST request.
 */
export const shapePost = (shape: Shape) => (req: Request): Action<void> =>
    doShape(req, 'POST', shape, 'body');

/**
 * shapePatch merges an expanded Shape into the body of a PATCH request.
 */
export const shapePatch = (shape: Shape) => (req: Request): Action<void> =>
    doShape(req, 'PATCH', shape, 'body');
