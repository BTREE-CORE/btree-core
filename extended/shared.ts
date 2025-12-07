import type { BNode } from '../b+tree';
import BTree from '../b+tree';

export type BTreeWithInternals<K, V> = {
  _root: BNode<K, V>;
  _maxNodeSize: number;
  _compare: (a: K, b: K) => number;
} & Omit<BTree<K, V>, '_root' | '_maxNodeSize' | '_compare'>;
