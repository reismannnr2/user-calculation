import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import { InfixOp, infixOps, UnaryOp, unaryOps } from './operators';
import { keyObject } from '../common/util';

export type CalcNode =
  | ValueNode
  | VarNode
  | CalculatedVarNode
  | FnNode
  | CalculatedFnNode
  | LambdaVarNode
  | LambdaNode
  | InvokeNode
  | InfixNode
  | UnaryNode
  | TernaryNode
  | ListNode
  | RecordNode
  | MemberAccessNode;
export const calcNode: t.Type<CalcNode> = t.recursion('CalcNode', () =>
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
    ternaryNode,
    listNode,
    recordNode,
    memberAccessNode,
  ]),
);

export const valueNode = t.type({
  type: t.literal('value'),
  value: t.union([tt.Json, t.undefined]),
});
export type ValueNode = t.TypeOf<typeof valueNode>;

export const varNode = t.type({
  type: t.literal('var'),
  name: t.string,
});
export type VarNode = t.TypeOf<typeof varNode>;

export type CalculatedVarNode = {
  type: 'calculated-var';
  name: CalcNode;
};
export const calculatedVar: t.Type<CalculatedVarNode> = t.recursion('CalculatedVarNode', () =>
  t.type({
    type: t.literal('calculated-var'),
    name: calcNode,
  }),
);

export const fnNode = t.type({
  type: t.literal('fn'),
  name: t.string,
});
export type FnNode = t.TypeOf<typeof fnNode>;

export type CalculatedFnNode = {
  type: 'calculated-fn';
  name: CalcNode;
};
export const calculatedFn: t.Type<CalculatedFnNode> = t.recursion('CalculatedFnNode', () =>
  t.type({
    type: t.literal('calculated-fn'),
    name: calcNode,
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
  expression: CalcNode;
};
export const lambdaNode: t.Type<LambdaNode> = t.recursion('LambdaNode', () =>
  t.type({
    type: t.literal('lambda'),
    identifiers: t.array(lambdaVarNode),
    expression: calcNode,
  }),
);
export type InvokeNode = {
  type: 'invoke';
  callee: CalcNode;
  args: CalcNode[];
};
export const fnCallNode: t.Type<InvokeNode> = t.recursion('InvokeNode', () =>
  t.type({
    type: t.literal('invoke'),
    callee: calcNode,
    args: t.array(calcNode),
  }),
);

export type InfixNode = {
  type: 'infix';
  op: InfixOp;
  lhs: CalcNode;
  rhs: CalcNode;
};

export const infixNode: t.Type<InfixNode> = t.recursion('InfixNode', () =>
  t.type({
    type: t.literal('infix'),
    op: t.keyof(keyObject(infixOps)),
    lhs: calcNode,
    rhs: calcNode,
  }),
);

export type UnaryNode = {
  type: 'unary';
  op: UnaryOp;
  operand: CalcNode;
};

export const unaryNode: t.Type<UnaryNode> = t.recursion('UnaryNode', () =>
  t.type({
    type: t.literal('unary'),
    op: t.keyof(keyObject(unaryOps)),
    operand: calcNode,
  }),
);

export type TernaryNode = {
  type: 'ternary';
  condition: CalcNode;
  then: CalcNode;
  orElse: CalcNode;
};

export const ternaryNode: t.Type<TernaryNode> = t.recursion('TernaryNode', () =>
  t.type({
    type: t.literal('ternary'),
    condition: calcNode,
    then: calcNode,
    orElse: calcNode,
  }),
);

export type ListNode = {
  type: 'list';
  items: CalcNode[];
};
export const listNode: t.Type<ListNode> = t.recursion('ListNode', () =>
  t.type({
    type: t.literal('list'),
    items: t.array(calcNode),
  }),
);
export type RecordNode = {
  type: 'record';
  raw: Record<string, CalcNode>;
  pairs: [CalcNode, CalcNode][];
};
export const recordNode: t.Type<RecordNode> = t.recursion('RecordNode', () =>
  t.type({
    type: t.literal('record'),
    raw: t.record(t.string, calcNode),
    pairs: t.array(t.tuple([calcNode, calcNode])),
  }),
);
export type MemberAccessNode = {
  type: 'member-access';
  item: CalcNode;
  path: CalcNode[];
};
export const memberAccessNode: t.Type<MemberAccessNode> = t.recursion('MemberAccessNode', () =>
  t.type({
    type: t.literal('member-access'),
    item: calcNode,
    path: t.array(calcNode),
  }),
);
