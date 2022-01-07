import {
  BaseParser,
  BaseParserResult,
  cat,
  fail,
  list,
  map,
  or,
  orDefault,
  rep,
  mayContinue,
} from '../common/combinator';
import { CalcToken } from '../types/tokens';
import {
  CalculatedVarNode,
  CalculatedFnNode,
  CalcNode,
  InvokeNode,
  LambdaNode,
  LambdaVarNode,
  ListNode,
  MemberAccessNode,
  RecordNode,
  UnaryNode,
  TernaryNode,
} from '../types/nodes';
import { atom, index, lambdaVar } from './partial';
import { c, infixExpr, wrapExpr } from './generate';
import { err, ok, Result } from '@reismannnr2/async-result';
import { tokenize } from './lexer';

export type Parser<T> = BaseParser<CalcToken[], T>;
export type NodeParser = Parser<CalcNode>;
export type NodeParserResult = BaseParserResult<CalcToken[], CalcNode>;

const par: NodeParser = (stream) => {
  if (stream.length === 0) {
    fail();
  }
  const wrapped: NodeParser = wrapExpr(c('('), c(')'));
  return or(wrapped, atom)(stream);
};

const calculated: NodeParser = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const varParser = map(wrapExpr(c('$('), c(')')), (name) => {
    const node: CalculatedVarNode = {
      type: 'calculated-var',
      name,
    };
    return node;
  });
  const fnParser = map(wrapExpr(c('@('), c(')')), (name) => {
    const node: CalculatedFnNode = {
      type: 'calculated-fn',
      name,
    };
    return node;
  });
  return or(varParser, fnParser, par)(stream);
};

const defs: NodeParser = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const listParser = map(cat(or(c('['), c('@[')), orDefault(list(expr, c(',')), []), c(']')), ([, items]) => {
    const node: ListNode = {
      type: 'list',
      items,
    };
    return node;
  });
  const recordParser: NodeParser = (stream) => {
    const wrapped = cat(or(c('{'), c('@{')), orDefault(list(cat(index, c(':'), expr), c(',')), []), c('}'));
    const mapped = map(wrapped, ([, items]) => {
      const node: RecordNode = {
        type: 'record',
        raw: {},
        pairs: [],
      };
      for (const [key, , value] of items) {
        if (key.type === 'value') {
          node.raw[String(key.value)] = value;
        } else {
          node.pairs.push([key, value]);
        }
      }
      return node;
    });
    return mapped(stream);
  };
  const lambdaParser: NodeParser = (stream) => {
    const identifiers: Parser<LambdaVarNode[]> = map(
      cat(c('@|'), orDefault(list(lambdaVar, c(',')), []), c('|')),
      ([, identifiers]) => identifiers,
    );
    const mapped = map(cat(identifiers, c('=>'), expr), ([identifiers, , expression]) => {
      const node: LambdaNode = {
        type: 'lambda',
        identifiers,
        expression,
      };
      return node;
    });
    return mapped(stream);
  };
  return or(listParser, recordParser, lambdaParser, calculated)(stream);
};

const postProcess: NodeParser = mayContinue(defs, ([rest, head]) => {
  const invoke = map(cat(c('('), orDefault(list(expr, c(',')), []), c(')')), ([, args]) => {
    const node: Omit<InvokeNode, 'callee'> = {
      type: 'invoke',
      args,
    };
    return node;
  });
  const access = map(rep(wrapExpr(c('['), c(']')), 1), (list) => {
    const node: Omit<MemberAccessNode, 'item'> = {
      type: 'member-access',
      path: list,
    };
    return node;
  });
  const repeats = map(rep(or(invoke, access), 1), (list) => {
    return list.reduce<CalcNode>((operand, current) => {
      switch (current.type) {
        case 'invoke': {
          const node: InvokeNode = {
            ...current,
            callee: operand,
          };
          return node;
        }
        case 'member-access': {
          const node: MemberAccessNode = {
            ...current,
            item: operand,
          };
          return node;
        }
      }
    }, head);
  });
  return repeats(rest);
});

const unary: NodeParser = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const ops = or(c('+'), c('-'), c('!'));
  const withOp = map(cat(ops, expr), ([op, operand]) => {
    const node: UnaryNode = {
      type: 'unary',
      op,
      operand,
    };
    return node;
  });
  return or(postProcess, withOp)(stream);
};
const pow = infixExpr(c('**'), unary);
const multiply = infixExpr(or(c('*'), c('/'), c('%')), pow);
const sum = infixExpr(or(c('+'), c('-')), multiply);
const compare = infixExpr(or(c('<'), c('<='), c('>'), c('>=')), sum);
const eq = infixExpr(or(c('!=='), c('==='), c('=='), c('!=')), compare);
const andL = infixExpr(c('&&'), eq);
const orL = infixExpr(c('||'), andL);
const ternary = mayContinue(orL, ([rest, condition]) => {
  const mapped = map(cat(c<'?'>('?'), expr, c(':'), expr), ([, then, , orElse]) => {
    const node: TernaryNode = {
      type: 'ternary',
      condition,
      then,
      orElse,
    };
    return node;
  });
  return mapped(rest);
});
export const expr: NodeParser = (stream) => ternary(stream);

const intoNodes = (tokens: CalcToken[]): Result<CalcNode, Error> => {
  const parsed = expr(tokens);
  if (parsed.isErr) {
    return parsed.never();
  }
  const op = parsed.value;
  return op.match({
    none: () => err(new Error(`ParseError: No tokens found`)),
    some: ([rest, node]) =>
      rest.length > 0 ? err(new Error(`ParseError: Invalid Tokens ${JSON.stringify(rest)}`)) : ok(node),
  });
};

export const parse = (() => {
  const cache = new Map<string, Result<CalcNode, Error>>();
  return (text: string): Result<CalcNode, Error> => {
    const cached = cache.get(text);
    if (cached) {
      return cached;
    }
    const r = tokenize(text).andThen((tokens) => {
      if (tokens.length === 0) {
        return err(new Error('No tokens found'));
      }
      return intoNodes(tokens);
    });
    cache.set(text, r);
    return r;
  };
})();
