import { fail, or, success } from '../common/combinator';
import { NodeParser, Parser } from './parser';
import { LambdaVarNode } from '../types/nodes';
import { c, wrapExpr } from './generate';

export const atom: NodeParser = (stream) => {
  const head = stream[0];
  if (head.type !== 'value' && head.type !== 'var' && head.type !== 'lambda-var' && head.type !== 'fn') {
    return fail();
  }
  return success(stream.slice(1), head);
};

const calculatedIndex: NodeParser = wrapExpr(c('['), c(']'));
const simpleIndex: NodeParser = (stream) => {
  const head = stream[0];
  if (head.type === 'value') {
    return success(stream.slice(1), head);
  }
  if (head.type === 'prop-name') {
    return success(stream.slice(1), { type: 'value', value: head.name });
  }
  return fail();
};
export const index: NodeParser = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  return or(calculatedIndex, simpleIndex)(stream);
};
export const lambdaVar: Parser<LambdaVarNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const head = stream[0];
  if (head.type === 'lambda-var') {
    return success(stream.slice(1), head);
  }
  return fail();
};
