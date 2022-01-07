import { err, none, ok, Option, Result, some, Ok, Err, None } from '@reismannnr2/async-result';

type HasLength = { length: number };
export type BaseParserResult<S extends HasLength, T> = Result<Option<[S, T]>, Error>;
export type BaseParser<S extends HasLength, T> = (stream: S) => BaseParserResult<S, T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BaseParserOutput<P> = P extends BaseParser<any, infer T> ? T : never;

export const success = <S extends HasLength, T>(stream: S, value: T): BaseParserResult<S, T> =>
  ok(some([stream, value]));
export const fail = <S extends HasLength, T>(): BaseParserResult<S, T> => ok(none());

export const successThen = <S extends HasLength, T, R1, R2>(
  result: BaseParserResult<S, T>,
  then: (args: [S, T]) => R1,
  orDefault: (result: BaseParserResult<S, T>, op: Option<[S, T]>) => R2,
): Err<Error> | R1 | R2 => {
  if (result.isErr) {
    return result.never();
  }
  const op = result.value;
  if (op.isNone) {
    return orDefault(result, op);
  }
  return then(op.value);
};

export const not =
  <S extends HasLength, T>(parser: BaseParser<S, T>): BaseParser<S, void> =>
  (stream) =>
    parser(stream).map((op) =>
      op.match<Option<[S, void]>>({ some: () => none(), none: () => some([stream, undefined]) }),
    );
export const opt =
  <S extends HasLength, T>(parser: BaseParser<S, T>): BaseParser<S, Option<T>> =>
  (stream) => {
    return successThen(
      parser(stream),
      ([rest, v]) => success(rest, some(v)),
      () => success(stream, none()),
    );
  };
export const orDefault =
  <S extends HasLength, T>(parser: BaseParser<S, T>, defaultValue: T): BaseParser<S, T> =>
  (stream) => {
    return map(opt(parser), (op) => op.unwrapOr(defaultValue))(stream);
  };

export const or =
  <S extends HasLength, H, PS extends BaseParser<S, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
    head: BaseParser<S, H>,
    ...tail: PS
  ): BaseParser<S, H | BaseParserOutput<PS[number]>> =>
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
  <S extends HasLength, H, PS extends BaseParser<S, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
    head: BaseParser<S, H>,
    ...tail: [...PS]
  ): BaseParser<S, [H, ...{ [K in keyof PS]: BaseParserOutput<PS[K]> }]> =>
  (stream) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let r: BaseParserResult<S, any[]> = head(stream).map((op) => op.map(([rest, v]) => [rest, [v]]));
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
    return r as BaseParserResult<S, [H, ...{ [K in keyof PS]: BaseParserOutput<PS[K]> }]>;
  };

interface Rep {
  <S extends HasLength, T>(parser: BaseParser<S, T>, min: 1, max?: number): BaseParser<S, [T, ...T[]]>;
  <S extends HasLength, T>(parser: BaseParser<S, T>, min?: number, max?: number): BaseParser<S, T[]>;
}

export const rep: Rep =
  <S extends HasLength, T>(parser: BaseParser<S, T>, min = 0, max = Number.POSITIVE_INFINITY) =>
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
  <S extends HasLength, T, U>(parser: BaseParser<S, T>, transform: (v: T) => U): BaseParser<S, U> =>
  (stream) =>
    parser(stream).map((op) => op.map(([rest, v]) => [rest, transform(v)]));
export const diff =
  <S extends HasLength, T>(parser: BaseParser<S, T>, other: BaseParser<S, unknown>): BaseParser<S, T> =>
  (stream: S) => {
    return map(cat<S, void, [BaseParser<S, T>]>(not(other), parser), ([, r]) => r)(stream);
  };
export const list =
  <S extends HasLength, T>(element: BaseParser<S, T>, delimiter: BaseParser<S, unknown>): BaseParser<S, T[]> =>
  (stream) => {
    return map(cat<S, T, [BaseParser<S, [unknown, T][]>]>(element, rep(cat(delimiter, element))), ([first, rest]) => [
      first,
      ...rest.map(([, r]) => r),
    ])(stream);
  };

export const mayContinue =
  <S extends HasLength, T, R>(
    pre: BaseParser<S, T>,
    f: (args: [S, T]) => BaseParserResult<S, R>,
  ): BaseParser<S, T | R> =>
  (stream) => {
    const first = pre(stream);
    return successThen(
      first,
      (args) => {
        const result = f(args);
        return successThen(
          result,
          () => result,
          () => first,
        );
      },
      () => first,
    );
  };
