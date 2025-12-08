import BTree, { BNode, BNodeInternal } from '../b+tree';
import BTreeEx from '../extended';
import { bulkLoad } from '../extended/bulkLoad';
import MersenneTwister from 'mersenne-twister';
import { makeArray, randomInt } from './shared';

type Pair = [number, number];
const compareNumbers = (a: number, b: number) => a - b;
const branchingFactors = [4, 10, 32, 128];

function sequentialPairs(count: number, start = 0, step = 1): Pair[] {
  const pairs: Pair[] = [];
  let key = start;
  for (let i = 0; i < count; i++) {
    pairs.push([key, key * 2]);
    key += step;
  }
  return pairs;
}

function pairsFromKeys(keys: number[]): Pair[] {
  return keys.map((key, index) => [key, index - key]);
}

function toParallelArrays(pairs: Pair[]): { keys: number[]; values: number[] } {
  const keys = new Array<number>(pairs.length);
  const values = new Array<number>(pairs.length);
  for (let i = 0; i < pairs.length; i++) {
    const [key, value] = pairs[i];
    keys[i] = key;
    values[i] = value;
  }
  return { keys, values };
}

function buildTreeFromPairs(maxNodeSize: number, pairs: Pair[], loadFactor: number) {
  const { keys, values } = toParallelArrays(pairs);
  const tree = bulkLoad<number, number>(keys, values, maxNodeSize, compareNumbers, loadFactor);
  const root = tree['_root'] as BNode<number, number>;
  return { tree, root };
}

function expectTreeMatches(tree: BTree<number, number>, expected: Pair[]) {
  tree.checkValid(true);
  expect(tree.size).toBe(expected.length);
  expect(tree.toArray()).toEqual(expected);
}

function collectLeaves(node: BNode<number, number>): BNode<number, number>[] {
  if (node.isLeaf)
    return [node];
  const internal = node as unknown as BNodeInternal<number, number>;
  const leaves: BNode<number, number>[] = [];
  for (const child of internal.children)
    leaves.push(...collectLeaves(child as BNode<number, number>));
  return leaves;
}

function assertInternalNodeFanout(node: BNode<number, number>, maxNodeSize: number, isRoot = true) {
  if (node.isLeaf)
    return;
  const internal = node as unknown as BNodeInternal<number, number>;
  if (isRoot) {
    expect(internal.children.length).toBeGreaterThanOrEqual(2);
  } else {
    expect(internal.children.length).toBeGreaterThanOrEqual(Math.floor(maxNodeSize / 2));
  }
  expect(internal.children.length).toBeLessThanOrEqual(maxNodeSize);
  for (const child of internal.children)
    assertInternalNodeFanout(child as BNode<number, number>, maxNodeSize, false);
}

describe.each(branchingFactors)('bulkLoad fanout %i', (maxNodeSize) => {
  test('throws when keys are not strictly ascending', () => {
    const keys = [3, 2];
    const values = [30, 20];
    expect(() => bulkLoad<number, number>(keys.slice(), values.slice(), maxNodeSize, compareNumbers))
      .toThrow('bulkLoad: entries must be sorted by key in strictly ascending order');
  });

  test('empty input produces empty tree', () => {
    const { tree, root } = buildTreeFromPairs(maxNodeSize, [], 1.0);
    expect(root?.isLeaf).toBe(true);
    expect(root?.keys.length ?? 0).toBe(0);
    expectTreeMatches(tree, []);
  });

  test('single entry stays in one leaf', () => {
    const pairs = sequentialPairs(1, 5);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 1.0);
    expectTreeMatches(tree, pairs);
    const root = tree['_root'] as BNode<number, number>;
    expect(root.isLeaf).toBe(true);
    expect(root.keys).toEqual([5]);
  });

  test('fills a single leaf up to capacity', () => {
    const pairs = sequentialPairs(maxNodeSize, 0, 2);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 1.0);
    expectTreeMatches(tree, pairs);
    const root = tree['_root'] as BNode<number, number>;
    expect(root.isLeaf).toBe(true);
    expect(root.keys.length).toBe(maxNodeSize);
  });

  test('does not produce underfilled nodes if possible', () => {
    const pairs = sequentialPairs(maxNodeSize, 0, 2);
    // despite asking for only 60% load factor, we should still get a full node
    // because splitting into > 1 leaf would cause underfilled nodes
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 0.6);
    expectTreeMatches(tree, pairs);
    const root = tree['_root'] as BNode<number, number>;
    expect(root.isLeaf).toBe(true);
    expect(root.keys.length).toBe(maxNodeSize);
  });

  test('does not mutate the supplied entry list', () => {
    const pairs = sequentialPairs(maxNodeSize, 0, 2);
    const { keys, values } = toParallelArrays(pairs);
    const originalKeys = keys.slice();
    const originalValues = values.slice();
    const tree = bulkLoad<number, number>(keys, values, maxNodeSize, compareNumbers, 0.6);
    expect(keys).toEqual(originalKeys);
    expect(values).toEqual(originalValues);
    expectTreeMatches(tree, pairs);
  });

  test('throws when load factor is too low or too high', () => {
      const pairs = sequentialPairs(maxNodeSize, 0, 2);
      const { keys, values } = toParallelArrays(pairs);
      expect(() => bulkLoad<number, number>(keys.slice(), values.slice(), maxNodeSize, compareNumbers, 0.3)).toThrow();
      expect(() => bulkLoad<number, number>(keys.slice(), values.slice(), maxNodeSize, compareNumbers, 1.1)).toThrow();
  });

  test('distributes keys nearly evenly across leaves when not divisible by fanout', () => {
    const inputSize = maxNodeSize * 3 + Math.floor(maxNodeSize / 2) + 1;
    const pairs = sequentialPairs(inputSize, 10, 3);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 0.8);
    expectTreeMatches(tree, pairs);
    const leaves = collectLeaves(tree['_root'] as BNode<number, number>);
    const leafSizes = leaves.map((leaf) => leaf.keys.length);
    const min = Math.min.apply(Math, leafSizes);
    const max = Math.max.apply(Math, leafSizes);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  test('creates multiple internal layers when leaf count exceeds branching factor', () => {
    const inputSize = maxNodeSize * maxNodeSize + Math.floor(maxNodeSize / 2) + 1;
    const pairs = sequentialPairs(inputSize, 0, 1);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 0.8);
    expectTreeMatches(tree, pairs);
    const root = tree['_root'] as BNode<number, number>;
    expect(root.isLeaf).toBe(false);
    assertInternalNodeFanout(root, maxNodeSize);
  });

  test('loads 10000 entries and preserves all data', () => {
    const keys = makeArray(10000, false, 3);
    const pairs = pairsFromKeys(keys);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 1.0);
    expectTreeMatches(tree, pairs);
    const leaves = collectLeaves(tree['_root'] as BNode<number, number>);
    expect(leaves.length).toBe(Math.ceil(pairs.length / maxNodeSize));
    assertInternalNodeFanout(tree['_root'] as BNode<number, number>, maxNodeSize);
  });

  test('entries with 50% load factor, second layer with exactly half full nodes', () => {
    // Create enough entries to require a second layer that has exactly two nodes when maxNodeSize is even.
    const entryCount = Math.ceil(maxNodeSize / 2) * maxNodeSize;
    const keys = makeArray(entryCount, false, 3);
    const pairs = pairsFromKeys(keys);
    const { tree } = buildTreeFromPairs(maxNodeSize, pairs, 0.5);
    expectTreeMatches(tree, pairs);
  });
});

describe('BTreeEx.bulkLoad', () => {
  test.each(branchingFactors)('creates tree for fanout %i', (maxNodeSize) => {
    const pairs = sequentialPairs(maxNodeSize * 2 + 3, 7, 1);
    const { keys, values } = toParallelArrays(pairs);
    const tree = BTreeEx.bulkLoad<number, number>(keys, values, maxNodeSize, compareNumbers);
    expect(tree).toBeInstanceOf(BTreeEx);
    expectTreeMatches(tree, pairs);
  });
});

describe('bulkLoad fuzz tests', () => {
  const FUZZ_SETTINGS = {
    branchingFactors,
    ooms: [0, 2, 3],
    iterationsPerOOM: 3,
    loadFactors: [0.5, 0.8, 1.0],
    timeoutMs: 30_000,
  } as const;

  jest.setTimeout(FUZZ_SETTINGS.timeoutMs);

  const rng = new MersenneTwister(0xB01C10AD);

  for (const maxNodeSize of FUZZ_SETTINGS.branchingFactors) {
    describe(`fanout ${maxNodeSize}`, () => {
      for (const oom of FUZZ_SETTINGS.ooms) {
        const baseSize = 5 * Math.pow(10, oom);
        for (let iteration = 0; iteration < FUZZ_SETTINGS.iterationsPerOOM; iteration++) {
          for (const loadFactor of FUZZ_SETTINGS.loadFactors) {
            const targetNodeSize = Math.ceil(maxNodeSize * loadFactor);
            const sizeJitter = randomInt(rng, baseSize);
            const size = baseSize + sizeJitter;

            test(`size ${size}, iteration ${iteration}`, () => {
              const keys = makeArray(size, false, 0, rng);
              const pairs = pairsFromKeys(keys).map(([key, value], index) => [key, value + index] as Pair);
              const { tree, root } = buildTreeFromPairs(maxNodeSize, pairs, loadFactor);
              expectTreeMatches(tree, pairs);

              const leaves = collectLeaves(root);
              const leafSizes = leaves.map((leaf) => leaf.keys.length);
              if (pairs.length >= maxNodeSize) {
                const expectedLeafCount = Math.ceil(pairs.length / targetNodeSize);
                expect(leaves.length).toBe(expectedLeafCount);
              }
              const minLeaf = Math.min(...leafSizes);
              const maxLeaf = Math.max(...leafSizes);
              expect(maxLeaf - minLeaf).toBeLessThanOrEqual(1);
            });
          }
        }
      }
    });
  }
});
