/**
 * This module provides a framework for building a back-end workflow to simple
 * username and password based authentication forms.
 */
import { Value, Object } from '@quenk/noni/lib/data/jsonx';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Either } from '@quenk/noni/lib/data/either';
import { Maybe } from '@quenk/noni/lib/data/maybe';
import { Precondition } from '@quenk/preconditions';
import { View } from '@quenk/wml';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { Action } from '@quenk/tendril/lib/app/api';
/**
 * AuthResult that is either a set of context values that can
 * be used by a login form when authentication fails or on the right side,
 * a representation of the user when successful.
 */
export declare type AuthResult = Either<AuthFailedContext, UserData>;
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
export declare type UserData = Object;
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
export declare abstract class BaseAuthenticator<T extends Object> {
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
    authenticate(req: Request): Future<AuthResult>;
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
export declare abstract class AuthController {
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
        index: (req: Request) => View;
        /**
         * form is the view to render to display the login form.
         */
        form: (req: Request, ctx: AuthFailedContext) => View;
    };
    /**
     * urls used when redirecting the user based on the authentication attempt
     * result
     */
    urls: {
        /**
         * form is the URL to use when redirecting to the form.
         */
        form: string;
        /**
         * index is the URL to use when redirecting to the protected resource.
         */
        index: string;
    };
    /**
     * userSessionKey is the session value to store the user data in.
     */
    userSessionKey: string;
    /**
     * authContextKey is the session key used to store metadata between a failed
     * auth attempt and the login form.
     */
    authContextKey: string;
    /**
     * ensureAuth produces a filter that can be included in a route to ensure
     * the user is authenticated before proceeding.
     *
     * @param isXHR - If true, responds with a status code only on failure,
     *                redirects to the auth form otherwise.
     */
    ensureAuth: (isXHR?: boolean) => (req: Request) => Action<void>;
    /**
     * userDetected is called when a user visits the resource and is
     * already properly authenticated.
     *
     * By default it shows the protected resource.
     */
    userDetected(req: Request): Action<void>;
    /**
     * userNotDetected is called when a users visits the resource and is not
     * authenticated.
     *
     * By default it redirects to the login form.
     */
    userNotDetected(_: Request): Action<void>;
    /**
     * userAuthenticated is called when the user has been successfully
     * authenticated.
     *
     * By default it redirects to the protected resource.
     */
    userAuthenticated(_: Request): Action<void>;
    /**
     * userUnAuthenticated is called when the user logs out.
     *
     * By default it redirects to the login form.
     */
    userUnAuthenticated(_: Request): Action<void>;
    /**
     * onIndex displays the index page of the application if the user is
     * properly authenticated.
     *
     * If not, the user will be redirected to the login page.
     */
    onIndex(req: Request): Action<void>;
    /**
     * onAuthForm renders the form for authentication.
     */
    onAuthForm(req: Request): Action<void>;
    /**
     * onAuthenticate handles the authentication (POST) request sent by the
     * user to authenticate.
     */
    onAuthenticate(req: Request): Action<void>;
    /**
     * onLogout destroys the user's authenticated session.
     *
     * This should be used on a POST route.
     */
    onLogout(req: Request): Action<void>;
    /**
     * show helper for rendering View content.
     */
    show(view: View, status?: number): Action<void>;
    /**
     * redirect helper for redirecting the user.
     */
    redirect(url: string, code?: number, abort?: boolean): Action<void>;
}
