import { err, none, ok, Option, Result, some, Ok, None } from '@reismannnr2/async-result';

type HasLength = { length: number };
export type ParserResult<S extends HasLength, T> = Result<Option<[S, T]>, Error>;
export type Parser<S extends HasLength, T> = (stream: S) => ParserResult<S, T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParserOutput<P> = P extends Parser<any, infer T> ? T : never;

export const success = <S extends HasLength, T>(stream: S, value: T): ParserResult<S, T> => ok(some([stream, value]));
export const fail = <S extends HasLength, T>(): ParserResult<S, T> => ok(none());

export const successThen = <S extends HasLength, T, R, R2>(
  result: ParserResult<S, T>,
  then: (args: [S, T]) => R,
  orDefault: (result: ParserResult<S, T>, op: Option<[S, T]>) => R2,
): ParserResult<S, T> | R | R2 => {
  if (result.isErr) {
    return result;
  }
  const op = result.value;
  if (op.isNone) {
    return orDefault(result, op);
  }
  return then(op.value);
};

export const not =
  <S extends HasLength, T>(parser: Parser<S, T>): Parser<S, void> =>
  (stream) =>
    parser(stream).map((op) =>
      op.match<Option<[S, void]>>({ some: () => none(), none: () => some([stream, undefined]) }),
    );
export const or =
  <S extends HasLength, H, PS extends Parser<S, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
    head: Parser<S, H>,
    ...tail: PS
  ): Parser<S, H | ParserOutput<PS[number]>> =>
  (stream) => {
    let r = head(stream);
    for (const parser of tail) {
      if (r.isErr) {
        return r;
      }
      const op = r.value;
      if (op.isSome) {
        return r;
      }
      r = parser(stream);
    }
    return r;
  };

export const cat =
  <S extends HasLength, H, PS extends Parser<S, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
    head: Parser<S, H>,
    ...tail: [...PS]
  ): Parser<S, [H, ...{ [K in keyof PS]: ParserOutput<PS[K]> }]> =>
  (stream) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let r: ParserResult<S, any[]> = head(stream).map((op) => op.map(([rest, v]) => [rest, [v]]));
    for (const parser of tail) {
      if (r.isErr) {
        return r.never();
      }
      const op = r.value;
      if (op.isNone) {
        return r as Ok<None>;
      }
      const [rest, list] = op.value;
      r = parser(rest).map((op) => op.map(([rest, v]) => [rest, [...list, v]]));
    }
    return r as ParserResult<S, [H, ...{ [K in keyof PS]: ParserOutput<PS[K]> }]>;
  };

interface Rep {
  <S extends HasLength, T>(parser: Parser<S, T>, min: 1, max?: number): Parser<S, [T, ...T[]]>;
  <S extends HasLength, T>(parser: Parser<S, T>, min?: number, max?: number): Parser<S, T[]>;
}

export const rep: Rep =
  <S extends HasLength, T>(parser: Parser<S, T>, min = 0, max = Number.POSITIVE_INFINITY) =>
  (stream: S) => {
    if (min > max || min < 0) {
      return err(new Error('Invalid Repeater')).never();
    }
    const rs: T[] = [];
    let rest: S = stream;
    for (let i = 0; i < max && rest.length > 0; i++) {
      const r = parser(rest);
      if (r.isErr) {
        return r.never();
      }
      const op = r.value;
      if (op.isNone) {
        break;
      }
      const nextItems = op.value;
      rest = nextItems[0];
      rs.push(nextItems[1]);
    }
    if (rs.length < min) {
      return fail<S, [T, ...T[]]>();
    }
    return success(rest, rs as [T, ...T[]]);
  };
export const map =
  <S extends HasLength, T, U>(parser: Parser<S, T>, transform: (v: T) => U): Parser<S, U> =>
  (stream) =>
    parser(stream).map((op) => op.map(([rest, v]) => [rest, transform(v)]));
export const diff =
  <S extends HasLength, T>(parser: Parser<S, T>, other: Parser<S, unknown>): Parser<S, T> =>
  (stream: S) => {
    return map(cat<S, void, [Parser<S, T>]>(not(other), parser), ([, r]) => r)(stream);
  };
export const list =
  <S extends HasLength, T>(element: Parser<S, T>, delimiter: Parser<S, unknown>): Parser<S, T[]> =>
  (stream) => {
    return map(cat<S, T, [Parser<S, [unknown, T][]>]>(element, rep(cat(delimiter, element))), ([first, rest]) => [
      first,
      ...rest.map(([, r]) => r),
    ])(stream);
  };
