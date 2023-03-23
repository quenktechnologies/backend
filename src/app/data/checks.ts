import * as encrypt from 'bcryptjs';

import { Value } from '@quenk/noni/lib/data/jsonx';
import {
    doFuture,
    fromCallback,
    Future,
    pure
} from '@quenk/noni/lib/control/monad/future';
import { generateV4 } from '@quenk/noni/lib/crypto/uuid';

import { Result, succeed } from '@quenk/preconditions/lib/result';
import { Precondition } from '@quenk/preconditions/lib/async';

/**
 * AsyncResult is a precondition result derrived from an async operation.
 */
export type AsyncResult<A, B> = Future<Result<A, B>>;

/**
 * uuid generates a v4 uuid.
 */
export const uuid: Precondition<Value, Value> = () =>
    pure(succeed(<Value>generateV4(true)));

/**
 * Salt for the bcrypt process.
 */
export type Salt = string;

/**
 * bcrypt hashes a string to make it suitable to store sensitive data such as
 * passwords which need to be verified but not read back.
 */
export const password = (value: Value): AsyncResult<Value, Value> =>
    doFuture(function* () {
        let s = yield salt();

        let v = yield hash(s, <string>value);

        return pure(succeed<Value, Value>(v));
    });

const salt = (): Future<Salt> => fromCallback(cb => encrypt.genSalt(12, cb));

const hash = (salt: Salt, s: string) =>
    fromCallback(cb => encrypt.hash(s, salt, cb));
