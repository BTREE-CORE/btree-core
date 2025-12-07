"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCanDoSetOperation = exports.branchingFactorErrorMsg = exports.comparatorErrorMsg = exports.alternatingPush = exports.alternatingGetSecond = exports.alternatingGetFirst = exports.alternatingCount = exports.createAlternatingList = exports.makeLeavesFrom = void 0;
var b_tree_1 = require("../b+tree");
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
function makeLeavesFrom(alternatingList, maxNodeSize, onLeafCreation, loadFactor) {
    var totalPairs = alternatingCount(alternatingList);
    if (totalPairs === 0)
        return 0;
    var targetSize = Math.ceil(maxNodeSize * loadFactor);
    // This method creates as many evenly filled leaves as possible from
    // the pending entries. All will be > 50% full if we are creating more than one leaf.
    var remainingLeaves = totalPairs <= maxNodeSize ? 1 : Math.ceil(totalPairs / targetSize);
    var remaining = totalPairs;
    var pairIndex = 0;
    while (remainingLeaves > 0) {
        var chunkSize = Math.ceil(remaining / remainingLeaves);
        var keys = new Array(chunkSize);
        var vals = new Array(chunkSize);
        for (var i = 0; i < chunkSize; i++) {
            keys[i] = alternatingGetFirst(alternatingList, pairIndex);
            vals[i] = alternatingGetSecond(alternatingList, pairIndex);
            pairIndex++;
        }
        remaining -= chunkSize;
        remainingLeaves--;
        var leaf = new b_tree_1.BNode(keys, vals);
        onLeafCreation(leaf);
    }
}
exports.makeLeavesFrom = makeLeavesFrom;
;
// ------- Alternating list helpers -------
// These helpers manage a list that alternates between two types of entries.
// Storing data this way avoids small tuple allocations and shows major improvements
// in GC time in benchmarks.
/**
 * Creates an empty alternating list with the specified element types.
 * @internal
 */
function createAlternatingList() {
    return [];
}
exports.createAlternatingList = createAlternatingList;
/**
 * Counts the number of `[A, B]` pairs stored in the alternating list.
 * @internal
 */
function alternatingCount(list) {
    return list.length >> 1;
}
exports.alternatingCount = alternatingCount;
/**
 * Reads the first entry of the pair at the given index.
 * @internal
 */
function alternatingGetFirst(list, index) {
    return list[index << 1];
}
exports.alternatingGetFirst = alternatingGetFirst;
/**
 * Reads the second entry of the pair at the given index.
 * @internal
 */
function alternatingGetSecond(list, index) {
    return list[(index << 1) + 1];
}
exports.alternatingGetSecond = alternatingGetSecond;
/**
 * Appends a pair to the alternating list.
 * @internal
 */
function alternatingPush(list, first, second) {
    // Micro benchmarks show this is the fastest way to do this
    list.push(first, second);
}
exports.alternatingPush = alternatingPush;
/**
 * Error message used when comparators differ between trees.
 * @internal
 */
exports.comparatorErrorMsg = "Cannot perform set operations on BTrees with different comparators.";
/**
 * Error message used when branching factors differ between trees.
 * @internal
 */
exports.branchingFactorErrorMsg = "Cannot perform set operations on BTrees with different max node sizes.";
/**
 * Checks that two trees can be used together in a set operation.
 * @internal
 */
function checkCanDoSetOperation(treeA, treeB, supportsDifferentBranchingFactors) {
    if (treeA._compare !== treeB._compare)
        throw new Error(exports.comparatorErrorMsg);
    var branchingFactor = treeA._maxNodeSize;
    if (!supportsDifferentBranchingFactors && branchingFactor !== treeB._maxNodeSize)
        throw new Error(exports.branchingFactorErrorMsg);
    return branchingFactor;
}
exports.checkCanDoSetOperation = checkCanDoSetOperation;
