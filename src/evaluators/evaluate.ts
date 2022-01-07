import {
  CalcNode,
  CalculatedFnNode,
  CalculatedVarNode,
  FnNode,
  InfixNode,
  InvokeNode,
  LambdaVarNode,
  MemberAccessNode,
  TernaryNode,
  UnaryNode,
  ValueNode,
  VarNode,
} from '../types/nodes';
import { CalcEnv, VarType } from '../types/misc';
import { err, ok, Result } from '@reismannnr2/async-result';
import { VarCache } from './var-cache';
import { infixFns, unaryFns } from './operate';
import { Json, JsonArray, JsonRecord } from 'io-ts-types';

export type EvalResult = Result<CalcNode, Error>;

const evalRootNode = (node: CalcNode, env: CalcEnv) => evalNode(node, env, new VarCache());

interface Evaluator<N extends CalcNode> {
  (node: N, env: CalcEnv, cache: VarCache): EvalResult;
}

const evalNode: Evaluator<CalcNode> = (node, env, cache) =>
  cache.getOrInsert(env, node, () => evalNode_(node, env, cache));

const evalNode_: Evaluator<CalcNode> = (node, env, cache) => {
  switch (node.type) {
    case 'value':
    case 'fn':
    case 'lambda':
    case 'list':
    case 'record':
      return ok(node);
    case 'var':
    case 'lambda-var':
      return evalVar(node, env, cache);
    case 'calculated-fn':
    case 'calculated-var':
      return evalCalculatedSymbol(node, env, cache);
    case 'ternary':
      return evalTernary(node, env, cache);
    case 'infix':
      return evalInfix(node, env, cache);
    case 'unary':
      return evalUnary(node, env, cache);
    case 'member-access':
      return evalMemberAccess(node, env, cache);
  }
  return err(new Error(''));
};

const isCalcNode = (variable: VarType): variable is CalcNode =>
  typeof variable === 'object' && variable !== null && !Array.isArray(variable);
const evalVar: Evaluator<VarNode | LambdaVarNode> = (node, env, cache) => {
  if (!(node.name in env.vars)) {
    return err(new Error(`RuntimeError: No such variable defined: ${node.name}`));
  }
  const callee = env.vars[node.name];
  if (isCalcNode(callee)) {
    return evalNode(callee, env, cache);
  }
  const value: ValueNode = { type: 'value', value: callee };
  return ok(value);
};
const evalCalculatedSymbol: Evaluator<CalculatedVarNode | CalculatedFnNode> = (node, env, cache) =>
  evalNode(node.name, env, cache).andThen((nameNode) => {
    if (nameNode.type !== 'value' || typeof nameNode.value !== 'string') {
      return err(new Error('RuntimeError: CalculatedFn'));
    }
    const name = nameNode.value;
    if (node.type === 'calculated-var') {
      return evalVar({ type: 'var', name }, env, cache);
    }
    const fn: FnNode = {
      type: 'fn',
      name,
    };
    return ok(fn);
  });
const evalTernary: Evaluator<TernaryNode> = (node, env, cache) =>
  evalNode(node.condition, env, cache).andThen((condition) =>
    evalNode(condition.type !== 'value' || condition.value ? node.then : node.orElse, env, cache),
  );
const evalInfix: Evaluator<InfixNode> = (node, env, cache) =>
  evalNode(node.lhs, env, cache).andThen((lhs) =>
    evalNode(node.rhs, env, cache).andThen((rhs) => {
      const [l, r] = [lhs.type === 'value' ? lhs.value : lhs, rhs.type === 'value' ? rhs.value : rhs];
      const value: ValueNode = { type: 'value', value: infixFns[node.op](l, r) };
      return ok(value);
    }),
  );
const evalUnary: Evaluator<UnaryNode> = (node, env, cache) =>
  evalNode(node.operand, env, cache).andThen((operand) => {
    const value: ValueNode = {
      type: 'value',
      value: unaryFns[node.op](operand.type === 'value' ? operand.value : operand),
    };
    return ok(value);
  });

const isJsonRecord = (v: Json | undefined): v is JsonRecord => typeof v === 'object' && v !== null && !Array.isArray(v);
const isJsonArray = (v: Json | undefined): v is JsonArray => Array.isArray(v);
const evalMemberAccess: Evaluator<MemberAccessNode> = (node, env, cache) =>
  evalNode(node.item, env, cache).andThen((item) => {
    if (item.type === 'value') {
      let current = item.value;
      for (const key of node.path) {
        const keyR = evalNode(key, env, cache);
        if (keyR.isErr) {
          return keyR;
        }
        const keyN = keyR.value;
        if (keyN.type !== 'value') {
          return err(new Error(``));
        }
        if (typeof keyN.value === 'string' && isJsonRecord(current)) {
          current = current[keyN.value];
          continue;
        }
        if (typeof keyN.value === 'number' && isJsonArray(current)) {
          current = current[keyN.value];
          continue;
        }
        const empty: ValueNode = {
          type: 'value',
          value: undefined,
        };
        return ok(empty);
      }
      const value: ValueNode = {
        type: 'value',
        value: current,
      };
      return ok(value);
    }
    if (item.type === 'list' || item.type === 'record') {
      const pathHead = node.path[0];
      const pathRest = node.path.slice(1);
      return evalNode(pathHead, env, cache).andThen((keyNode) => {
        if (keyNode.type !== 'value') {
          return err(new Error(`RuntimeError: member access key must be resolved into string or number`));
        }
        const key = keyNode.value;
        if (typeof key === 'number' && item.type === 'list' && key < item.items.length) {
          return evalNode(item.items[key], env, cache).andThen((child) => {
            if (pathRest.length === 0) {
              return ok(child);
            }
            return evalMemberAccess({ type: 'member-access', item: child, path: pathRest }, env, cache);
          });
        }
        if (typeof key === 'string' && item.type === 'record') {
          if (key in item.raw) {
            return evalNode(item.raw[key], env, cache).andThen((child) => {
              if (pathRest.length === 0) {
                return ok(child);
              }
              return evalMemberAccess({ type: 'member-access', item: child, path: pathRest }, env, cache);
            });
          }
          for (const [targetKeyNode, child] of item.pairs) {
            const keyResult = evalNode(targetKeyNode, env, cache);
            if (keyResult.isErr) {
              return keyResult;
            }
            const targetKey = keyResult.value;
            if (targetKey.type !== 'value' || typeof targetKey.value !== 'string') {
              return err(new Error('RuntimeError: member access key must be resolved into string or number'));
            }
            if (targetKey.value === key) {
              return evalNode(child, env, cache).andThen((child) => {
                if (pathRest.length === 0) {
                  return ok(child);
                }
                return evalMemberAccess({ type: 'member-access', item: child, path: pathRest }, env, cache);
              });
            }
          }
        }
        const value: ValueNode = {
          type: 'value',
          value: undefined,
        };
        return ok(value);
      });
    }
    return err(new Error(`RuntimeError: member access is allowed for value, list, record only.`));
  });

const evalInvoke: Evaluator<InvokeNode> = (node, env, cache) => {
  return err(new Error(``));
};
