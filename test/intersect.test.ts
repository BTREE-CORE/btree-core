import BTreeEx from '../extended';
import intersect from '../extended/intersect';
import { comparatorErrorMsg } from '../extended/shared';
import MersenneTwister from 'mersenne-twister';
import {
  expectTreeMatchesEntries,
  forEachFuzzCase,
  populateFuzzTrees,
  SetOperationFuzzSettings,
  compareNumbers
} from './shared';

type SharedCall = { key: number, leftValue: number, rightValue: number };

const runForEachKeyInBothAndIntersect = (
  left: BTreeEx<number, number>,
  right: BTreeEx<number, number>,
  assertion: (calls: SharedCall[]) => void
) => {
  const forEachCalls: SharedCall[] = [];
  left.forEachKeyInBoth(right, (key, leftValue, rightValue) => {
    forEachCalls.push({ key, leftValue, rightValue });
  });
  assertion(forEachCalls);

  const intersectionCalls: SharedCall[] = [];
  const resultTree = intersect<BTreeEx<number, number>, number, number>(left, right, (key, leftValue, rightValue) => {
    intersectionCalls.push({ key, leftValue, rightValue });
    return leftValue;
  });
  const expectedEntries = intersectionCalls.map(({ key, leftValue }) => [key, leftValue] as [number, number]);
  expect(resultTree.toArray()).toEqual(expectedEntries);
  resultTree.checkValid();
  assertion(intersectionCalls);
};

const expectForEachKeyInBothAndIntersectCalls = (
  left: BTreeEx<number, number>,
  right: BTreeEx<number, number>,
  expected: Array<[number, number, number]>
) => {
  const expectedRecords = tuplesToRecords(expected);
  runForEachKeyInBothAndIntersect(left, right, (calls) => {
    expect(calls).toEqual(expectedRecords);
  });
};

const tuplesToRecords = (entries: Array<[number, number, number]>): SharedCall[] =>
  entries.map(([key, leftValue, rightValue]) => ({ key, leftValue, rightValue }));

const tuples = (...pairs: Array<[number, number]>) => pairs;
const triples = (...triplets: Array<[number, number, number]>) => triplets;
const buildTree = (entries: Array<[number, number]>, maxNodeSize: number) =>
  new BTreeEx<number, number>(entries, compareNumbers, maxNodeSize);

describe.each([32, 10, 4])('BTree forEachKeyInBoth/intersect tests with fanout %i', (maxNodeSize) => {
  const buildTreeForFanout = (entries: Array<[number, number]>) => buildTree(entries, maxNodeSize);

  const BASIC_CASES: Array<{
    name: string;
    left: Array<[number, number]>;
    right: Array<[number, number]>;
    expected: Array<[number, number, number]>;
    alsoCheckSwap?: boolean;
  }> = [
    {
      name: 'forEachKeyInBoth/intersect two empty trees',
      left: tuples(),
      right: tuples(),
      expected: triples(),
    },
    {
      name: 'forEachKeyInBoth/intersect empty tree with non-empty tree',
      left: tuples(),
      right: tuples([1, 10], [2, 20], [3, 30]),
      expected: triples(),
      alsoCheckSwap: true,
    },
    {
      name: 'forEachKeyInBoth/intersect with no overlapping keys',
      left: tuples([1, 10], [3, 30], [5, 50]),
      right: tuples([2, 20], [4, 40], [6, 60]),
      expected: triples(),
    },
    {
      name: 'forEachKeyInBoth/intersect with single overlapping key',
      left: tuples([1, 10], [2, 20], [3, 30]),
      right: tuples([0, 100], [2, 200], [4, 400]),
      expected: triples([2, 20, 200]),
    },
  ];

  BASIC_CASES.forEach(({ name, left, right, expected, alsoCheckSwap }) => {
    it(name, () => {
      const leftTree = buildTreeForFanout(left);
      const rightTree = buildTreeForFanout(right);
      expectForEachKeyInBothAndIntersectCalls(leftTree, rightTree, expected);
      if (alsoCheckSwap) {
        expectForEachKeyInBothAndIntersectCalls(rightTree, leftTree, expected);
      }
    });
  });

  it('forEachKeyInBoth/intersect with multiple overlapping keys maintains tree contents', () => {
    const leftEntries: Array<[number, number]> = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]];
    const rightEntries: Array<[number, number]> = [[0, 100], [2, 200], [4, 400], [6, 600]];
    const tree1 = buildTreeForFanout(leftEntries);
    const tree2 = buildTreeForFanout(rightEntries);
    const leftBefore = tree1.toArray();
    const rightBefore = tree2.toArray();
    expectForEachKeyInBothAndIntersectCalls(tree1, tree2, triples([2, 20, 200], [4, 40, 400]));
    expect(tree1.toArray()).toEqual(leftBefore);
    expect(tree2.toArray()).toEqual(rightBefore);
    tree1.checkValid();
    tree2.checkValid();
  });

  it('forEachKeyInBoth/intersect with contiguous overlap yields sorted keys', () => {
    const tree1 = buildTreeForFanout(tuples([1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]));
    const tree2 = buildTreeForFanout(tuples([3, 30], [4, 40], [5, 50], [6, 60], [7, 70]));
    runForEachKeyInBothAndIntersect(tree1, tree2, (calls) => {
      expect(calls.map(c => c.key)).toEqual([3, 4, 5, 6]);
      expect(calls.map(c => c.leftValue)).toEqual([3, 4, 5, 6]);
      expect(calls.map(c => c.rightValue)).toEqual([30, 40, 50, 60]);
    });
  });

  it('forEachKeyInBoth/intersect large overlapping range counts each shared key once', () => {
    const size = 1000;
    const overlapStart = 500;
    const leftEntries = Array.from({ length: size }, (_, i) => [i, i * 3] as [number, number]);
    const rightEntries = Array.from({ length: size }, (_, i) => {
      const key = i + overlapStart;
      return [key, key * 7] as [number, number];
    });
    const tree1 = buildTreeForFanout(leftEntries);
    const tree2 = buildTreeForFanout(rightEntries);
    runForEachKeyInBothAndIntersect(tree1, tree2, (calls) => {
      expect(calls.length).toBe(size - overlapStart);
      expect(calls[0]).toEqual({
        key: overlapStart,
        leftValue: overlapStart * 3,
        rightValue: overlapStart * 7
      });
      const lastCall = calls[calls.length - 1];
      expect(lastCall.key).toBe(size - 1);
      expect(lastCall.leftValue).toBe((size - 1) * 3);
      expect(lastCall.rightValue).toBe((size - 1) * 7);
    });
  });

  it('forEachKeyInBoth/intersect tree with itself visits each key once', () => {
    const entries = Array.from({ length: 20 }, (_, i) => [i, i * 2] as [number, number]);
    const tree = buildTreeForFanout(entries);
    runForEachKeyInBothAndIntersect(tree, tree, (calls) => {
      expect(calls.length).toBe(entries.length);
      for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        expect(calls[i]).toEqual({ key, leftValue: value, rightValue: value });
      }
    });
  });

  it('forEachKeyInBoth/intersect arguments determine left/right values', () => {
    const tree1 = buildTreeForFanout(tuples([1, 100], [2, 200], [4, 400]));
    const tree2 = buildTreeForFanout(tuples([2, 20], [3, 30], [4, 40]));
    expectForEachKeyInBothAndIntersectCalls(tree1, tree2, triples([2, 200, 20], [4, 400, 40]));
    expectForEachKeyInBothAndIntersectCalls(tree2, tree1, triples([2, 20, 200], [4, 40, 400]));
  });
});

describe('BTree forEachKeyInBoth early exiting', () => {
  const buildTreeForEarlyExit = (entries: Array<[number, number]>) =>
    buildTree(entries, 4);

  it('forEachKeyInBoth returns undefined when callback returns void', () => {
    const tree1 = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30]));
    const tree2 = buildTreeForEarlyExit(tuples([0, 100], [2, 200], [3, 300], [4, 400]));
    const visited: number[] = [];
    const result = tree1.forEachKeyInBoth(tree2, key => {
      visited.push(key);
    });
    expect(result).toBeUndefined();
    expect(visited).toEqual([2, 3]);
  });

  it('forEachKeyInBoth ignores undefined break values and completes traversal', () => {
    const tree1 = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30]));
    const tree2 = buildTreeForEarlyExit(tuples([2, 200], [3, 300], [5, 500]));
    const visited: number[] = [];
    const result = tree1.forEachKeyInBoth(tree2, key => {
      visited.push(key);
      return { break: undefined };
    });
    expect(result).toBeUndefined();
    expect(visited).toEqual([2, 3]);
  });

  it('forEachKeyInBoth breaks early when callback returns a value', () => {
    const tree1 = buildTreeForEarlyExit(tuples([1, 10], [2, 20], [3, 30], [4, 40]));
    const tree2 = buildTreeForEarlyExit(tuples([2, 200], [3, 300], [4, 400], [5, 500]));
    const visited: number[] = [];
    const breakResult = tree1.forEachKeyInBoth(tree2, (key, leftValue, rightValue) => {
      visited.push(key);
      if (key === 3) {
        return { break: { key, sum: leftValue + rightValue } };
      }
    });
    expect(breakResult).toEqual({ key: 3, sum: 330 });
    expect(visited).toEqual([2, 3]);
  });
});

describe('BTree forEachKeyInBoth and intersect input/output validation', () => {
  it('forEachKeyInBoth throws error when comparators differ', () => {
    const tree1 = new BTreeEx<number, number>([[1, 10]], (a, b) => b + a);
    const tree2 = new BTreeEx<number, number>([[2, 20]], (a, b) => b - a);
    expect(() => tree1.forEachKeyInBoth(tree2, () => { })).toThrow(comparatorErrorMsg);
    expect(() => intersect<BTreeEx<number, number>, number, number>(tree1, tree2, () => 0)).toThrow(comparatorErrorMsg);
  });
});

describe('BTree forEachKeyInBoth/intersect fuzz tests', () => {
  const FUZZ_SETTINGS: SetOperationFuzzSettings = {
    branchingFactors: [4, 5, 32],
    ooms: [2, 3],
    fractionsPerOOM: [0.1, 0.25, 0.5],
    removalChances: [0, 0.01, 0.1]
  };

  const FUZZ_TIMEOUT_MS = 30_000;
  jest.setTimeout(FUZZ_TIMEOUT_MS);

  const rng = new MersenneTwister(0xC0FFEE);

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
      const expectedTuples: Array<[number, number, number]> = [];
      for (const [key, leftValue] of treeAEntries) {
        const rightValue = bMap.get(key);
        if (rightValue !== undefined)
          expectedTuples.push([key, leftValue, rightValue]);
      }

      expectForEachKeyInBothAndIntersectCalls(treeA, treeB, expectedTuples);
      const swappedExpected = expectedTuples.map(([key, leftValue, rightValue]) => [key, rightValue, leftValue] as [number, number, number]);
      expectForEachKeyInBothAndIntersectCalls(treeB, treeA, swappedExpected);

      expectTreeMatchesEntries(treeA, treeAEntries);
      expectTreeMatchesEntries(treeB, treeBEntries);
      treeA.checkValid(true);
      treeB.checkValid(true);
    });
  });
});
