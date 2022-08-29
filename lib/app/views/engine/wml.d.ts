import { View } from '@quenk/wml';
import { Future } from '@quenk/noni/lib/control/monad/future';
import { Path } from '@quenk/noni/lib/platform/node/module/pointer';
import { Action, Api, Context } from '@quenk/tendril/lib/app/api';
import { Content } from '@quenk/tendril/lib/app/show';
/**
 * @private
 */
export declare class Render<A> extends Api<A> {
    view: View;
    status: number;
    next: A;
    constructor(view: View, status: number, next: A);
    map<B>(f: (a: A) => B): Render<B>;
    exec(ctx: Context<A>): Future<A>;
}
/**
 * render sends the result of a WML View to the requesting client.
 */
export declare const render: (view: View, status?: number) => Action<void>;
/**
 * show is like render but retrieves the view from the path specified.
 */
export declare const show: (path: Path, ctx?: object) => Future<Content>;
