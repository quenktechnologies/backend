import { Value, Object } from '@quenk/noni/lib/data/jsonx';
import { Future, doFuture, pure } from '@quenk/noni/lib/control/monad/future';
import { Either } from '@quenk/noni/lib/data/either';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { left, right } from '@quenk/noni/lib/data/either';

import { Precondition } from '@quenk/preconditions';

import { Request } from '@quenk/tendril/lib/app/api/request';

/**
 * AuthResult that is either a set of context values that can
 * be used by a login form when authentication fails or on the right side,
 * a representation of the user when successful.
 */
export type AuthResult = Either<AuthFailedContext, UserData>;

/**
 * AuthFailedContext can be merged into the context of the form view when
 * authentication fails to give a description of the failure
 */
export interface AuthFailedContext extends Object {
    /**
     * failed flag indicating failure.
     */
    failed: boolean;

    /**
     * credentials (raw) received from the user.
     */
    credentials: Object;
}

/**
 * UserData is a representation of an authenticated user that can be store in
 * session data upon successful authentication.
 */
export type UserData = Object;

/**
 * Authenticator is an object that knows how to determine whether an
 * authentication request is valid or not.
 *
 * The details of how to actually do that are left entirely up to implementers
 * with the return value representing whether the attempt was successful or not.
 */
export interface Authenticator {
    /**
     * authenticate the user's Request.
     */
    authenticate(req: Request): Future<AuthResult>;
}

/**
 * BaseAuthenticator provides a base Authenticator implementation that can be
 * extended by implementers.
 */
export abstract class BaseAuthenticator<T extends Object> {
    /**
     * validate the authentication request before attempting authentication.
     *
     * This property should be implemented to ensure the request is actually
     * valid, required fields are specified and data is the correct format etc.
     * It is called before passing the request body to getUser().
     */
    abstract validate: Precondition<Value, Value>;

    /**
     * getUser should be implemented to retrieve a user object from the database
     * or other data source that matches the credentials supplied.
     *
     * If a user is found then the authentication is considered successful
     * otherwise, it failed.
     */
    abstract getUser(credentials: Object): Future<Maybe<T>>;

    authenticate(req: Request): Future<AuthResult> {
        const that = this;

        return doFuture(function* () {
            const elogin = that.validate(req.body);

            if (elogin.isLeft())
                return pure(
                    <AuthResult>left({
                        failed: true,
                        credentials: req.body
                    })
                );

            const muser = yield that.getUser(<Object>elogin.takeRight());

            return pure(
                <AuthResult>(
                    (muser.isNothing()
                        ? left({ failed: true, credentials: req.body })
                        : right(muser.get()))
                )
            );
        });
    }
}
