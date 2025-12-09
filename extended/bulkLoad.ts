import BTree, { BNode, BNodeInternal, check, fixMaxSize, sumChildSizes } from '../b+tree';
import { makeLeavesFrom as makeAllLeafNodes, type BTreeWithInternals } from './shared';

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
  maxNodeSize = fixMaxSize(maxNodeSize);

  // Verify keys are sorted
  const totalPairs = keys.length;
  if (totalPairs > 1) {
    let previousKey = keys[0];
    for (let i = 1; i < totalPairs; i++) {
      const key = keys[i];
      if (compare(previousKey, key) >= 0)
        throw new Error("bulkLoad: keys must be sorted in strictly ascending order");
      previousKey = key;
    }
  }

  // Get ALL the leaf nodes with which the tree will be populated
  let currentNodes: BNode<K, V>[] = [];
  makeAllLeafNodes(keys, values, maxNodeSize, loadFactor, currentNodes.push.bind(currentNodes));
  if (currentNodes.length === 0)
    return new BNode<K, V>();

  const targetNodeSize = Math.ceil(maxNodeSize * loadFactor);
  const isExactlyHalf = targetNodeSize === maxNodeSize / 2;
  const minSize = Math.floor(maxNodeSize / 2);

  for (let nextLevel; currentNodes.length > 1; currentNodes = nextLevel) {
    const nodeCount = currentNodes.length;
    if (nodeCount <= maxNodeSize && (nodeCount !== maxNodeSize || !isExactlyHalf)) {
      currentNodes = [new BNodeInternal<K, V>(currentNodes, sumChildSizes(currentNodes))];
      break;
    }

    const nextLevelCount = Math.ceil(nodeCount / targetNodeSize);
    check(nextLevelCount > 1);
    nextLevel = new Array<BNode<K, V>>(nextLevelCount);
    let remainingNodes = nodeCount;
    let remainingParents = nextLevelCount;
    let childIndex = 0;

    for (let i = 0; i < nextLevelCount; i++) {
      const chunkSize = Math.ceil(remainingNodes / remainingParents);
      const children = new Array<BNode<K, V>>(chunkSize);
      let size = 0;
      for (let j = 0; j < chunkSize; j++) {
        const child = currentNodes[childIndex++];
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
  }

  return currentNodes[0];
}
