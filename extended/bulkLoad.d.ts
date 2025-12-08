import BTree from '../b+tree';
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
export declare function bulkLoad<K, V>(keys: K[], values: V[], maxNodeSize: number, compare: (a: K, b: K) => number, loadFactor?: number): BTree<K, V>;
