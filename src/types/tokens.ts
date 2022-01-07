import * as t from 'io-ts';
import { keyObject } from '../common/util';

import {
  valueNode as valueToken,
  varNode as varToken,
  fnNode as fnToken,
  lambdaVarNode as lambdaVarToken,
} from './nodes';
export { valueToken, varToken, fnToken, lambdaVarToken };
export type {
  ValueNode as ValueToken,
  VarNode as VarToken,
  FnNode as FnToken,
  LambdaVarNode as LambdaVarToken,
} from './nodes';

export const spChars = [
  '===',
  '!==',
  '==',
  '!=',
  '>=',
  '<=',
  '=>',
  '**',
  '&&',
  '||',
  '??',
  '@|',
  '@[',
  '@{',
  '@(',
  '$(',
  '>',
  '<',
  '?',
  ':',
  '!',
  '+',
  '-',
  '*',
  '/',
  '%',
  ',',
  '@',
  '$',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '|',
] as const;
export type SpChar = typeof spChars[number];

export const spCharToken = t.type({
  type: t.literal('sp-char'),
  char: t.keyof(keyObject(spChars)),
});
export type SpCharToken = t.TypeOf<typeof spCharToken>;

export const propName = t.type({
  type: t.literal('prop-name'),
  name: t.string,
});
export type PropNameToken = t.TypeOf<typeof propName>;

export const calcToken = t.union([spCharToken, propName, valueToken, varToken, fnToken, lambdaVarToken]);
export type CalcToken = t.TypeOf<typeof calcToken>;
