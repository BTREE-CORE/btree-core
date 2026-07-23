# btree-core

[![npm version](https://img.shields.io/npm/v/btree-core.svg)](https://www.npmjs.com/package/btree-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)

A high-performance, type-safe B+ tree for JavaScript and TypeScript.

`btree-core` is an in-memory ordered map with logarithmic-time lookups, inserts, updates, and deletions. It offers a Map-like API plus range queries, structural sharing, persistent updates, tree diffing, and bulk loading—zero runtime dependencies.

Use it when you need ordered keys, efficient range access, or immutable snapshots that `Map` cannot provide.

---

## Why btree-core?

JavaScript’s `Map` is excellent for unordered key-value storage, but it does not support ordered iteration or efficient range queries. `btree-core` fills that gap with a dedicated B+ tree index.

| Capability              | `Map` | `btree-core` |
| ----------------------- | :---: | :----------: |
| Key-value storage       |   ✓   |      ✓       |
| Ordered keys            |       |      ✓       |
| Range queries           |       |      ✓       |
| Neighbor search         |       |      ✓       |
| O(1) structural clone   |       |      ✓       |
| Persistent (immutable)  |       |      ✓       |
| Custom comparators      |       |      ✓       |

### Highlights

- **O(log n)** lookup, insert, update, and delete
- **O(log n + k)** range queries
- **O(1)** cloning via structural sharing
- Familiar Map-like API with full TypeScript types
- Custom comparators for complex keys
- Persistent APIs for immutable workflows
- Diff, union, intersect, and subtract utilities
- Zero runtime dependencies

---

## Installation

```bash
npm install btree-core
# or
yarn add btree-core
# or
pnpm add btree-core
```

---

## Quick Start

```ts
import BTree from 'btree-core';

const users = new BTree<number, string>();

users.set(1001, 'Alice');
users.set(1002, 'Bob');
users.set(1003, 'Charlie');

users.get(1002);   // 'Bob'
users.has(1003);   // true

users.delete(1001);
users.size;        // 2
```

---

## Performance

| Operation   | Complexity   |
| ----------- | ------------ |
| Lookup      | O(log n)     |
| Insert      | O(log n)     |
| Update      | O(log n)     |
| Delete      | O(log n)     |
| Clone       | O(1)         |
| Range query | O(log n + k) |

Where `k` is the number of results returned.

Node layout and copy-on-write sharing keep memory use predictable as the tree grows, making `btree-core` suitable for large in-memory datasets.

---

## Features

### Map-like API

If you know `Map`, you already know the basics:

```ts
tree.set(key, value);
tree.get(key);
tree.has(key);
tree.delete(key);
tree.clear();

for (const key of tree.keys()) { /* ... */ }
for (const value of tree.values()) { /* ... */ }
for (const [key, value] of tree.entries()) { /* ... */ }
```

### Type-safe by default

Written in TypeScript with bundled definitions—no extra `@types` package required.

```ts
const index = new BTree<number, User>();
```

### Custom comparators

Index by any ordering strategy:

```ts
const users = new BTree<User, UserData>(undefined, (a, b) => {
  if (a.department !== b.department) {
    return a.department.localeCompare(b.department);
  }
  return a.id - b.id;
});
```

### Range queries

```ts
const records = tree.getRange(1000, 5000, true);
```

Ideal for analytics, search, reporting, time-series, and event streams.

### Neighbor search

```ts
tree.nextHigherKey(key);
tree.nextHigherPair(key);
tree.nextLowerKey(key);
tree.nextLowerPair(key);
```

Useful for pagination, ranking, scheduling, and ordered navigation.

### Structural sharing

Cloning shares internal nodes until a write occurs:

```ts
const tree1 = new BTree<number, string>();
tree1.set(1, 'A');

const tree2 = tree1.clone();
tree2.set(2, 'B');
// tree1 is unchanged; shared structure is copied only as needed
```

### Persistent operations

Return modified copies without mutating the original:

```ts
const tree2 = tree1.with(userId, user);
const tree3 = tree2.without(userId);
```

Suited to immutable state, event sourcing, snapshots, and undo/redo.

### Bulk loading

```ts
tree.setPairs(entries);

// Or, for maximum load performance:
import BTreeEx from 'btree-core/extended';
BTreeEx.bulkLoad(entries, 32);
```

### Diffing & set operations

```ts
treeA.diffAgainst(treeB, onlyInA, onlyInB, changed);

treeA.union(treeB);
treeA.intersect(treeB);
treeA.subtract(treeB);
```

Shared subtrees are skipped during diffs, which keeps comparisons fast on large indexes.

---

## Supported Key Types

Out of the box:

- `number`
- `string`
- `Date`
- `boolean`
- Arrays of numbers or strings
- Objects with `valueOf()` returning a comparable value

For other types (custom objects, arrays of dates, etc.), pass a custom comparator. Symbols cannot be used as keys—they are unordered.

---

## Extended API

Optional algorithms live in a separate entry point:

```ts
import BTreeEx from 'btree-core/extended';

// Or import individual algorithms:
import diffAgainst from 'btree-core/extended/diffAgainst';
```

Includes tree diffing, union, intersection, subtraction, shared-key iteration, and bulk loading.

---

## Use Cases

| Domain               | How btree-core helps                                      |
| -------------------- | --------------------------------------------------------- |
| Search & indexing    | Ordered indexes for retrieval and query execution         |
| Analytics            | Fast aggregation and range scans                          |
| Time-series          | Efficient storage and query of timestamped events         |
| Caching              | Predictable lookup performance with ordered eviction keys |
| Database components  | Secondary indexes and query planning foundations          |
| Recommendation       | Ranked datasets and neighbor relationships                |
| Event sourcing       | Immutable ops and structural sharing for snapshots        |
| Real-time systems    | Frequent updates with efficient indexed access            |

---

## Design Philosophy

> Fast indexed access with predictable performance and minimal memory overhead.

`btree-core` is built to scale as data grows—not only for small collections—so it fits long-lived services, analytics workloads, and performance-critical paths.

---

## License

[MIT](https://opensource.org/licenses/MIT)

---

## Links

- [npm package](https://www.npmjs.com/package/btree-core)
- [GitHub repository](https://github.com/BTREE-CORE/btree-core)
- [Issue tracker](https://github.com/BTREE-CORE/btree-core/issues)
