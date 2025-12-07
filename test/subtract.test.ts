import BTreeEx from '../extended';
import forEachKeyNotIn from '../extended/forEachKeyNotIn';
import subtract from '../extended/subtract';
import { comparatorErrorMsg, branchingFactorErrorMsg } from '../extended/shared';
import MersenneTwister from 'mersenne-twister';
import {
  expectTreeMatchesEntries,
  forEachFuzzCase,
  populateFuzzTrees,
  SetOperationFuzzSettings,
  compareNumbers
} from './shared';

type NotInCall = { key: number, value: number };

const runForEachKeyNotInAndSubtract = (
  include: BTreeEx<number, number>,
  exclude: BTreeEx<number, number>,
  assertion: (calls: NotInCall[]) => void
) => {
  const forEachCalls: NotInCall[] = [];
  forEachKeyNotIn(include, exclude, (key, value) => {
    forEachCalls.push({ key, value });
  });
  assertion(forEachCalls);

  const resultTree = subtract<BTreeEx<number, number>, number, number>(include, exclude);
  const subtractCalls = resultTree.toArray().map(([key, value]) => ({ key, value }));
  expect(subtractCalls).toEqual(forEachCalls);
  resultTree.checkValid();
  assertion(subtractCalls);
};

const expectForEachKeyNotInAndSubtractCalls = (
  include: BTreeEx<number, number>,
  exclude: BTreeEx<number, number>,
  expected: Array<[number, number]>
) => {
  const expectedRecords = tuplesToRecords(expected);
  runForEachKeyNotInAndSubtract(include, exclude, (calls) => {
    expect(calls).toEqual(expectedRecords);
  });
};

const tuplesToRecords = (entries: Array<[number, number]>): NotInCall[] =>
  entries.map(([key, value]) => ({ key, value }));

const tuples = (...pairs: Array<[number, number]>) => pairs;
const buildTree = (entries: Array<[number, number]>, maxNodeSize: number) =>
  new BTreeEx<number, number>(entries, compareNumbers, maxNodeSize);

describe.each([32, 10, 4])('BTree forEachKeyNotIn/subtract tests with fanout %i', (maxNodeSize) => {
  const buildTreeForFanout = (entries: Array<[number, number]>) => buildTree(entries, maxNodeSize);

  const BASIC_CASES: Array<{
    name: string;
    include: Array<[number, number]>;
    exclude: Array<[number, number]>;
    expected: Array<[number, number]>;
  }> = [
    {
      name: 'forEachKeyNotIn/subtract two empty trees',
      include: tuples(),
      exclude: tuples(),
      expected: [],
    },
    {
      name: 'forEachKeyNotIn/subtract include empty tree with non-empty tree',
      include: tuples(),
      exclude: tuples([1, 10], [2, 20], [3, 30]),
      expected: [],
    },
    {
      name: 'forEachKeyNotIn/subtract exclude tree empty yields all include keys',
      include: tuples([1, 10], [3, 30], [5, 50]),
      exclude: tuples(),
      expected: tuples([1, 10], [3, 30], [5, 50]),
    },
    {
      name: 'forEachKeyNotIn/subtract with no overlapping keys returns include tree contents',
      include: tuples([1, 10], [3, 30], [5, 50]),
      exclude: tuples([0, 100], [2, 200], [4, 400]),
      expected: tuples([1, 10], [3, 30], [5, 50]),
    },
    {
      name: 'forEachKeyNotIn/subtract with overlapping keys excludes matches',
      include: tuples([1, 10], [2, 20], [3, 30], [4, 40], [5, 50]),
      exclude: tuples([0, 100], [2, 200], [4, 400], [6, 600]),
      expected: tuples([1, 10], [3, 30], [5, 50]),
    },
    {
      name: 'forEachKeyNotIn/subtract excludes leading overlap then emits remaining keys',
      include: tuples([1, 10], [2, 20], [3, 30], [4, 40]),
      exclude: tuples([1, 100], [2, 200]),
      expected: tuples([3, 30], [4, 40]),
    },
    {
      name: 'forEachKeyNotIn/subtract exclude superset yields empty result',
      include: tuples([2, 200], [3, 300]),
      exclude: tuples([1, 100], [2, 200], [3, 300], [4, 400]),
      expected: [],
    },
  ];

  BASIC_CASES.forEach(({ name, include, exclude, expected }) => {
    it(name, () => {
      const includeTree = buildTreeForFanout(include);
      const excludeTree = buildTreeForFanout(exclude);
      expectForEachKeyNotInAndSubtractCalls(includeTree, excludeTree, expected);
    });
  });

  it('forEachKeyNotIn/subtract maintains tree contents', () => {
    const includeEntries: Array<[number, number]> = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]];
    const excludeEntries: Array<[number, number]> = [[1, 100], [3, 300], [5, 500]];
    const includeTree = buildTreeForFanout(includeEntries);
    const excludeTree = buildTreeForFanout(excludeEntries);
    const includeBefore = includeTree.toArray();
    const excludeBefore = excludeTree.toArray();
    expectForEachKeyNotInAndSubtractCalls(includeTree, excludeTree, tuples([2, 20], [4, 40]));
    expect(includeTree.toArray()).toEqual(includeBefore);
    expect(excludeTree.toArray()).toEqual(excludeBefore);
    includeTree.checkValid();
    excludeTree.checkValid();
  });

  it('forEachKeyNotIn/subtract with contiguous overlap yields sorted survivors', () => {
    const includeTree = buildTreeForFanout(tuples([1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]));
    const excludeTree = buildTreeForFanout(tuples([3, 30], [4, 40], [5, 50]));
    runForEachKeyNotInAndSubtract(includeTree, excludeTree, (calls) => {
      expect(calls.map(c => c.key)).toEqual([1, 2, 6]);
      expect(calls.map(c => c.value)).toEqual([1, 2, 6]);
    });
  });

  it('forEachKeyNotIn/subtract large subtraction leaves prefix and suffix ranges', () => {
    const size = 1000;
    const excludeStart = 200;
    const excludeSpan = 500;
    const includeEntries = Array.from({ length: size }, (_, i) => [i, i * 2] as [number, number]);
    const excludeEntries = Array.from({ length: excludeSpan }, (_, i) => {
      const key = i + excludeStart;
      return [key, key * 3] as [number, number];
    });
    const includeTree = buildTreeForFanout(includeEntries);
    const excludeTree = buildTreeForFanout(excludeEntries);
    runForEachKeyNotInAndSubtract(includeTree, excludeTree, (calls) => {
      expect(calls.length).toBe(size - excludeSpan);
      expect(calls[0]).toEqual({ key: 0, value: 0 });
      const lastCall = calls[calls.length - 1];
      expect(lastCall.key).toBe(size - 1);
      expect(lastCall.value).toBe((size - 1) * 2);
      expect(calls.filter(c => c.key >= excludeStart && c.key < excludeStart + excludeSpan)).toEqual([]);
    });
  });

  it('forEachKeyNotIn/subtract tree with itself visits no keys', () => {
    const entries = Array.from({ length: 20 }, (_, i) => [i, i * 2] as [number, number]);
    const tree = buildTreeForFanout(entries);
    expectForEachKeyNotInAndSubtractCalls(tree, tree, []);
  });

  it('subtract returns a cloned tree when nothing is removed', () => {
    const includeTree = buildTreeForFanout(tuples([1, 10], [2, 20]));
    const excludeTree = buildTreeForFanout(tuples([3, 30]));
    const result = subtract<BTreeEx<number, number>, number, number>(includeTree, excludeTree);
    expect(result).not.toBe(includeTree);
    expect(result.toArray()).toEqual(includeTree.toArray());
    expect(excludeTree.toArray()).toEqual(tuples([3, 30]));
    includeTree.checkValid();
    result.checkValid();
    excludeTree.checkValid();
  });

  it('forEachKeyNotIn/subtract arguments determine surviving keys', () => {
    const tree1 = buildTreeForFanout(tuples([1, 100], [2, 200], [4, 400]));
    const tree2 = buildTreeForFanout(tuples([2, 20], [3, 30], [4, 40]));
    expectForEachKeyNotInAndSubtractCalls(tree1, tree2, tuples([1, 100]));
    expectForEachKeyNotInAndSubtractCalls(tree2, tree1, tuples([3, 30]));
  });
});

describe('BTree forEachKeyNotIn early exiting', () => {
  const buildTreeForEarlyExit = (entries: Array<[number, number]>) =>
    buildTree(entries, 4);

  it('forEachKeyNotIn returns undefined when callback returns void', () => {
    const includeTree = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30]));
    const excludeTree = buildTreeForEarlyExit(tuples([2, 200]));
    const visited: number[] = [];
    const result = forEachKeyNotIn(includeTree, excludeTree, key => {
      visited.push(key);
    });
    expect(result).toBeUndefined();
    expect(visited).toEqual([1, 3]);
  });

  it('forEachKeyNotIn ignores undefined break values and completes traversal', () => {
    const includeTree = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30], [4, 40]));
    const excludeTree = buildTreeForEarlyExit(tuples([2, 200]));
    const visited: number[] = [];
    const result = forEachKeyNotIn(includeTree, excludeTree, key => {
      visited.push(key);
      return { break: undefined };
    });
    expect(result).toBeUndefined();
    expect(visited).toEqual([1, 3, 4]);
  });

  it('forEachKeyNotIn breaks early when callback returns a value', () => {
    const includeTree = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30], [4, 40]));
    const excludeTree = buildTreeForEarlyExit(tuples([2, 200]));
    const visited: number[] = [];
    const breakResult = forEachKeyNotIn(includeTree, excludeTree, (key, value) => {
      visited.push(key);
      if (key === 3) {
        return { break: { key, value } };
      }
    });
    expect(breakResult).toEqual({ key: 3, value: 30 });
    expect(visited).toEqual([1, 3]);
  });
});

describe('BTree forEachKeyNotIn and subtract input/output validation', () => {
  it('forEachKeyNotIn throws error when comparators differ', () => {
    const includeTree = new BTreeEx<number, number>([[1, 10]], (a, b) => b - a);
    const excludeTree = new BTreeEx<number, number>([[2, 20]], (a, b) => a + b);
    expect(() => forEachKeyNotIn(includeTree, excludeTree, () => { })).toThrow(comparatorErrorMsg);
  });

  it('subtract throws error when comparators differ', () => {
    const includeTree = new BTreeEx<number, number>([[1, 10]], (a, b) => b - a);
    const excludeTree = new BTreeEx<number, number>([[2, 20]], (a, b) => a + b);
    expect(() => subtract<BTreeEx<number, number>, number, number>(includeTree, excludeTree)).toThrow(comparatorErrorMsg);
  });

  it('subtract throws error when branching factors differ', () => {
    const includeTree = new BTreeEx<number, number>([[1, 10]], (a, b) => a - b, 4);
    const excludeTree = new BTreeEx<number, number>([[2, 20]], includeTree._compare, 8);
    expect(() => subtract<BTreeEx<number, number>, number, number>(includeTree, excludeTree)).toThrow(branchingFactorErrorMsg);
  });
});

describe('BTree forEachKeyNotIn/subtract fuzz tests', () => {
  const FUZZ_SETTINGS: SetOperationFuzzSettings = {
    branchingFactors: [4, 5, 32],
    ooms: [2, 3],
    fractionsPerOOM: [0.1, 0.25, 0.5],
    removalChances: [0, 0.01, 0.1]
  };

  const FUZZ_TIMEOUT_MS = 30_000;
  jest.setTimeout(FUZZ_TIMEOUT_MS);

  const rng = new MersenneTwister(0xBAD_C0DE);

  forEachFuzzCase(FUZZ_SETTINGS, ({ maxNodeSize, size, fractionA, fractionB, removalChance, removalLabel }) => {
    it(`branch ${maxNodeSize}, size ${size}, fractionA ${fractionA.toFixed(2)}, fractionB ${fractionB.toFixed(2)}, removal ${removalLabel}`, () => {
      const treeA = new BTreeEx<number, number>([], compareNumbers, maxNodeSize);
      const treeB = new BTreeEx<number, number>([], compareNumbers, maxNodeSize);
      const [treeAEntries, treeBEntries] = populateFuzzTrees(
        [
          { tree: treeA, fraction: fractionA, removalChance },
          { tree: treeB, fraction: fractionB, removalChance }
        ],
        { rng, size, compare: compareNumbers, maxNodeSize, minAssignmentsPerKey: 1 }
      );

      const bMap = new Map<number, number>(treeBEntries);
      const aMap = new Map<number, number>(treeAEntries);

      const expectedA = treeAEntries.filter(([key]) => !bMap.has(key));
      const expectedB = treeBEntries.filter(([key]) => !aMap.has(key));

      expectForEachKeyNotInAndSubtractCalls(treeA, treeB, expectedA);
      expectForEachKeyNotInAndSubtractCalls(treeB, treeA, expectedB);

      expectTreeMatchesEntries(treeA, treeAEntries);
      expectTreeMatchesEntries(treeB, treeBEntries);
      treeA.checkValid();
      treeB.checkValid();
    });
  });
});
