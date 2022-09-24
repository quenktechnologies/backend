import { View } from '@quenk/wml';

import { Request } from '@quenk/tendril/lib/app/api/request';
import { Action, doAction } from '@quenk/tendril/lib/app/api';
import { fork, next } from '@quenk/tendril/lib/app/api/control';
import { redirect, unauthorized } from '@quenk/tendril/lib/app/api/response';

import { render } from '../views/engine/wml';
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
     */
    ensureAuth = (req: Request): Action<void> => {

        if (req.session.exists(this.userSessionKey)) return next(req);

        return this.redirect(this.urls.form, 302);

    }

    /**
     * ensureAuthXHR is ensureAuth for XHR routes.
     */
    ensureAuthXHR =  (req: Request): Action<void> => {

        if (req.session.exists(this.userSessionKey)) return next(req);

        return unauthorized();

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
