import { View } from '@quenk/wml';
import { Request } from '@quenk/tendril/lib/app/api/request';
import { Action } from '@quenk/tendril/lib/app/api';
import { Authenticator, AuthFailedContext } from './authenticator';
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
