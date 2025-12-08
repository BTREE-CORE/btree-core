import BTree, { BNode, BNodeInternal, check, sumChildSizes } from '../b+tree';
import { makeLeavesFrom, type BTreeWithInternals } from './shared';

/**
 * Loads a B-Tree from a sorted list of entries in bulk. This is faster than inserting
 * entries one at a time, and produces a more optimally balanced tree.
 * Time and space complexity: O(n).
 * @param keys Keys to load, sorted in strictly ascending order.
 * @param values Values corresponding to each key.
 * @param maxNodeSize The branching factor (maximum node size) for the resulting tree.
 * @param compare Function to compare keys.
 * @param loadFactor Desired load factor for created leaves. Must be between 0.5 and 1.0.
 * @returns A new BTree containing the given entries.
 * @throws Error if the entries are not sorted by key in strictly ascending order (duplicates disallowed) or if the load factor is out of the allowed range.
 */
export function bulkLoad<K, V>(
  keys: K[],
  values: V[],
  maxNodeSize: number,
  compare: (a: K, b: K) => number,
  loadFactor = 0.8
): BTree<K, V> {
  const root = bulkLoadRoot<K, V>(keys, values, maxNodeSize, compare, loadFactor);
  const tree = new BTree<K, V>(undefined, compare, maxNodeSize);
  const target = tree as unknown as BTreeWithInternals<K, V>;
  target._root = root;
  //target._size = root.size();
  return tree;
}

/**
 * Bulk loads, returns the root node of the resulting tree.
 * @internal
 */
export function bulkLoadRoot<K, V>(
  keys: K[],
  values: V[],
  maxNodeSize: number,
  compare: (a: K, b: K) => number,
  loadFactor = 0.8
): BNode<K, V> {
  if (loadFactor < 0.5 || loadFactor > 1.0)
    throw new Error("bulkLoad: loadFactor must be between 0.5 and 1.0");

  if (keys.length !== values.length)
    throw new Error("bulkLoad: keys and values arrays must be the same length");

  const totalPairs = keys.length;
  if (totalPairs > 1) {
    let previousKey = keys[0];
    for (let i = 1; i < totalPairs; i++) {
      const key = keys[i];
      if (compare(previousKey, key) >= 0)
        throw new Error("bulkLoad: entries must be sorted by key in strictly ascending order");
      previousKey = key;
    }
  }

  const leaves: BNode<K, V>[] = [];
  makeLeavesFrom(keys, values, maxNodeSize, (leaf) => leaves.push(leaf), loadFactor);
  if (leaves.length === 0)
    return new BNode<K, V>();

  const targetNodeSize = Math.ceil(maxNodeSize * loadFactor);
  const exactlyHalf = targetNodeSize === maxNodeSize / 2;
  const minSize = Math.floor(maxNodeSize / 2);

  let currentLevel: BNode<K, V>[] = leaves;
  while (currentLevel.length > 1) {
    const nodeCount = currentLevel.length;
    if (nodeCount <= maxNodeSize && (nodeCount !== maxNodeSize || !exactlyHalf)) {
      currentLevel = [new BNodeInternal<K, V>(currentLevel, sumChildSizes(currentLevel))];
      break;
    }

    const nextLevelCount = Math.ceil(nodeCount / targetNodeSize);
    check(nextLevelCount > 1);
    const nextLevel = new Array<BNode<K, V>>(nextLevelCount);
    let remainingNodes = nodeCount;
    let remainingParents = nextLevelCount;
    let childIndex = 0;

    for (let i = 0; i < nextLevelCount; i++) {
      const chunkSize = Math.ceil(remainingNodes / remainingParents);
      const children = new Array<BNode<K, V>>(chunkSize);
      let size = 0;
      for (let j = 0; j < chunkSize; j++) {
        const child = currentLevel[childIndex++];
        children[j] = child;
        size += child.size();
      }
      remainingNodes -= chunkSize;
      remainingParents--;
      nextLevel[i] = new BNodeInternal<K, V>(children, size);
    }

    // If last node is underfilled, balance with left sibling
    const secondLastNode = nextLevel[nextLevelCount - 2] as BNodeInternal<K, V>;
    const lastNode = nextLevel[nextLevelCount - 1] as BNodeInternal<K, V>;
    while (lastNode.children.length < minSize)
      lastNode.takeFromLeft(secondLastNode);

    currentLevel = nextLevel;
  }

  return currentLevel[0];
}
