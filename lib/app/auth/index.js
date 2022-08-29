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
 * AuthController provides a workflow for authenticating a user. It is designed
 * with the intention of serving an Single Page Application (SPA) but can be
 * used to authenticate a regular website as well.
 *
 * The various on* methods here are each meant to serve a particular route in
 * an application's authentication workflow.
 */
class AuthController {
    constructor() {
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
         * checkAuth produces a filter that can be included in a route to ensure
         * the user is authenticated before proceeding.
         *
         * @param isXHR - If true, responds with a status code only on failure,
         *                redirects to the auth form otherwise.
         */
        this.checkAuth = (isXHR = false) => (req) => {
            if (req.session.exists(this.userSessionKey))
                return (0, control_1.next)(req);
            return isXHR ? (0, response_1.unauthorized)() : (0, response_1.redirect)(this.urls.form, 302);
        };
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
                return (0, wml_1.render)(that.views.index(req));
            }
            else {
                return (0, response_1.redirect)(that.urls.form, 302);
            }
        });
    }
    /**
     * onAuthForm renders the form for authentication.
     */
    onAuthForm(req) {
        let ctx = req.session.getOrElse(this.authContextKey, { failed: false, credentials: {} });
        return (0, wml_1.render)(this.views.form(req, ctx));
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
                return (0, response_1.redirect)(that.urls.form, 303);
            }
            req.session.set(that.userSessionKey, euser.takeRight());
            return (0, response_1.redirect)(that.urls.index, 302);
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
            return (0, response_1.redirect)(that.urls.form, 302);
        });
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=index.js.map