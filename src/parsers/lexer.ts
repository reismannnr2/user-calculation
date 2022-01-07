import { BaseParser, or, success, fail } from '../common/combinator';
import {
  spChars,
  CalcToken,
  FnToken,
  LambdaVarToken,
  PropNameToken,
  SpCharToken,
  ValueToken,
  VarToken,
} from '../types/tokens';
import { err, ok, Result } from '@reismannnr2/async-result';

type Lexer<T extends CalcToken> = BaseParser<string, T>;
const lexNum: Lexer<ValueToken> = (stream) => {
  const m = /^((\d+\.\d+(e[+-]?\d+)?)|((0[xbo])?\d+))(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[6] ?? '', { type: 'value', value: Number(m[1]) });
};
const lexStr: Lexer<ValueToken> = (stream) => {
  const start = stream[0];
  if (start !== '"' && start !== "'") {
    return fail();
  }
  const reg = start === '"' ? /^"(([^"]|"")+)"(.*)/ : /^'(([^']|'')+)'(.*)/;
  const m = reg.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[3] ?? '', { type: 'value', value: m[1].replaceAll(start + start, start) });
};
const lexPropName: Lexer<PropNameToken> = (stream) => {
  const m = /^([A-Za-z_][0-9A-Za-z_]*)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'prop-name', name: m[1] ?? '' });
};
const lexVar: Lexer<VarToken> = (stream) => {
  const m = /^(\$[$#]?[0-9A-Za-z_]+)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'var', name: m[1] ?? '' });
};
const lexFn: Lexer<FnToken> = (stream) => {
  const m = /^(@#?[A-Za-z_][0-9A-Za-z_]*(\.[0-9A-Za-z_]+)?)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[3] ?? '', { type: 'fn', name: m[1] });
};
const lexLambdaVar: Lexer<LambdaVarToken> = (stream) => {
  const m = /^(#[0-9A-Za-z_]+)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'lambda-var', name: m[1] ?? '' });
};
const lexSpChar: Lexer<SpCharToken> = (stream) => {
  const char = spChars.find((sp) => stream.startsWith(sp));
  if (char == null) {
    return fail();
  }
  return success(stream.slice(char.length), { type: 'sp-char', char });
};

export const tokenize = (stream: string): Result<CalcToken[], Error> => {
  const lexer = or(lexNum, lexStr, lexPropName, lexFn, lexVar, lexLambdaVar, lexSpChar);
  const tokens: CalcToken[] = [];
  let rest = stream.trim();
  while (rest.length > 0) {
    const result = lexer(rest);
    if (result.isErr) {
      return result.never();
    }
    const op = result.value;
    if (op.isNone) {
      return err(new Error(``));
    }
    const [next, token] = op.value;
    tokens.push(token);
    rest = next.trim();
  }
  return ok(tokens);
};
