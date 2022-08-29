import * as headers from '@quenk/tendril/lib/net/http/headers';

import { View } from '@quenk/wml';

import { Type  } from '@quenk/noni/lib/data/type';
import {
    Future,
    doFuture,
    fromExcept,
    attempt,
    pure
} from '@quenk/noni/lib/control/monad/future';
import { interp, Path } from '@quenk/noni/lib/platform/node/module/pointer';
import { liftF } from '@quenk/noni/lib/control/monad/free';

import { Action, Api, Context } from '@quenk/tendril/lib/app/api';
import { Content } from '@quenk/tendril/lib/app/show';

/**
 * @private
 */
export class Render<A> extends Api<A> {

    constructor(
        public view: View,
        public status: number,
        public next: A) { super(next); }

    map<B>(f: (a: A) => B): Render<B> {

        return new Render(this.view, this.status, f(this.next));

    }

    exec(ctx: Context<A>): Future<A> {

        let { response  } = ctx;
        let { view, status, next } = this;

        response.set(headers.CONTENT_TYPE, 'text/html');
        response.status(status);
        response.write((<HTMLElement>view.render()).outerHTML);
        response.end();
        return <Future<A>>pure(next);

    }

}

/**
 * render sends the result of a WML View to the requesting client.
 */
export const render = (view: View, status: number = 200): Action<void> =>
    liftF(new Render(view, status, undefined));

/**
 * show is like render but retrieves the view from the path specified.
 */
export const show = (path: Path, ctx: object = {}) =>
    doFuture<Content>(function*() {

        let eCons = interp(path, require);

        if (eCons.isLeft()) {

            return fromExcept(eCons);

        }

        let Cons = <Type>eCons.takeRight();

        let view: View = yield attempt(() => new Cons(ctx));

        return pure(<Content>{

            type: 'text/html',

            content: (<HTMLElement>view.render()).outerHTML

        });

    });
