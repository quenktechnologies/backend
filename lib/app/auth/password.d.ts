import { Future } from '@quenk/noni/lib/control/monad/future';
/**
 * compare two bcrypt hashed passwords for equality.
 */
export declare const compare: (pwd1: string, pwd2: string) => Future<boolean>;
