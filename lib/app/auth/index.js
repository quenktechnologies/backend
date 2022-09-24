"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.BaseAuthenticator = void 0;
const future_1 = require("@quenk/noni/lib/control/monad/future");
const either_1 = require("@quenk/noni/lib/data/either");
const api_1 = require("@quenk/tendril/lib/app/api");
const control_1 = require("@quenk/tendril/lib/app/api/control");
const response_1 = require("@quenk/tendril/lib/app/api/response");
const wml_1 = require("../views/engine/wml");
/**
 * BaseAuthenticator provides a base Authenticator implementation that can be
 * extended by implementers.
 */
class BaseAuthenticator {
    authenticate(req) {
        let that = this;
        return (0, future_1.doFuture)(function* () {
            let elogin = that.validate(req.body);
            if (elogin.isLeft())
                return (0, future_1.pure)((0, either_1.left)({
                    failed: true, credentials: req.body
                }));
            let muser = yield that.getUser(elogin.takeRight());
            return (0, future_1.pure)((muser.isNothing() ?
                (0, either_1.left)({ failed: true, credentials: req.body }) :
                (0, either_1.right)(muser.get())));
        });
    }
}
exports.BaseAuthenticator = BaseAuthenticator;
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
class AuthController {
    constructor() {
        /**
         * urls used when redirecting the user based on the authentication attempt
         * result
         */
        this.urls = {
            /**
             * form is the URL to use when redirecting to the form.
             */
            form: '/login',
            /**
             * index is the URL to use when redirecting to the protected resource.
             */
            index: '/'
        };
        /**
         * userSessionKey is the session value to store the user data in.
         */
        this.userSessionKey = 'user';
        /**
         * authContextKey is the session key used to store metadata between a failed
         * auth attempt and the login form.
         */
        this.authContextKey = 'auth';
        /**
         * ensureAuth produces a filter that can be included in a route to ensure
         * the user is authenticated before proceeding.
         *
         * @param isXHR - If true, responds with a status code only on failure,
         *                redirects to the auth form otherwise.
         */
        this.ensureAuth = (isXHR = false) => (req) => {
            if (req.session.exists(this.userSessionKey))
                return (0, control_1.next)(req);
            return isXHR ? (0, response_1.unauthorized)() : this.redirect(this.urls.form, 302);
        };
    }
    /**
     * userDetected is called when a user visits the resource and is
     * already properly authenticated.
     *
     * By default it shows the protected resource.
     */
    userDetected(req) {
        return this.show(this.views.index(req));
    }
    /**
     * userNotDetected is called when a users visits the resource and is not
     * authenticated.
     *
     * By default it redirects to the login form.
     */
    userNotDetected(_) {
        return this.redirect(this.urls.form, 302);
    }
    /**
     * userAuthenticated is called when the user has been successfully
     * authenticated.
     *
     * By default it redirects to the protected resource.
     */
    userAuthenticated(_) {
        return this.redirect(this.urls.index, 302);
    }
    /**
     * userUnAuthenticated is called when the user logs out.
     *
     * By default it redirects to the login form.
     */
    userUnAuthenticated(_) {
        return this.redirect(this.urls.form, 302);
    }
    /**
     * onIndex displays the index page of the application if the user is
     * properly authenticated.
     *
     * If not, the user will be redirected to the login page.
     */
    onIndex(req) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            let muser = req.session.get(that.userSessionKey);
            if (muser.isJust()) {
                return that.userDetected(req);
            }
            else {
                return that.userNotDetected(req);
            }
        });
    }
    /**
     * onAuthForm renders the form for authentication.
     */
    onAuthForm(req) {
        let ctx = req.session.getOrElse(this.authContextKey, { failed: false, credentials: {} });
        return this.show(this.views.form(req, ctx));
    }
    /**
     * onAuthenticate handles the authentication (POST) request sent by the
     * user to authenticate.
     */
    onAuthenticate(req) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            let euser = yield (0, control_1.fork)(that.authenticator.authenticate(req));
            if (euser.isLeft()) {
                req.session.setWithDescriptor(that.authContextKey, euser.takeLeft(), { ttl: 1 });
                return that.redirect(that.urls.form, 303);
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
    onLogout(req) {
        let that = this;
        return (0, api_1.doAction)(function* () {
            yield (0, control_1.fork)(req.session.destroy());
            return that.userUnAuthenticated(req);
        });
    }
    /**
     * show helper for rendering View content.
     */
    show(view, status = 200) {
        return (0, wml_1.render)(view, status);
    }
    /**
     * redirect helper for redirecting the user.
     */
    redirect(url, code = 302, abort = true) {
        return (0, response_1.redirect)(url, code, abort);
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=index.js.map