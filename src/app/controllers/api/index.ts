import {
    doFuture,
    Future,
    pure,
    raise
} from '@quenk/noni/lib/control/monad/future';
import { Either, left, right } from '@quenk/noni/lib/data/either';
import { empty } from '@quenk/noni/lib/data/record';
import { Object } from '@quenk/noni/lib/data/jsonx';
import { isObject } from '@quenk/noni/lib/data/type';

import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { fork } from '@quenk/tendril/lib/app/api/control';
import {
    ok,
    created,
    conflict,
    error,
    badRequest
} from '@quenk/tendril/lib/app/api/response';
import { notFound } from '@quenk/tendril/lib/app/api/response';
import { getUserConnection } from '@quenk/tendril/lib/app/connection';

import { Id, Model } from '../../model';
import { SearchStrategy } from './search/strategy';

export const KEY_PARSERS_BODY = 'qtl.parsers.body';
export const KEY_PARSERS_QUERY = 'qtl.parsers.query';
export const KEY_CONNECTION = 'qtl.connection';
export const KEY_MODEL_NAME = 'qtl.model';

export const ERR_PAYLOAD_INVALID = 'payload invalid';
export const ERR_PARSERS_BODY = 'body not parsed safely';
export const ERR_PARSERS_QUERY = 'query not parsed safely';

/**
 * UpdateParams used in update operations.
 */
export interface UpdateParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;

    /**
     * changes to be made via the $set operation.
     *
     * This is in addition to the request body.
     */
    changes: Object;
}

/**
 * GetParams used in single result search operations.
 */
export interface GetParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;

    /**
     * fields to project on.
     */
    fields: object;
}

/**
 * RemoveParams used in remove operations.
 */
export interface RemoveParams {
    /**
     * query object used to further specify the target object.
     */
    query: Object;
}

/**
 * CreateResult stores details about the record that was created after a
 * successful create operation.
 */
export interface CreateResult extends Object {
    /**
     * data contains properties of the record, currently only the id is expected.
     */
    data: {
        /**
         * id assigned to the new record.
         *
         *  id
         */
        id: Id;
    };
}

/**
 * ModelProvider provides model instances to controllers based on the details
 * of the Request.
 *
 * @typeParam T - The data type of the model.
 * @typeParam C - The underlying connection.
 */
export interface ModelProvider<T extends Object, C> {
    /**
     * fromRequest provides a model instance using the parameters provided.
     *
     *
     * @param conn - The connection instance used to create the model.
     * @param name - The name of the model to produce.
     */
    getInstance(conn: C, name: string): Model<T>;
}

/**
 * Resource is an interface representing a controller for an API endpoint.
 *
 * It provides an opinionated JSON interface for creates, searches, updates,
 * gets and removel (CSUGR) for target collections.
 */
export interface Resource {
    /**
     * create a new document in the Resource's collection.
     */
    create(r: Request): Action<void>;

    /**
     * search for a document in the Resource's collection.
     *
     * A successful result with found documents sends a [[SearchResult]], if
     * there are no matches the [[NoContent]] response is sent.
     */
    search(r: Request): Action<void>;

    /**
     * update a single document in the Resource's collection.
     *
     * The document id is sourced from Request#params.id and the change data
     * from the request body. Additional conditions for the query can be
     * specified by the query property.
     *
     * A successful update will result in an [[Ok]] response whereas a
     * [[NotFound]] is sent if the update was not applied.
     */
    update(r: Request): Action<void>;

    /**
     * get a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.
     * Additional conditions can be specified via the query property.
     *
     * A successful fetch will respond with [[Ok]] with the document as body
     * otherwise [[NotFound]] is sent.
     */
    get(r: Request): Action<void>;

    /**
     * remove a single document in the Resource's collection.
     *
     * The document's id is sourced from Request#params.id.
     * Additional conditions can be specified via the query property.
     *
     * A successful delete will respond with a [[Ok]] or [[NotFound]] if the
     * document was not found.
     */
    remove(r: Request): Action<void>;
}

class Preconditions {
    static hasParser(req: Request, key: string): boolean {
        return !!(
            req.prs.getOrElse(key, false) ||
            process.env.QTL_API_CONTROLLER_SKIP_PARSER_CHECKS
        );
    }

    static forCreate(req: Request): Either<Action<void>, Request> {
        if (!Preconditions.hasParser(req, KEY_PARSERS_BODY))
            return left(error({ error: ERR_PARSERS_BODY }));

        if (!isObject(req.body))
            return left(conflict({ error: ERR_PAYLOAD_INVALID }));

        return right(req);
    }

    static forSearch(req: Request): Either<Action<void>, Request> {
        if (!Preconditions.hasParser(req, KEY_PARSERS_QUERY))
            return left(error({ error: ERR_PARSERS_QUERY }));

        if (!isObject(req.query))
            return left(badRequest({ error: ERR_PAYLOAD_INVALID }));

        return right(req);
    }

    static forUpdate(req: Request): Either<Action<void>, Request> {
        if (!Preconditions.hasParser(req, KEY_PARSERS_BODY))
            return left(error({ error: ERR_PARSERS_BODY }));

        if (!isObject(req.body))
            return left(conflict({ error: ERR_PAYLOAD_INVALID }));

        if (!req.params.id) return left(notFound());

        return right(req);
    }

    static isValidQuery(req: Request): boolean {
        return (
            Preconditions.hasParser(req, KEY_PARSERS_QUERY) &&
            isObject(req.query)
        );
    }

    static forGet(req: Request): Either<Action<void>, Request> {
        if (!req.params.id) return left(notFound());

        return right(req);
    }
}

/**
 * ApiController provides a base class for CSUGR operations.
 *
 * This class is meant to be extended to be specialized to the particular
 * underlying database platform by providing a specialized ModelProvider
 * instance.
 *
 * The connection is automatically checked out using the value of the conn
 * constructor parameter but can be overridden by setting the constant
 * KEY_CONNECTION as a route tag. The model is determined by setting the
 * KEY_MODEL_NAME tag.
 * Each route has a set of preconditions that must pass before the operation
 * is executed, these are implemented in an internal Preconditions class. In
 * particular, the query and body properties must be suitably verified before
 * being used by the route in question. This is to prevent accidentally
 * inputting unchecked user input into databases.
 *
 * Code verifying the body and query values must set the respective
 * KEY_PARSERS_* constant value in order for the routes to execute. This
 * behaviour can be overridden if the environment variable
 * QTL_API_CONTROLLER_SKIP_PARSER_CHECKS is set. The requirements by route are
 * as follows:
 *
 * create:
 *  KEY_PARSERS_BODY
 * search:
 *  KEY_PARSERS_QUERY
 * update:
 *  KEY_PARSERS_BODY
 *  KEY_PARSERS_QUERY (optional)
 * get:
 *  KEY_PARSERS_QUERY (optional)
 * remove:
 *  KEY_PARSERS_QUERY (optional)
 *
 * @typeParam C - The connection type the controller uses.
 */
export abstract class ApiController<C> implements Resource {
    /**
     * @param conn        - This id of the pooled connection that will be
     *                      checked out before each operation.
     * @param models      - Provider for model instances.
     * @param strategy    - The SearchStrategy to use for searches.
     *
     */
    constructor(
        public conn: string,
        public models: ModelProvider<Object, C>,
        public strategy: SearchStrategy
    ) {}

    /**
     * @internal
     */
    getModel(req: Request): Future<Model<Object>> {
        let that = this;

        return doFuture(function* () {
            let name = String(req.prs.getOrElse(KEY_CONNECTION, 'main'));

            let mconn = yield getUserConnection(name);

            if (mconn.isNothing())
                return raise(
                    new Error(`getModel(): Unknown connection "${name}"!`)
                );

            let modelName = <string>req.prs.getOrElse(KEY_MODEL_NAME, '');

            return pure(that.models.getInstance(mconn.get(), modelName));
        });
    }

    create(req: Request): Action<void> {
        let that = this;

        return doAction(function* () {
            let checked = Preconditions.forCreate(req);

            if (checked.isLeft()) return checked.takeLeft();

            let model = yield fork(that.getModel(req));

            let id = yield fork(model.create(<Object>req.body));

            return created({ data: { id } });
        });
    }

    search(req: Request): Action<void> {
        let that = this;

        return doAction(function* () {
            let checked = Preconditions.forSearch(req);

            if (checked.isLeft()) return checked.takeLeft();

            let model = yield fork(that.getModel(req));

            return ok(yield fork(that.strategy.execute(model, req.query)));
        });
    }

    update(req: Request): Action<void> {
        let that = this;

        return doAction(function* () {
            let checked = Preconditions.forUpdate(req);

            if (checked.isLeft()) return checked.takeLeft();

            if (empty(<Object>req.body)) return ok();

            let model = yield fork(that.getModel(req));

            let query = Preconditions.isValidQuery(req) ? req.query : {};

            let yes = yield fork(
                model.update(req.params.id, <Object>req.body, query)
            );

            return yes ? ok() : notFound();
        });
    }

    get(req: Request): Action<void> {
        let that = this;

        return doAction(function* () {
            let checked = Preconditions.forGet(req);

            if (checked.isLeft()) return checked.takeLeft();

            let model = yield fork(that.getModel(req));

            let query = Preconditions.isValidQuery(req) ? req.query : {};

            let mdoc = yield fork(model.get(req.params.id, query));

            return mdoc.isJust() ? ok(mdoc.get()) : notFound();
        });
    }

    remove(req: Request): Action<void> {
        let that = this;

        return doAction(function* () {
            let checked = Preconditions.forGet(req);

            if (checked.isLeft()) return checked.takeLeft();

            let model = yield fork(that.getModel(req));

            let query = Preconditions.isValidQuery(req) ? req.query : {};

            let yes = yield fork(model.remove(req.params.id, query));

            return yes ? ok() : notFound();
        });
    }
}
