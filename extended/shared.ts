import BTree, { BNode } from '../b+tree';

/**
 * BTree with access to internal properties.
 * @internal
 */
export type BTreeWithInternals<K, V, TBTree extends BTree<K, V> = BTree<K, V>> = {
  _root: BNode<K, V>;
  _maxNodeSize: number;
  _compare: (a: K, b: K) => number;
} & Omit<TBTree, '_root' | '_maxNodeSize' | '_compare'>;

/**
 * Alternating list storing entries as `[A0, B0, A1, B1, ...]`.
 * @internal
 */
export type AlternatingList<A, B> = Array<A | B>;

/**
 * Builds leaves from the given alternating list of entries.
 * The supplied load factor will be respected if possible, but may be exceeded
 * to ensure the 50% full rule is maintained.
 * Note: if < maxNodeSize entries are provided, only one leaf will be created, which may be underfilled.
 * @param alternatingList The list of entries to build leaves from.
 * @param maxNodeSize The maximum node size (branching factor) for the resulting leaves.
 * @param onLeafCreation Called when a new leaf is created.
 * @param loadFactor Desired load factor for created leaves. Must be between 0.5 and 1.0.
 * @internal
 */
export function makeLeavesFrom<K, V>(
  alternatingList: AlternatingList<K, V>,
  maxNodeSize: number,
  onLeafCreation: (node: BNode<K, V>) => void,
  loadFactor: number
) {
  const totalPairs = alternatingCount(alternatingList);
  if (totalPairs === 0)
    return 0;

  const targetSize = Math.ceil(maxNodeSize * loadFactor);

  // This method creates as many evenly filled leaves as possible from
  // the pending entries. All will be > 50% full if we are creating more than one leaf.
  let remainingLeaves = totalPairs <= maxNodeSize ? 1 : Math.ceil(totalPairs / targetSize);
  let remaining = totalPairs;
  let pairIndex = 0;
  while (remainingLeaves > 0) {
    const chunkSize = Math.ceil(remaining / remainingLeaves);
    const keys = new Array<K>(chunkSize);
    const vals = new Array<V>(chunkSize);
    for (let i = 0; i < chunkSize; i++) {
      keys[i] = alternatingGetFirst(alternatingList, pairIndex);
      vals[i] = alternatingGetSecond(alternatingList, pairIndex);
      pairIndex++;
    }
    remaining -= chunkSize;
    remainingLeaves--;
    const leaf = new BNode<K, V>(keys, vals);
    onLeafCreation(leaf);
  }
};

// ------- Alternating list helpers -------
// These helpers manage a list that alternates between two types of entries.
// Storing data this way avoids small tuple allocations and shows major improvements
// in GC time in benchmarks.

/**
 * Creates an empty alternating list with the specified element types.
 * @internal
 */
export function createAlternatingList<A, B>(): AlternatingList<A, B> {
  return [] as AlternatingList<A, B>;
}

/**
 * Counts the number of `[A, B]` pairs stored in the alternating list.
 * @internal
 */
export function alternatingCount<A, B>(list: AlternatingList<A, B>): number {
  return list.length >> 1;
}

/**
 * Reads the first entry of the pair at the given index.
 * @internal
 */
export function alternatingGetFirst<A, B>(list: AlternatingList<A, B>, index: number): A {
  return list[index << 1] as A;
}

/**
 * Reads the second entry of the pair at the given index.
 * @internal
 */
export function alternatingGetSecond<A, B>(list: AlternatingList<A, B>, index: number): B {
  return list[(index << 1) + 1] as B;
}

/**
 * Appends a pair to the alternating list.
 * @internal
 */
export function alternatingPush<A, B>(list: AlternatingList<A, B>, first: A, second: B): void {
  // Micro benchmarks show this is the fastest way to do this
  list.push(first, second);
}

/**
 * Error message used when comparators differ between trees.
 * @internal
 */
export const comparatorErrorMsg = "Cannot perform set operations on BTrees with different comparators.";

/**
 * Error message used when branching factors differ between trees.
 * @internal
 */
export const branchingFactorErrorMsg = "Cannot perform set operations on BTrees with different max node sizes.";

/**
 * Checks that two trees can be used together in a set operation.
 * @internal
 */
export function checkCanDoSetOperation<K, V>(treeA: BTreeWithInternals<K, V>, treeB: BTreeWithInternals<K, V>, supportsDifferentBranchingFactors: boolean): number {
  if (treeA._compare !== treeB._compare)
    throw new Error(comparatorErrorMsg);

  const branchingFactor = treeA._maxNodeSize;
  if (!supportsDifferentBranchingFactors && branchingFactor !== treeB._maxNodeSize)
    throw new Error(branchingFactorErrorMsg);
  return branchingFactor;
}

/**
 * Helper constructor signature used by set-operation helpers to create a result tree that preserves the input subtype.
 * @internal
 */
export type BTreeConstructor<TBTree extends BTree<K, V>, K, V> = new (entries?: [K, V][], compare?: (a: K, b: K) => number, maxNodeSize?: number) => BTreeWithInternals<K, V, TBTree>;
