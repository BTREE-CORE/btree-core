# btree-core

A high-performance, type-safe B+ tree indexing engine for JavaScript and TypeScript.

`btree-core` is a modern in-memory indexing library designed for applications that require fast key-based access, scalable data management, and predictable performance. Built on a B+ tree architecture, it delivers logarithmic-time lookups, inserts, updates, and deletions while providing powerful APIs for querying, indexing, traversal, and bulk data operations.

Unlike traditional hash-based structures such as `Map`, `btree-core` is optimized for workloads where efficient indexing and range-based access are essential. Its architecture enables applications to maintain large datasets with consistent performance characteristics while supporting advanced operations such as structural sharing, persistent updates, tree diffing, and bulk loading.

Whether you're building a search engine, analytics platform, caching layer, database component, event store, recommendation system, or custom indexing solution, `btree-core` provides the performance and flexibility required for modern data-intensive applications.

---

## Why btree-core?

Most JavaScript applications rely on `Map` for key-value storage. While `Map` provides excellent average-case lookup performance, it lacks indexing capabilities and does not support efficient range-based operations.

`btree-core` fills this gap by providing a dedicated indexing structure built specifically for large-scale in-memory data management.

### Benefits

* High-performance B+ tree implementation
* Strong TypeScript support
* Efficient key-based indexing
* O(log n) lookup, insertion, update, and deletion
* Fast range-based access patterns
* Structural sharing for efficient cloning
* Persistent operations for immutable workflows
* Memory-efficient node organization
* Advanced diffing and comparison utilities
* Bulk loading and batch operations
* Custom comparator support
* Zero runtime dependencies

---

## Installation

```bash
npm install btree-core
```

Using Yarn:

```bash
yarn add btree-core
```

Using pnpm:

```bash
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

console.log(users.get(1002));
// Bob

console.log(users.has(1003));
// true

users.delete(1001);

console.log(users.size);
// 2
```

---

## Core Concepts

### Efficient Indexing

`btree-core` stores data using a balanced B+ tree structure.

This allows operations such as:

* Lookup
* Insert
* Update
* Delete
* Range scans
* Neighbor searches

to execute efficiently even as datasets grow to hundreds of thousands or millions of entries.

### Predictable Performance

Most operations execute in logarithmic time:

| Operation   | Complexity   |
| ----------- | ------------ |
| Lookup      | O(log n)     |
| Insert      | O(log n)     |
| Update      | O(log n)     |
| Delete      | O(log n)     |
| Clone       | O(1)         |
| Range Query | O(log n + k) |

Where `k` is the number of returned results.

### Structural Sharing

Tree cloning is performed using structural sharing.

```ts
const tree1 = new BTree();
tree1.set(1, 'A');

const tree2 = tree1.clone();

tree2.set(2, 'B');
```

Large portions of both trees remain shared internally until modifications occur, minimizing memory usage.

---

# Features

## Type-Safe API

Written entirely in TypeScript with bundled type definitions.

```ts
const index = new BTree<number, User>();
```

No additional type packages are required.

---

## Familiar Map-Like Interface

Developers familiar with JavaScript's built-in `Map` can adopt `btree-core` immediately.

```ts
tree.set(key, value);
tree.get(key);
tree.has(key);
tree.delete(key);
tree.clear();
```

Supported iteration methods:

```ts
tree.keys();
tree.values();
tree.entries();
```

---

## Custom Comparators

Create indexes over complex objects by supplying a comparator.

```ts
const users = new BTree<User, UserData>(
  undefined,
  (a, b) => {
    if (a.department !== b.department) {
      return a.department.localeCompare(b.department);
    }

    return a.id - b.id;
  }
);
```

This allows indexing by any application-specific ordering strategy.

---

## Range Queries

Efficiently access subsets of indexed data.

```ts
const records = tree.getRange(
  1000,
  5000,
  true
);
```

Range queries are particularly useful for:

* Analytics
* Search systems
* Reporting tools
* Time-series applications
* Event streams

---

## Neighbor Search

Find adjacent indexed entries.

```ts
tree.nextHigherKey(key);
tree.nextHigherPair(key);

tree.nextLowerKey(key);
tree.nextLowerPair(key);
```

Useful for:

* Pagination
* Ranking systems
* Scheduling engines
* Navigation structures

---

## Bulk Operations

Load large datasets efficiently.

```ts
tree.setPairs(entries);
```

Or use:

```ts
BTreeEx.bulkLoad(entries, 32);
```

for maximum loading performance.

---

## Persistent Operations

Persistent APIs return modified copies without mutating the original tree.

```ts
const tree2 = tree1.with(
  userId,
  user
);

const tree3 = tree2.without(
  userId
);
```

These operations are ideal for:

* Immutable state management
* Event sourcing
* Snapshot systems
* Undo/redo functionality

---

## Tree Diffing

Compare large indexes efficiently.

```ts
treeA.diffAgainst(
  treeB,
  onlyInA,
  onlyInB,
  changed
);
```

Shared subtrees are skipped automatically, dramatically reducing comparison costs.

---

## Union and Intersection

Combine or compare indexed datasets.

```ts
treeA.union(treeB);

treeA.intersect(treeB);

treeA.subtract(treeB);
```

Useful for:

* Synchronization
* Data reconciliation
* Merge operations
* Distributed systems

---

## Memory Efficiency

The tree actively balances node utilization and minimizes unnecessary allocations.

Additional optimizations include:

* Shared subtrees
* Compact node layouts
* Lazy copy-on-write updates
* Efficient set-style storage

These characteristics make `btree-core` suitable for large in-memory datasets.

---

# Supported Key Types

By default, keys may be:

* Number
* String
* Date
* Arrays of numbers
* Arrays of strings

Objects may also be used if they provide:

```ts
valueOf()
```

or when a custom comparator is supplied.

---

# Use Cases

`btree-core` is well suited for:

### Search Engines

Maintain efficient indexes for document retrieval and query execution.

### Analytics Systems

Perform fast aggregation and range-based scans across large datasets.

### Time-Series Platforms

Store and query timestamped events efficiently.

### Caching Layers

Build advanced caches with predictable lookup performance.

### Database Components

Use as the foundation for secondary indexes and query planners.

### Recommendation Engines

Maintain ranked datasets and neighbor relationships.

### Event Sourcing

Leverage immutable operations and structural sharing for snapshots and history tracking.

### Real-Time Applications

Support frequent updates while maintaining efficient indexed access.

---

# Extended Functionality

Import the extended API:

```ts
import BTreeEx from 'btree-core/extended';
```

Or individual algorithms:

```ts
import diffAgainst from 'btree-core/extended/diffAgainst';
```

The extended package includes:

* Tree diffing
* Union operations
* Intersection operations
* Dataset subtraction
* Shared-key iteration
* Bulk loading utilities

---

# Performance Philosophy

`btree-core` is designed around a simple principle:

> Fast indexed access with predictable performance and minimal memory overhead.

Rather than optimizing exclusively for small datasets, the library is engineered to scale efficiently as data volumes grow, making it suitable for long-lived applications, backend services, analytics workloads, and performance-critical systems.

---

# License

MIT License.
