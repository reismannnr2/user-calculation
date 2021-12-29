import { VarRegistry } from './evaluators/evaluate';

export type BasicPathItem = string | number;
export type BasicPath = BasicPathItem[];
export type RelativePathItem = { type: 'current' | 'absolute' | 'up'; count?: number };
export type RelativePath = (BasicPathItem | RelativePathItem)[];

export type MapPathItem = {
  type: 'complex';
  fn: 'map';
  expr: string;
  vars?: VarRegistry;
};
export type ReducePathItem = {
  type: 'complex';
  fn: 'reduce';
  expr: string;
  vars?: VarRegistry;
};
export type IndexPathItem = {
  type: 'complex';
  fn: 'index';
  vars?: VarRegistry;
};
export type RunPathItem = {
  type: 'complex';
  fn: 'run';
  vars?: VarRegistry;
};
export type AsIsItem = {
  type: 'complex';
  fn: 'as-is';
  vars?: VarRegistry;
};
export type ComplexPathItem = MapPathItem | ReducePathItem | IndexPathItem | AsIsItem;
export type ComplexPath = (BasicPathItem | ComplexPathItem)[];
export type ComplexRelativePath = (BasicPathItem | ComplexPathItem | RelativePathItem)[];

interface ResolveFn {
  (path: RelativePath, currentPath?: BasicPath): BasicPath;
  (path: ComplexRelativePath, currentPath?: BasicPath): ComplexPath;
}
const resolve: ResolveFn = (path: ComplexRelativePath, currentPath?: BasicPath) =>
  path.reduce<typeof path extends RelativePath ? BasicPath : ComplexPath>((acc, item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      acc.push(item);
      return acc;
    }
    if (item.type === 'absolute') {
      return [];
    }
    if (item.type === 'current') {
      return currentPath ?? [];
    }
    if (item.type === 'up') {
      return acc.slice(0, acc.length - (item.count ?? 1));
    }
    if (item.type === 'complex') {
      acc.push(item);
    }
    return acc;
  }, currentPath ?? []) as BasicPath;

const isRecord = (
  v: JSONValue | undefined,
): v is {
  [K in string]?: JSONValue | undefined;
} => v != null && typeof v === 'object' && !Array.isArray(v);

const readResolved = (state: JSONValue | undefined, path: ComplexPath): JSONValue | undefined => {
  let current = state;
  for (const [idx, item] of path.entries()) {
    if (current == undefined) {
      return undefined;
    }
    if (typeof item === 'string' && isRecord(current)) {
      current = current[item];
      continue;
    }
    if (typeof item === 'number' && Array.isArray(current)) {
      current = current[item];
      continue;
    }
    if (typeof item === 'object' && item.type === 'complex') {
      switch (item.fn) {
        case 'index': {
          const index = path[idx - 1];
          if (typeof index === 'number' || typeof index === 'string') {
            return index;
          }
          return undefined;
        }
        case 'as-is':
          return current;
        case 'map':
        case 'reduce':
      }
    }
    return undefined;
  }
  return current;
};

export const readState = (
  state: JSONValue | undefined,
  path: ComplexRelativePath,
  currentPath?: RelativePath,
): JSONValue | undefined => readResolved(state, resolve(path, resolve(currentPath ?? [])));
