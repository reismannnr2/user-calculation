import { EvalEnv, EvalNode, evalNodeWithLocal, EvalResult, VarStore } from 'src/evaluate';
import { err } from '@reismannnr2/async-result';

type BuiltIn = {
  [key in string]: (args: EvalNode[], env: EvalEnv, locals: VarStore) => EvalResult;
};

export const builtIn: BuiltIn = {
  '@#if': (args, env, locals) => {
    if (args.length < 3) {
      return err(new Error(''));
    }
    return evalNodeWithLocal(args[0], env, locals).andThen((child) => {
      if (child.type !== 'value' || child.value) {
        return evalNodeWithLocal(args[1], env, locals);
      }
      return evalNodeWithLocal(args[2], env, locals);
    });
  },
};
