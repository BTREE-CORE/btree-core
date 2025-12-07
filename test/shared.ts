import BTree, { BNode, BNodeInternal, IMap } from '../b+tree';
import SortedArray from '../sorted-array';
import MersenneTwister from 'mersenne-twister';
import type { BTreeWithInternals } from '../extended/shared';
import BTreeEx from '../extended';

const rand = new MersenneTwister(1234);
export const compareNumbers = (a: number, b: number) => a - b;

export type TreeNodeStats = {
  total: number;
  shared: number;
  newUnderfilled: number;
  averageLoadFactor: number;
};

export type TreeEntries = Array<[number, number]>;

export type SetOperationFuzzSettings = {
  branchingFactors: number[];
  ooms: number[];
  fractionsPerOOM: number[];
  removalChances: number[];
};

export type FuzzCase = {
  maxNodeSize: number;
  oom: number;
  size: number;
  fractionA: number;
  fractionB: number;
  removalChance: number;
  removalLabel: string;
};

export function countTreeNodeStats<K, V>(tree: BTree<K, V>): TreeNodeStats {
  const root = (tree as unknown as BTreeWithInternals<K, V>)._root;
  if (tree.size === 0 || !root)
    return { total: 0, shared: 0, newUnderfilled: 0, averageLoadFactor: 0 };

  const maxNodeSize = tree.maxNodeSize;
  const minNodeSize = Math.floor(maxNodeSize / 2);

  type StatsAccumulator = {
    total: number;
    shared: number;
    newUnderfilled: number;
    loadFactorSum: number;
  };

  const visit = (node: BNode<K, V>, ancestorShared: boolean, isRoot: boolean): StatsAccumulator => {
    if (!node)
      return { total: 0, shared: 0, newUnderfilled: 0, loadFactorSum: 0 };
    const selfShared = node.isShared === true || ancestorShared;
    const children: BNode<K, V>[] | undefined = (node as BNodeInternal<K, V>).children;
    const occupancy = children ? children.length : node.keys.length;
    const isUnderfilled = !isRoot && occupancy < minNodeSize;
    const loadFactor = occupancy / maxNodeSize;
    let shared = selfShared ? 1 : 0;
    let total = 1;
    let newUnderfilled = !selfShared && isUnderfilled ? 1 : 0;
    let loadFactorSum = loadFactor;
    if (children) {
      for (const child of children) {
        const stats = visit(child, selfShared, false);
        total += stats.total;
        shared += stats.shared;
        newUnderfilled += stats.newUnderfilled;
        loadFactorSum += stats.loadFactorSum;
      }
    }
    return { total, shared, newUnderfilled, loadFactorSum };
  };

  const result = visit(root, false, true);
  const averageLoadFactor = result.total === 0 ? 0 : result.loadFactorSum / result.total;
  return {
    total: result.total,
    shared: result.shared,
    newUnderfilled: result.newUnderfilled,
    averageLoadFactor
  };
}

export function logTreeNodeStats(prefix: string, stats: BTreeEx|TreeNodeStats): void {
  if (stats instanceof BTree)
    stats = countTreeNodeStats(stats);
  
  const percent = (stats.averageLoadFactor * 100).toFixed(2);
  console.log(`\t${prefix} ${stats.shared}/${stats.total} shared nodes, ` + 
    `${stats.newUnderfilled}/${stats.total} underfilled nodes, ${percent}% average load factor`);
}

export function randInt(max: number): number {
  return rand.random_int() % max;
}

export function expectTreeEqualTo<K, V>(tree: BTree<K, V>, list: SortedArray<K, V>): void {
  tree.checkValid();
  expect(tree.toArray()).toEqual(list.getArray());
}

export function addToBoth<K, V>(a: IMap<K, V>, b: IMap<K, V>, k: K, v: V): void {
  expect(a.set(k, v)).toEqual(b.set(k, v));
}

export function makeArray(
  size: number,
  randomOrder: boolean,
  spacing = 10,
  rng?: MersenneTwister
): number[] {
  const randomizer = rng ?? rand;
  const useGlobalRand = rng === undefined;

  const randomFloat = () => {
    if (typeof randomizer.random === 'function')
      return randomizer.random();
    return Math.random();
  };

  const randomIntWithMax = (max: number) => {
    if (max <= 0)
      return 0;
    if (useGlobalRand)
      return randInt(max);
    return Math.floor(randomFloat() * max);
  };

  const keys: number[] = [];
  let current = 0;
  for (let i = 0; i < size; i++) {
    current += 1 + randomIntWithMax(spacing);
    keys[i] = current;
  }
  if (randomOrder) {
    for (let i = 0; i < size; i++)
      swap(keys, i, randomIntWithMax(size));
  }
  return keys;
}

export const randomInt = (rng: MersenneTwister, maxExclusive: number) =>
  Math.floor(rng.random() * maxExclusive);

function swap(keys: any[], i: number, j: number) {
  const tmp = keys[i];
  keys[i] = keys[j];
  keys[j] = tmp;
}

export function buildEntriesFromMap(
  entriesMap: Map<number, number>,
  compareFn: (a: number, b: number) => number = (a, b) => a - b
): TreeEntries {
  const entries = Array.from(entriesMap.entries()) as TreeEntries;
  entries.sort((a, b) => compareFn(a[0], b[0]));
  return entries;
}

export type FuzzTreeSpec = {
  tree: BTree<number, number>;
  fraction: number;
  removalChance?: number;
};

export type PopulateFuzzTreesOptions = {
  size: number;
  rng: MersenneTwister;
  compare: (a: number, b: number) => number;
  maxNodeSize: number;
  minAssignmentsPerKey?: number;
};

export function populateFuzzTrees(
  specs: FuzzTreeSpec[],
  { size, rng, compare, maxNodeSize, minAssignmentsPerKey = 0 }: PopulateFuzzTreesOptions
): TreeEntries[] {
  if (specs.length === 0)
    return [];

  const keys = makeArray(size, true, 1, rng);
  const entriesMaps = specs.map(() => new Map<number, number>());
  const assignments = new Array<boolean>(specs.length);
  const requiredAssignments = Math.min(minAssignmentsPerKey, specs.length);

  for (const value of keys) {
    let assignedCount = 0;
    for (let i = 0; i < specs.length; i++) {
      assignments[i] = rng.random() < specs[i].fraction;
      if (assignments[i])
        assignedCount++;
    }

    while (assignedCount < requiredAssignments && specs.length > 0) {
      const index = randomInt(rng, specs.length);
      if (!assignments[index]) {
        assignments[index] = true;
        assignedCount++;
      }
    }

    for (let i = 0; i < specs.length; i++) {
      if (assignments[i]) {
        specs[i].tree.set(value, value);
        entriesMaps[i].set(value, value);
      }
    }
  }

  return specs.map((spec, index) => {
    let entries = buildEntriesFromMap(entriesMaps[index], compare);
    const removalChance = spec.removalChance ?? 0;
    if (removalChance > 0)
      entries = applyRemovalRunsToTree(spec.tree, entries, removalChance, maxNodeSize, rng);
    return entries;
  });
}

export function applyRemovalRunsToTree(
  tree: BTree<number, number>,
  entries: TreeEntries,
  removalChance: number,
  branchingFactor: number,
  rng: MersenneTwister
): TreeEntries {
  if (removalChance <= 0 || entries.length === 0)
    return entries;
  const remaining: TreeEntries = [];
  let index = 0;
  while (index < entries.length) {
    const [key, value] = entries[index];
    if (rng.random() < removalChance) {
      tree.delete(key);
      index++;
      while (index < entries.length) {
        const [candidateKey] = entries[index];
        if (rng.random() < (1 / branchingFactor))
          break;
        tree.delete(candidateKey);
        index++;
      }
    } else {
      remaining.push([key, value]);
      index++;
    }
  }
  return remaining;
}

export function expectTreeMatchesEntries(tree: BTree<number, number>, entries: TreeEntries): void {
  let index = 0;
  tree.forEachPair((key, value) => {
    const expected = entries[index++]!;
    expect([key, value]).toEqual(expected);
  });
  expect(index).toBe(entries.length);
}

function validateFuzzSettings(settings: SetOperationFuzzSettings): void {
  settings.fractionsPerOOM.forEach(fraction => {
    if (fraction < 0 || fraction > 1)
      throw new Error('fractionsPerOOM values must be between 0 and 1');
  });
  settings.removalChances.forEach(chance => {
    if (chance < 0 || chance > 1)
      throw new Error('removalChances values must be between 0 and 1');
  });
}

export function forEachFuzzCase(
  settings: SetOperationFuzzSettings,
  callback: (testCase: FuzzCase) => void
): void {
  validateFuzzSettings(settings);
  for (const maxNodeSize of settings.branchingFactors) {
    for (const removalChance of settings.removalChances) {
      const removalLabel = removalChance.toFixed(3);
      for (const oom of settings.ooms) {
        const size = 5 * Math.pow(10, oom);
        for (const fractionA of settings.fractionsPerOOM) {
          const fractionB = 1 - fractionA;
          callback({ maxNodeSize, oom, size, fractionA, fractionB, removalChance, removalLabel });
        }
      }
    }
  }
}
