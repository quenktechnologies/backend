/**
 * This module provides a framework for building a back-end workflow to simple 
 * username and password based authentication forms.
 */
import { Value, Object } from '@quenk/noni/lib/data/jsonx';
import { Future, doFuture, pure } from '@quenk/noni/lib/control/monad/future';
import { Either } from '@quenk/noni/lib/data/either';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { left, right } from '@quenk/noni/lib/data/either';

import { Precondition } from '@quenk/preconditions';

import { View } from '@quenk/wml';

import { Request } from '@quenk/tendril/lib/app/api/request';
import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { fork, next } from '@quenk/tendril/lib/app/api/control';
import { redirect, unauthorized } from '@quenk/tendril/lib/app/api/response';

import { render } from '../views/engine/wml';

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
    failed: boolean,

    /**
     * credentials (raw) received from the user.
     */
    credentials: Object

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
    authenticate(req: Request): Future<AuthResult>

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

        let that = this;

        return doFuture(function*() {

            let elogin = that.validate(req.body);

            if (elogin.isLeft())
                return pure(<AuthResult>left({
                    failed: true, credentials: req.body
                }));

            let muser = yield that.getUser(<Object>elogin.takeRight());

            return pure(<AuthResult>(muser.isNothing() ?
                left({ failed: true, credentials: req.body }) :
                right(muser.get())));

        });

    }

}

/**
 * AuthController provides a workflow for requring authentication before a user
 * accesses a protected resource.
 *
 * The resource is assumed to be the index of the site but can be any page 
 * desired. When a user attempts to access this resource, an existing 
 * authenticated session is checked for and implementor defined action is taken
 * based on the result.
 *
 * This class provides route endpoints for a form based authentication workflow.
 * It is designed with the intention of serving a Single Page Application (SPA) 
 * but can be used to authenticate a regular website as well.
 *
 * The various on* methods here are each meant to serve a particular route in 
 * the authentication workflow.
 */
export abstract class AuthController {

    /**
     * authenticator used to authenticate users on request.
     */
    abstract authenticator: Authenticator;


    /**
     * views holds the various views used for this workflow
     */
    abstract views: {

        /**
         * index is the view to render when authentication is successful.
         */
        index: (req: Request) => View,

        /**
         * form is the view to render to display the login form.
         */
        form: (req: Request, ctx: AuthFailedContext) => View

    }

    /**
     * urls used when redirecting the user based on the authentication attempt
     * result
     */
    urls = {

        /**
         * form is the URL to use when redirecting to the form.
         */
        form: '/login',

        /**
         * index is the URL to use when redirecting to the protected resource.
         */
        index: '/'

    }

    /**
     * userSessionKey is the session value to store the user data in.
     */
    userSessionKey = 'user';

    /**
     * authContextKey is the session key used to store metadata between a failed
     * auth attempt and the login form.
     */
    authContextKey = 'auth';

    /**
     * ensureAuth produces a filter that can be included in a route to ensure
     * the user is authenticated before proceeding.
     *
     * @param isXHR - If true, responds with a status code only on failure,
     *                redirects to the auth form otherwise.
     */
    ensureAuth = (isXHR = false) => (req: Request): Action<void> => {

        if (req.session.exists(this.userSessionKey)) return next(req);

        return isXHR ? unauthorized() : this.redirect(this.urls.form, 302);

    }

    /**
     * userDetected is called when a user visits the resource and is 
     * already properly authenticated.
     *
     * By default it shows the protected resource.
     */
    userDetected(req: Request): Action<void> {

        return this.show(this.views.index(req));

    }

    /**
     * userNotDetected is called when a users visits the resource and is not
     * authenticated.
     *
     * By default it redirects to the login form.
     */
    userNotDetected(_: Request): Action<void> {

        return this.redirect(this.urls.form, 302);

    }

    /**
     * userAuthenticated is called when the user has been successfully 
     * authenticated.
     *
     * By default it redirects to the protected resource.
     */
    userAuthenticated(_: Request): Action<void> {

        return this.redirect(this.urls.index, 302);

    }

    /**
     * userUnAuthenticated is called when the user logs out.
     *
     * By default it redirects to the login form.
     */
    userUnAuthenticated(_: Request): Action<void> {

        return this.redirect(this.urls.form, 302);

    }

    /**
     * onIndex displays the index page of the application if the user is 
     * properly authenticated.
     *
     * If not, the user will be redirected to the login page.
     */
    onIndex(req: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            let muser = req.session.get(that.userSessionKey);

            if (muser.isJust()) {

                return that.userDetected(req);

            } else {

                return that.userNotDetected(req);

            }

        });

    }

    /**
     * onAuthForm renders the form for authentication.
     */
    onAuthForm(req: Request): Action<void> {

        let ctx = <AuthFailedContext>req.session.getOrElse(this.authContextKey,
            { failed: false, credentials: {} });

        return this.show(this.views.form(req, ctx));

    }

    /**
     * onAuthenticate handles the authentication (POST) request sent by the 
     * user to authenticate.
     */
    onAuthenticate(req: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            let euser = yield fork(that.authenticator.authenticate(req));

            if (euser.isLeft()) {

                req.session.setWithDescriptor(that.authContextKey,
                    euser.takeLeft(), { ttl: 1 });

                return that.redirect(that.urls.form, 303)

            }

            req.session.set(that.userSessionKey, euser.takeRight());

            return that.userAuthenticated(req);

        });

    }

    /**
     * onLogout destroys the user's authenticated session.
     *
     * This should be used on a POST route.
     */
    onLogout(req: Request): Action<void> {

        let that = this;

        return doAction(function*() {

            yield fork(req.session.destroy());

            return that.userUnAuthenticated(req);

        });

    }

    /**
     * show helper for rendering View content.
     */
    show(view: View, status: number = 200): Action<void> {

        return render(view, status);

    }

    /**
     * redirect helper for redirecting the user.
     */
    redirect(url: string, code: number = 302, abort = true): Action<void> {

        return redirect(url, code, abort);

    }

}
