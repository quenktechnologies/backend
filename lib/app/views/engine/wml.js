"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.show = exports.render = exports.Render = void 0;
const headers = require("@quenk/tendril/lib/net/http/headers");
const future_1 = require("@quenk/noni/lib/control/monad/future");
const pointer_1 = require("@quenk/noni/lib/platform/node/module/pointer");
const free_1 = require("@quenk/noni/lib/control/monad/free");
const api_1 = require("@quenk/tendril/lib/app/api");
/**
 * @private
 */
class Render extends api_1.Api {
    constructor(view, status, next) {
        super(next);
        this.view = view;
        this.status = status;
        this.next = next;
    }
    map(f) {
        return new Render(this.view, this.status, f(this.next));
    }
    exec(ctx) {
        let { response } = ctx;
        let { view, status, next } = this;
        response.set(headers.CONTENT_TYPE, 'text/html');
        response.status(status);
        response.write(view.render().outerHTML);
        response.end();
        return (0, future_1.pure)(next);
    }
}
exports.Render = Render;
/**
 * render sends the result of a WML View to the requesting client.
 */
const render = (view, status = 200) => (0, free_1.liftF)(new Render(view, status, undefined));
exports.render = render;
/**
 * show is like render but retrieves the view from the path specified.
 */
const show = (path, ctx = {}) => (0, future_1.doFuture)(function* () {
    let eCons = (0, pointer_1.interp)(path, require);
    if (eCons.isLeft()) {
        return (0, future_1.fromExcept)(eCons);
    }
    let Cons = eCons.takeRight();
    let view = yield (0, future_1.attempt)(() => new Cons(ctx));
    return (0, future_1.pure)({
        type: 'text/html',
        content: view.render().outerHTML
    });
});
exports.show = show;
//# sourceMappingURL=wml.js.map