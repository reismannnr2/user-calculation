export const keyObject = <T extends readonly string[]>(arr: T): { [K in T[number]]: null } =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.fromEntries(arr.map((v) => [v, null] as any)) as any;
