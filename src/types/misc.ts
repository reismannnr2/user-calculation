import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import { CalcNode, calcNode } from './nodes';

const varDef = t.record(t.string, t.union([calcNode, t.string, t.number, t.boolean, t.null, tt.JsonArray]));
export type VarDef = t.TypeOf<typeof varDef>;

export const calcEnv = t.type({
  vars: varDef,
});
export type CalcEnv = t.TypeOf<typeof calcEnv>;
export type VarType = CalcEnv['vars'][string];

export const customFnDef = t.type({
  type: t.literal('custom-fn'),
  expr: t.string,
  varNames: t.array(t.string),
  localVars: varDef,
});
export type CustomFnDef = t.TypeOf<typeof customFnDef>;
