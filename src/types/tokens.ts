import * as t from 'io-ts';
import { keyObject } from '../common/util';

export {
  valueNode as valueToken,
  varNode as varToken,
  fnNode as fnToken,
  lambdaVarNode as lambdaVarToken,
} from './nodes';
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
  '**',
  '&&',
  '||',
  '??',
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
] as const;
export type SpChar = typeof spChars[number];

export const spCharToken = t.type({
  type: t.literal('sp-char'),
  char: t.keyof(keyObject(spChars)),
});
export type SpCharToken = t.TypeOf<typeof spCharToken>;

export const identifierToken = t.type({
  type: t.literal('identifier'),
  value: t.string,
});
export type IdentifierToken = t.TypeOf<typeof identifierToken>;
