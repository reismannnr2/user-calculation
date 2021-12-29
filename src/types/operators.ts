export const infixOps = [
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '==',
  '===',
  '!=',
  '!==',
  '>',
  '>=',
  '<',
  '<=',
  '&&',
  '||',
  '??',
] as const;
export const unaryOps = ['!', '+', '-'] as const;
export type InfixOp = typeof infixOps[number];
export type UnaryOp = typeof unaryOps[number];
