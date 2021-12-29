import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import { InfixOp, infixOps, UnaryOp, unaryOps } from './operators';
import { keyObject } from '../common/util';

export type EvalNode =
  | ValueNode
  | VarNode
  | CalculatedVarNode
  | FnNode
  | CalculatedFnNode
  | LambdaVarNode
  | LambdaNode
  | FnCallNode
  | InfixNode
  | UnaryNode
  | ListNode
  | RecordNode
  | MemberAccessNode;
export const evalNode: t.Type<EvalNode> = t.recursion('EvalNode', () =>
  t.union([
    valueNode,
    varNode,
    calculatedVar,
    fnNode,
    calculatedFn,
    lambdaVarNode,
    lambdaNode,
    fnCallNode,
    infixNode,
    unaryNode,
    listNode,
    recordNode,
    memberAccessNode,
  ]),
);

export const valueNode = t.type({
  type: t.literal('value'),
  value: tt.Json,
});
export type ValueNode = t.TypeOf<typeof valueNode>;

export const varNode = t.type({
  type: t.literal('var'),
  name: t.string,
});
export type VarNode = t.TypeOf<typeof varNode>;

export type CalculatedVarNode = {
  type: 'calculated-var';
  name: EvalNode;
};
export const calculatedVar: t.Type<CalculatedVarNode> = t.recursion('CalculatedVarNode', () =>
  t.type({
    type: t.literal('calculated-var'),
    name: evalNode,
  }),
);

export const fnNode = t.type({
  type: t.literal('fn'),
  name: t.string,
});
export type FnNode = t.TypeOf<typeof fnNode>;

export type CalculatedFnNode = {
  type: 'calculated-fn';
  name: EvalNode;
};
export const calculatedFn: t.Type<CalculatedFnNode> = t.recursion('CalculatedFnNode', () =>
  t.type({
    type: t.literal('calculated-fn'),
    name: evalNode,
  }),
);

export const lambdaVarNode = t.type({
  type: t.literal('lambda-var'),
  name: t.string,
});
export type LambdaVarNode = t.TypeOf<typeof lambdaVarNode>;

export type LambdaNode = {
  type: 'lambda';
  identifiers: LambdaVarNode[];
  expression: EvalNode;
};
export const lambdaNode: t.Type<LambdaNode> = t.recursion('LambdaNode', () =>
  t.type({
    type: t.literal('lambda'),
    identifiers: t.array(lambdaVarNode),
    expression: evalNode,
  }),
);
export type FnCallNode = {
  type: 'fn-call';
  callee: EvalNode;
  args: EvalNode[];
};
export const fnCallNode: t.Type<FnCallNode> = t.recursion('FnCallNode', () =>
  t.type({
    type: t.literal('fn-call'),
    callee: evalNode,
    args: t.array(evalNode),
  }),
);

export type InfixNode = {
  type: 'infix';
  op: InfixOp;
  lhs: EvalNode;
  rhs: EvalNode;
};

export const infixNode: t.Type<InfixNode> = t.recursion('InfixNode', () =>
  t.type({
    type: t.literal('infix'),
    op: t.keyof(keyObject(infixOps)),
    lhs: evalNode,
    rhs: evalNode,
  }),
);

export type UnaryNode = {
  type: 'unary';
  op: UnaryOp;
  operand: EvalNode;
};

export const unaryNode: t.Type<UnaryNode> = t.recursion('UnaryNode', () =>
  t.type({
    type: t.literal('unary'),
    op: t.keyof(keyObject(unaryOps)),
    operand: evalNode,
  }),
);

export type ListNode = {
  type: 'list';
  items: EvalNode[];
};
export const listNode: t.Type<ListNode> = t.recursion('ListNode', () =>
  t.type({
    type: t.literal('list'),
    items: t.array(evalNode),
  }),
);
export type RecordNode = {
  type: 'record';
  raw: Record<string, EvalNode>;
  pairs: [EvalNode, EvalNode];
};
export const recordNode: t.Type<RecordNode> = t.recursion('RecordNode', () =>
  t.type({
    type: t.literal('record'),
    raw: t.record(t.string, evalNode),
    pairs: t.tuple([evalNode, evalNode]),
  }),
);
export type MemberAccessNode = {
  type: 'member-access';
  item: EvalNode;
  path: EvalNode[];
};
export const memberAccessNode: t.Type<MemberAccessNode> = t.recursion('MemberAccessNode', () =>
  t.type({
    type: t.literal('member-access'),
    item: evalNode,
    path: t.array(evalNode),
  }),
);
