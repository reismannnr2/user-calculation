import { Parser, success, fail, or } from './combinator';
import { err, ok, Result } from '@reismannnr2/async-result';

export const specials = [
  '!==',
  '===',
  '!=',
  '==',
  '(',
  ')',
  '[',
  ']',
  '+',
  '-',
  '**',
  '*',
  '/',
  '%',
  '!',
  '<=',
  '<',
  '>=',
  '>',
  ',',
  '&&',
  '||',
  '$(',
  '@(',
  '@[',
  '@{',
  '@|',
  '|',
  '=>',
  '{',
  '}',
  ':',
] as const;

export type SpChar = {
  type: 'sp-char';
  value: typeof specials[number];
};
export type StringLiteral = {
  type: 'string-literal';
  value: string;
};
export type NumberLiteral = {
  type: 'number-literal';
  value: number;
};
export type VarToken = {
  type: 'var';
  name: string;
};
export type LambdaVarToken = {
  type: 'lambda-var';
  name: string;
};
export type FnStartToken = {
  type: 'fn-start';
  name: string;
};
export type RawIdentifier = {
  type: 'raw-identifier';
  name: string;
};

export type LexToken =
  | SpChar
  | StringLiteral
  | NumberLiteral
  | VarToken
  | FnStartToken
  | LambdaVarToken
  | RawIdentifier;

export type Lexer<L extends LexToken = LexToken> = Parser<string, L>;
const lexNum: Lexer<NumberLiteral> = (stream) => {
  const m = /^((\d+\.\d+(e[+-]?\d+)?)|((0[xbo])?\d+))(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[6] ?? '', { type: 'number-literal', value: Number(m[1]) });
};
const lexIdentifier: Lexer<RawIdentifier> = (stream) => {
  const m = /^([A-Za-z_][0-9A-Za-z_]+)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'raw-identifier', name: m[1] ?? '' });
};

const lexVar: Lexer<VarToken> = (stream) => {
  const m = /^(\$[$#]?[0-9A-Za-z_]+)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'var', name: m[1] ?? '' });
};
const lexLambdaVar: Lexer<LambdaVarToken> = (stream) => {
  const m = /^(#[0-9A-Za-z_]+)(.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[2] ?? '', { type: 'lambda-var', name: m[1] ?? '' });
};
const lexFn: Lexer<FnStartToken> = (stream) => {
  const m = /^(@#?[A-Za-z_][0-9A-Za-z_]*(\.[0-9A-Za-z_]+)?)\((.*)/.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[3] ?? '', { type: 'fn-start', name: m[1] });
};
const lexStr: Lexer<StringLiteral> = (stream) => {
  const start = stream[0];
  if (start !== '"' && start !== "'") {
    return fail();
  }
  const reg = start === '"' ? /^"(([^"]|"")+)"(.*)/ : /^'(([^']|'')+)'(.*)/;
  const m = reg.exec(stream);
  if (m == null) {
    return fail();
  }
  return success(m[3] ?? '', { type: 'string-literal', value: m[1].replaceAll(start + start, start) });
};
const lexSpChar: Lexer<SpChar> = (stream) => {
  const c = specials.find((sp) => stream.startsWith(sp));
  if (c == undefined) {
    return fail();
  }
  const rest = stream.substring(c.length);
  return success(rest, { type: 'sp-char', value: c });
};
export const tokenize = (stream: string): Result<LexToken[], Error> => {
  const lexer = or(lexNum, lexVar, lexIdentifier, lexLambdaVar, lexFn, lexStr, lexSpChar);
  const tokens: LexToken[] = [];
  let rest = stream.trim();
  while (rest.length > 0) {
    const r = lexer(rest);
    if (r.isErr) {
      return r.never();
    }
    const op = r.value;
    if (op.isNone) {
      return err(new Error(`LexError: invalid string starts with ${rest.substring(10)} ...`));
    }
    const [next, token] = op.value;
    tokens.push(token);
    rest = next.trim();
  }
  return ok(tokens);
};

export default undefined;
