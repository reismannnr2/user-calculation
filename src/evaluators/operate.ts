/* eslint-disable @typescript-eslint/no-explicit-any */

export const infixFns = {
  '+': (a: any, b: any) => a + b,
  '-': (a: any, b: any) => a - b,
  '*': (a: any, b: any) => a * b,
  '/': (a: any, b: any) => a / b,
  '%': (a: any, b: any) => a % b,
  '**': (a: any, b: any) => a ** b,
  '==': (a: any, b: any) => a == b,
  '===': (a: any, b: any) => a === b,
  '!=': (a: any, b: any) => a != b,
  '!==': (a: any, b: any) => a !== b,
  '>': (a: any, b: any) => a > b,
  '>=': (a: any, b: any) => a >= b,
  '<': (a: any, b: any) => a < b,
  '<=': (a: any, b: any) => a <= b,
  '&&': (a: any, b: any) => a && b,
  '||': (a: any, b: any) => a || b,
  '??': (a: any, b: any) => a ?? b,
} as const;
export const unaryFns = {
  '!': (x: any) => !x,
  '-': (x: any) => -x,
  '+': (x: any) => +x,
} as const;
/* eslint-enable @typescript-eslint/no-explicit-any */
