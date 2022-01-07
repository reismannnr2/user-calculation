import { cat, fail, map, rep, success, successThen } from '../common/combinator';
import { expr, NodeParser, Parser } from './parser';
import { CalcNode, InfixNode } from '../types/nodes';
import { SpChar } from '../types/tokens';

export const c =
  <C extends SpChar>(c: C): Parser<C> =>
  (stream) => {
    if (stream.length === 0) {
      return fail();
    }
    const head = stream[0];
    if (head.type !== 'sp-char' || head.char !== c) {
      return fail();
    }
    return success(stream.slice(1), head.char as C);
  };

export const wrapExpr =
  <L, R>(left: Parser<L>, right: Parser<R>): NodeParser =>
  (stream) => {
    return map(cat(left, expr, right), ([, node]) => node)(stream);
  };

export const infixExpr =
  <C extends InfixNode['op']>(c: Parser<C>, element: NodeParser): NodeParser =>
  (stream) => {
    if (stream.length === 0) {
      return fail();
    }
    const first = element(stream);
    return successThen(
      first,
      ([rest, head]) => {
        const mapped = map(rep(cat(c, element), 1), (items) => {
          return items.reduce<CalcNode>((lhs, [op, rhs]) => {
            const node: InfixNode = {
              type: 'infix',
              op,
              lhs,
              rhs,
            };
            return node;
          }, head);
        });
        const result = mapped(rest);
        return successThen(
          result,
          () => result,
          () => first,
        );
      },
      () => first,
    );
  };
