import {
  ArrayNode,
  CalculatedFunctionCallNode,
  CalculatedVarNode,
  EvalNode,
  FunctionCallNode,
  InfixNode,
  LambdaCallNode,
  LambdaDefNode,
  LambdaVarToken,
  ObjectNode,
  ParNode,
  UnaryNode,
  ValueToken,
} from './evaluate';
import { cat, fail, list, map, or, Parser, rep, success, successThen } from './combinator';
import { LexToken, SpChar, tokenize } from './lexer';
import { err, ok, Result } from '@reismannnr2/async-result';

export type CalcParser<T> = Parser<LexToken[], T>;
const c =
  <C extends SpChar['value']>(c: C): CalcParser<C> =>
  (stream) => {
    if (stream.length === 0) {
      return fail();
    }
    const head = stream[0];
    if (head.type === 'sp-char') {
      return head.value === c ? success(stream.slice(1), head.value as C) : fail();
    }
    return fail();
  };
const wrapExpr =
  <L, R>(l: CalcParser<L>, r: CalcParser<R>): CalcParser<EvalNode> =>
  (stream) =>
    map(cat(l, expr, r), ([, expr]) => expr)(stream);
const lambdaVar: CalcParser<LambdaVarToken> = (stream) => {
  if (stream.length === 0) {
    fail();
  }
  const head = stream[0];
  return head.type === 'lambda-var' ? success(stream.slice(1), head) : fail();
};

const literal: CalcParser<string | number> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const head = stream[0];
  if (head.type === 'string-literal' || head.type === 'number-literal') {
    return success(stream.slice(1), head.value);
  }
  return fail();
};

const rawIdentifier: CalcParser<string> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const head = stream[0];
  if (head.type === 'raw-identifier') {
    return success(stream.slice(1), head.name);
  }
  return fail();
};

const atom: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const head = stream[0];
  if (head.type === 'number-literal' || head.type === 'string-literal') {
    return success(stream.slice(1), { type: 'value', value: head.value });
  }
  if (head.type === 'var' || head.type === 'lambda-var') {
    return success(stream.slice(1), head);
  }
  return fail();
};

const fnStart: CalcParser<string> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const head = stream[0];
  if (head.type === 'fn-start') {
    return success(stream.slice(1), head.name);
  }
  return fail();
};
const par: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const wrapped = map(wrapExpr(c('('), c(')')), (child) => {
    const node: ParNode = {
      type: 'par',
      children: [child],
    };
    return node;
  });
  return or(wrapped, atom)(stream);
};
const arrayDef: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const empty = map(c(']'), () => {
    const node: ValueToken = {
      type: 'value',
      value: [],
    };
    return node;
  });
  const items = map(cat(list(expr, c(',')), c(']')), ([items]) => {
    const node: ArrayNode = {
      type: 'array',
      children: items,
    };
    return node;
  });
  const mapped = map(cat(c('@['), or(empty, items)), ([, node]) => node);
  return or(mapped, par)(stream);
};
const objectDef: CalcParser<EvalNode> = (stream) => {
  const calculatedIndex: CalcParser<EvalNode> = wrapExpr(c('['), c(']'));
  const simpleIndex: CalcParser<EvalNode> = map(or(literal, rawIdentifier), (value) => ({ type: 'value', value }));
  const index = or(calculatedIndex, simpleIndex);
  const empty = map(c('}'), () => {
    const node: ObjectNode = {
      type: 'object',
      raw: {},
      pairs: [],
    };
    return node;
  });
  const withElement = map(cat(list(cat(index, c(':'), expr), c(',')), c('}')), ([items]) => {
    const node: ObjectNode = {
      type: 'object',
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
  const mapped = map(cat(c('@{'), or(empty, withElement)), ([, node]) => node);
  return or(mapped, arrayDef)(stream);
};

const lambdaDef: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const identifiers: CalcParser<LambdaVarToken[]> = map(
    cat(
      c('@|'),
      or(
        map(c('|'), () => [] as LambdaVarToken[]),
        map(cat(list(lambdaVar, c(',')), c('|')), ([list]) => list),
      ),
    ),
    ([, list]) => list,
  );
  const mapped = map(cat(identifiers, c('=>'), expr), ([identifiers, , child]) => {
    const node: LambdaDefNode = {
      type: 'lambda-def',
      identifiers,
      children: [child],
    };
    return node;
  });
  return or(mapped, objectDef)(stream);
};
const calcVar: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const wrapped = map(wrapExpr(c('$('), c(')')), (child) => {
    const node: CalculatedVarNode = {
      type: 'calculated-var',
      children: [child],
    };
    return node;
  });
  return or(wrapped, lambdaDef)(stream);
};
const fn: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const withoutArgs = map(cat(fnStart, c(')')), ([name]) => {
    const node: FunctionCallNode = {
      type: 'fn',
      name,
      children: [],
    };
    return node;
  });
  const withArgs = map(cat(fnStart, list(expr, c(',')), c(')')), ([name, children]) => {
    const node: FunctionCallNode = {
      type: 'fn',
      name,
      children,
    };
    return node;
  });
  const withoutArgsC = map(cat(wrapExpr(c('@('), c(')')), c('('), c(')')), ([child]) => {
    const node: CalculatedFunctionCallNode = {
      type: 'calculated-fn',
      children: [child],
    };
    return node;
  });
  const withArgsC = map(cat(wrapExpr(c('@('), c(')')), c('('), list(expr, c(',')), c(')')), ([child, , args]) => {
    const node: CalculatedFunctionCallNode = {
      type: 'calculated-fn',
      children: [child, ...args],
    };
    return node;
  });
  return or(withoutArgs, withArgs, withoutArgsC, withArgsC, calcVar)(stream);
};

const lambdaCall: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const first = fn(stream);
  return successThen(
    first,
    ([rest, head]) => {
      const withoutArgs = map(cat(c<'('>('('), c(')')), () => {
        const node: LambdaCallNode = {
          type: 'lambda-call',
          children: [head],
        };
        return node;
      });
      const withArgs = map(cat(c<'('>('('), list(expr, c(',')), c(')')), ([, args]) => {
        const node: LambdaCallNode = {
          type: 'lambda-call',
          children: [head, ...args],
        };
        return node;
      });
      const result = or(withArgs, withoutArgs)(rest);
      return successThen(
        result,
        () => result,
        () => first,
      );
    },
    () => first,
  );
};

const access: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const first = lambdaCall(stream);
  return successThen(
    first,
    ([rest, head]) => {
      const repeats = map(rep(wrapExpr(c('['), c(']')), 1), (list) => {
        const node: EvalNode = {
          type: 'member-access',
          children: [head, ...list],
        };
        return node;
      });
      const result = repeats(rest);
      return successThen(
        result,
        () => result,
        () => first,
      );
    },
    (first) => first,
  );
};
const unary: CalcParser<EvalNode> = (stream) => {
  if (stream.length === 0) {
    return fail();
  }
  const withOp = map(
    cat<LexToken[], '+' | '-' | '!', [CalcParser<EvalNode>]>(or(c('+'), c('-'), c('!')), expr),
    ([op, child]) => {
      const node: UnaryNode = {
        type: 'unary',
        op,
        children: [child],
      };
      return node;
    },
  );
  return or(access, withOp)(stream);
};
const infix =
  <C extends InfixNode['op']>(c: CalcParser<C>, element: CalcParser<EvalNode>): CalcParser<EvalNode> =>
  (stream) => {
    if (stream.length === 0) {
      return fail();
    }
    const first = element(stream);
    return successThen(
      first,
      ([rest, head]) => {
        const repeatN = rep(cat(c, element), 1);
        const mapped = map(repeatN, (items) => {
          return items.reduce<EvalNode>((lhs, [op, rhs]) => {
            const node: InfixNode = {
              type: 'infix',
              op,
              children: [lhs, rhs],
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
      (first) => first,
    );
  };
const pow = infix(c('**'), unary);
const multiply = infix(or(c('*'), c('/'), c('%')), pow);
const sum = infix(or(c('+'), c('-')), multiply);
const compare = infix(or(c('<'), c('<='), c('>'), c('>=')), sum);
const eq = infix(or(c('!=='), c('==='), c('=='), c('!=')), compare);
const andL = infix(c('&&'), eq);
const orL = infix(c('||'), andL);

const expr: CalcParser<EvalNode> = (stream) => orL(stream);

const intoNodes = (tokens: LexToken[]): Result<EvalNode, Error> => {
  const parsed = expr(tokens);
  if (parsed.isErr) {
    return parsed.never();
  }
  const op = parsed.value;
  if (op.isNone) {
    return err(new Error('cannot parse'));
  }
  const [rest, node] = op.value;
  if (rest.length > 0) {
    return err(new Error(`ParseError: Invalid Tokens ${JSON.stringify(rest)}`));
  }
  return ok(node);
};

export const parse = (() => {
  const cache = new Map<string, Result<EvalNode, Error>>();
  return (text: string): Result<EvalNode, Error> => {
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
