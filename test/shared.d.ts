import BTree, { IMap } from '../b+tree';
import SortedArray from '../sorted-array';
import MersenneTwister from 'mersenne-twister';
import BTreeEx from '../extended';
export declare const compareNumbers: (a: number, b: number) => number;
export declare type TreeNodeStats = {
    total: number;
    shared: number;
    newUnderfilled: number;
    averageLoadFactor: number;
};
export declare type TreeEntries = Array<[number, number]>;
export declare type SetOperationFuzzSettings = {
    branchingFactors: number[];
    ooms: number[];
    fractionsPerOOM: number[];
    removalChances: number[];
};
export declare type FuzzCase = {
    maxNodeSize: number;
    oom: number;
    size: number;
    fractionA: number;
    fractionB: number;
    removalChance: number;
    removalLabel: string;
};
export declare function countTreeNodeStats<K, V>(tree: BTree<K, V>): TreeNodeStats;
export declare function logTreeNodeStats(prefix: string, stats: BTreeEx | TreeNodeStats): void;
export declare function randInt(max: number): number;
export declare function expectTreeEqualTo<K, V>(tree: BTree<K, V>, list: SortedArray<K, V>): void;
export declare function addToBoth<K, V>(a: IMap<K, V>, b: IMap<K, V>, k: K, v: V): void;
export declare function makeArray(size: number, randomOrder: boolean, spacing?: number, rng?: MersenneTwister): number[];
export declare const randomInt: (rng: MersenneTwister, maxExclusive: number) => number;
export declare function buildEntriesFromMap(entriesMap: Map<number, number>, compareFn?: (a: number, b: number) => number): TreeEntries;
export declare type FuzzTreeSpec = {
    tree: BTree<number, number>;
    fraction: number;
    removalChance?: number;
};
export declare type PopulateFuzzTreesOptions = {
    size: number;
    rng: MersenneTwister;
    compare: (a: number, b: number) => number;
    maxNodeSize: number;
    minAssignmentsPerKey?: number;
};
export declare function populateFuzzTrees(specs: FuzzTreeSpec[], { size, rng, compare, maxNodeSize, minAssignmentsPerKey }: PopulateFuzzTreesOptions): TreeEntries[];
export declare function applyRemovalRunsToTree(tree: BTree<number, number>, entries: TreeEntries, removalChance: number, branchingFactor: number, rng: MersenneTwister): TreeEntries;
export declare function expectTreeMatchesEntries(tree: BTree<number, number>, entries: TreeEntries): void;
export declare function forEachFuzzCase(settings: SetOperationFuzzSettings, callback: (testCase: FuzzCase) => void): void;
