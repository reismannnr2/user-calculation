import { err, ok, Result } from '@reismannnr2/async-result';
import { RelativePath } from './state-reader';

export type EvalResult = Result<ValueToken | LambdaDefNode, Error | undefined>;
export type VarRegistry = {
  [key in string]?: EvalNode | undefined;
};
export type VarCache = {
  [key in string]?: EvalResult;
};
export type VarStore = {
  reg: VarRegistry;
  cache: VarCache;
};
export type EvalEnv = {
  state?: JSONValue;
  currentPath?: RelativePath;
  globals?: VarStore;
};

// types
export type ValueToken = {
  type: 'value';
  value: JSONValue;
};
export type VarToken = {
  type: 'var';
  name: string;
};
export type LambdaVarToken = {
  type: 'lambda-var';
  name: string;
};

type NumInfixOp = keyof typeof numInfix;
type AnyInfixOp = keyof typeof anyInfix;
type InfixOp = NumInfixOp | AnyInfixOp;
type NumUnaryOp = keyof typeof numUnary;
type AnyUnaryOp = keyof typeof anyUnary;
type UnaryOp = NumUnaryOp | AnyUnaryOp;

export type UnaryNode = {
  type: 'unary';
  op: UnaryOp;
  children: [EvalNode];
};
export type InfixNode = {
  type: 'infix';
  op: InfixOp;
  children: [EvalNode, EvalNode];
};
export type MathNode = {
  type: 'math';
  name: keyof Math;
  children: EvalNode[];
};
export type ExprNode = {
  type: 'expr';
  expr: string;
  vars?: VarRegistry;
};
export type ListNode = {
  type: 'list';
  children: EvalNode[];
};
export type MapNode = {
  type: 'map';
  expr: string;
  children: [EvalNode];
};
export type ReduceNode = {
  type: 'reduce';
  expr: string;
  children: [EvalNode];
};
export type FunctionCallNode = {
  type: 'fn';
  name: string;
  children: EvalNode[];
};
export type CalculatedFunctionCallNode = {
  type: 'calculated-fn';
  children: [EvalNode, ...EvalNode[]];
};
export type CalculatedVarNode = {
  type: 'calculated-var';
  children: [EvalNode];
};
export type FilterNode = {
  type: 'filter';
  expr: string;
  children: [EvalNode];
};
export type ParNode = {
  type: 'par';
  children: [EvalNode];
};
export type MemberAccessNode = {
  type: 'member-access';
  children: [EvalNode, ...EvalNode[]];
};
export type LambdaCallNode = {
  type: 'lambda-call';
  children: [EvalNode, ...EvalNode[]];
};
export type ReadStateNode = {
  type: 'read-state';
  as?: 'number' | 'string' | 'boolean';
};
export type LambdaDefNode = {
  type: 'lambda-def';
  identifiers: LambdaVarToken[];
  children: [EvalNode];
};

export type EvalNode =
  | VarToken
  | LambdaVarToken
  | CalculatedVarNode
  | ValueToken
  | InfixNode
  | ExprNode
  | MathNode
  | UnaryNode
  | ParNode
  | FunctionCallNode
  | CalculatedFunctionCallNode
  | LambdaCallNode
  | LambdaDefNode
  | MemberAccessNode;

const numInfix = {
  '+': (a: number, b: number) => a + b,
  '-': (a: number, b: number) => a - b,
  '*': (a: number, b: number) => a * b,
  '/': (a: number, b: number) => a / b,
  '%': (a: number, b: number) => a % b,
  '**': (a: number, b: number) => a ** b,
  '>': (a: number, b: number) => a > b,
  '>=': (a: number, b: number) => a > b,
  '<': (a: number, b: number) => a > b,
  '<=': (a: number, b: number) => a > b,
} as const;

const anyInfix = {
  '==': (a: unknown, b: unknown) => a == b,
  '!=': (a: unknown, b: unknown) => a != b,
  '===': (a: unknown, b: unknown) => a === b,
  '!==': (a: unknown, b: unknown) => a !== b,
  '&&': (a: unknown, b: unknown) => Boolean(a && b),
  '||': (a: unknown, b: unknown) => Boolean(a || b),
} as const;

export const isNumInfixOp = (op: string): op is NumInfixOp =>
  Boolean((numInfix as { [key in string]?: (a: number, b: number) => unknown })[op]);
export const isAnyInfixOp = (op: string): op is AnyInfixOp =>
  Boolean((anyInfix as { [key in string]?: (a: unknown, b: unknown) => unknown })[op]);
export const isInfixOp = (op: string): op is InfixOp => isNumInfixOp(op) || isAnyInfixOp(op);

const successValue = <T extends JSONValue>(value: T): ValueToken => ({ type: 'value', value });

const numUnary = {
  '+': (x: number) => x,
  '-': (x: number) => -x,
};
const anyUnary = {
  '!': (x: unknown) => !x,
};
const isNumUnaryOp = (op: string): op is NumUnaryOp =>
  Boolean((numUnary as { [key in string]?: (x: number) => unknown })[op]);
const isAnyUnaryOp = (op: string): op is AnyUnaryOp =>
  Boolean((anyUnary as { [key in string]?: (x: unknown) => unknown })[op]);
export const isUnaryOp = (op: string): op is UnaryOp => isNumUnaryOp(op) || isAnyUnaryOp(op);

const evalNode = (node: EvalNode, env: EvalEnv): EvalResult => {
  return evalNodeWithLocal(node, env, { reg: {}, cache: {} });
};
const evalNodeWithLocal = (node: EvalNode, env: EvalEnv, locals: VarStore): EvalResult => {
  if (node.type === 'value') {
    return ok(node);
  }
  if (node.type === 'var') {
    return evalVar(node, env, locals);
  }
  if (node.type === 'math') {
    return evalMath(node, env, locals);
  }
  if (node.type === 'infix') {
    return evalInfix(node, env, locals);
  }
  if (node.type === 'unary') {
    return evalUnary(node, env, locals);
  }
  if (node.type === 'expr') {
    return err();
  }
  return err();
};

const intoNumber = (node: ValueToken | LambdaDefNode): number =>
  node.type === 'lambda-def' ? NaN : Number(node.value);
const intoValue = (node: ValueToken | LambdaDefNode): unknown => (node.type === 'lambda-def' ? node : node.value);

const evalInfix = (node: InfixNode, env: EvalEnv, locals: VarStore): EvalResult => {
  return Result.all(
    node.children.map<() => EvalResult>((child) => () => evalNodeWithLocal(child, env, locals)),
  ).andThen(([lhs, rhs]) => {
    if (isNumInfixOp(node.op)) {
      return ok({ type: 'value', value: numInfix[node.op](intoNumber(lhs), intoNumber(rhs)) });
    }
    if (isAnyInfixOp(node.op)) {
      return ok({ type: 'value', value: anyInfix[node.op](intoValue(lhs), intoValue(rhs)) });
    }
    /* istanbul ignore next */
    return err(new Error('Invalid Infix Operator'));
  });
};
const evalUnary = (node: UnaryNode, env: EvalEnv, locals: VarStore): EvalResult => {
  return evalNodeWithLocal(node, env, locals).andThen((child) => {
    if (isNumUnaryOp(node.op)) {
      return ok(successValue(numUnary[node.op](intoNumber(child))));
    }
    if (isAnyUnaryOp(node.op)) {
      return ok({ type: 'value', value: anyUnary[node.op](intoValue(child)) });
    }
    /* istanbul ignore next */
    return err(new Error(''));
  });
};
const mergeLocals = (base: VarStore, child: VarRegistry | undefined): VarStore => {
  if (child == undefined) {
    return base;
  }
  const reg = { ...base.reg, ...child };
  const cache = Object.entries(base.cache).reduce<VarCache>((cache, [key, v]) => {
    if (key in child) {
      return cache;
    }
    cache[key] = v;
    return cache;
  }, {});
  return { reg, cache };
};
const evalVar = (node: VarToken, env: EvalEnv, locals: VarStore): EvalResult => {
  const isGlobal = node.name.startsWith('$$');
  const store = isGlobal ? env.globals : locals;
  const name = node.name.substring(isGlobal ? 2 : 1);
  if (store == undefined) {
    return err(new Error(''));
  }
  const def = store.reg[name];
  if (def == undefined) {
    return err(new Error(''));
  }
  const cached = store.cache[name];
  if (cached) {
    return cached;
  }
  const calculated =
    def.type === 'expr' ? evalNodeWithLocal(def, env, mergeLocals(locals, def.vars)) : evalNode(def, env);
  store.cache[name] = calculated;
  return calculated;
};
const evalMath = (node: MathNode, env: EvalEnv, locals: VarStore): EvalResult => {
  return Result.all(node.children.map((child) => () => evalNodeWithLocal(child, env, locals))).andThen((args) => {
    try {
      const f = Math[node.name];
      if (typeof f === 'number' || typeof f === 'string') {
        return ok(successValue(f));
      }
      return ok(successValue((f as (...args: unknown[]) => JSONValue).apply(this, args)));
    } catch (e) {
      return err(new Error(String(e)));
    }
  });
};
