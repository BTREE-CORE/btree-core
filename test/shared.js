"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forEachFuzzCase = exports.expectTreeMatchesEntries = exports.applyRemovalRunsToTree = exports.populateFuzzTrees = exports.buildEntriesFromMap = exports.randomInt = exports.makeArray = exports.addToBoth = exports.expectTreeEqualTo = exports.randInt = exports.logTreeNodeStats = exports.countTreeNodeStats = exports.compareNumbers = void 0;
var mersenne_twister_1 = __importDefault(require("mersenne-twister"));
var rand = new mersenne_twister_1.default(1234);
var compareNumbers = function (a, b) { return a - b; };
exports.compareNumbers = compareNumbers;
function countTreeNodeStats(tree) {
    var root = tree._root;
    if (tree.size === 0 || !root)
        return { total: 0, shared: 0, newUnderfilled: 0, averageLoadFactor: 0 };
    var maxNodeSize = tree.maxNodeSize;
    var minNodeSize = Math.floor(maxNodeSize / 2);
    var visit = function (node, ancestorShared, isRoot) {
        if (!node)
            return { total: 0, shared: 0, newUnderfilled: 0, loadFactorSum: 0 };
        var selfShared = node.isShared === true || ancestorShared;
        var children = node.children;
        var occupancy = children ? children.length : node.keys.length;
        var isUnderfilled = !isRoot && occupancy < minNodeSize;
        var loadFactor = occupancy / maxNodeSize;
        var shared = selfShared ? 1 : 0;
        var total = 1;
        var newUnderfilled = !selfShared && isUnderfilled ? 1 : 0;
        var loadFactorSum = loadFactor;
        if (children) {
            for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                var child = children_1[_i];
                var stats = visit(child, selfShared, false);
                total += stats.total;
                shared += stats.shared;
                newUnderfilled += stats.newUnderfilled;
                loadFactorSum += stats.loadFactorSum;
            }
        }
        return { total: total, shared: shared, newUnderfilled: newUnderfilled, loadFactorSum: loadFactorSum };
    };
    var result = visit(root, false, true);
    var averageLoadFactor = result.total === 0 ? 0 : result.loadFactorSum / result.total;
    return {
        total: result.total,
        shared: result.shared,
        newUnderfilled: result.newUnderfilled,
        averageLoadFactor: averageLoadFactor
    };
}
exports.countTreeNodeStats = countTreeNodeStats;
function logTreeNodeStats(label, stats) {
    console.log("\tShared nodes (".concat(label, "): ").concat(stats.shared, "/").concat(stats.total));
    console.log("\tUnderfilled nodes (".concat(label, "): ").concat(stats.newUnderfilled, "/").concat(stats.total));
    var percent = (stats.averageLoadFactor * 100).toFixed(2);
    console.log("\tAverage load factor (".concat(label, "): ").concat(percent, "%"));
}
exports.logTreeNodeStats = logTreeNodeStats;
function randInt(max) {
    return rand.random_int() % max;
}
exports.randInt = randInt;
function expectTreeEqualTo(tree, list) {
    tree.checkValid();
    expect(tree.toArray()).toEqual(list.getArray());
}
exports.expectTreeEqualTo = expectTreeEqualTo;
function addToBoth(a, b, k, v) {
    expect(a.set(k, v)).toEqual(b.set(k, v));
}
exports.addToBoth = addToBoth;
function makeArray(size, randomOrder, spacing, rng) {
    if (spacing === void 0) { spacing = 10; }
    var randomizer = rng !== null && rng !== void 0 ? rng : rand;
    var useGlobalRand = rng === undefined;
    var randomFloat = function () {
        if (typeof randomizer.random === 'function')
            return randomizer.random();
        return Math.random();
    };
    var randomIntWithMax = function (max) {
        if (max <= 0)
            return 0;
        if (useGlobalRand)
            return randInt(max);
        return Math.floor(randomFloat() * max);
    };
    var keys = [];
    var current = 0;
    for (var i = 0; i < size; i++) {
        current += 1 + randomIntWithMax(spacing);
        keys[i] = current;
    }
    if (randomOrder) {
        for (var i = 0; i < size; i++)
            swap(keys, i, randomIntWithMax(size));
    }
    return keys;
}
exports.makeArray = makeArray;
var randomInt = function (rng, maxExclusive) {
    return Math.floor(rng.random() * maxExclusive);
};
exports.randomInt = randomInt;
function swap(keys, i, j) {
    var tmp = keys[i];
    keys[i] = keys[j];
    keys[j] = tmp;
}
function buildEntriesFromMap(entriesMap, compareFn) {
    if (compareFn === void 0) { compareFn = function (a, b) { return a - b; }; }
    var entries = Array.from(entriesMap.entries());
    entries.sort(function (a, b) { return compareFn(a[0], b[0]); });
    return entries;
}
exports.buildEntriesFromMap = buildEntriesFromMap;
function populateFuzzTrees(specs, _a) {
    var size = _a.size, rng = _a.rng, compare = _a.compare, maxNodeSize = _a.maxNodeSize, _b = _a.minAssignmentsPerKey, minAssignmentsPerKey = _b === void 0 ? 0 : _b;
    if (specs.length === 0)
        return [];
    var keys = makeArray(size, true, 1, rng);
    var entriesMaps = specs.map(function () { return new Map(); });
    var assignments = new Array(specs.length);
    var requiredAssignments = Math.min(minAssignmentsPerKey, specs.length);
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var value = keys_1[_i];
        var assignedCount = 0;
        for (var i = 0; i < specs.length; i++) {
            assignments[i] = rng.random() < specs[i].fraction;
            if (assignments[i])
                assignedCount++;
        }
        while (assignedCount < requiredAssignments && specs.length > 0) {
            var index = (0, exports.randomInt)(rng, specs.length);
            if (!assignments[index]) {
                assignments[index] = true;
                assignedCount++;
            }
        }
        for (var i = 0; i < specs.length; i++) {
            if (assignments[i]) {
                specs[i].tree.set(value, value);
                entriesMaps[i].set(value, value);
            }
        }
    }
    return specs.map(function (spec, index) {
        var _a;
        var entries = buildEntriesFromMap(entriesMaps[index], compare);
        var removalChance = (_a = spec.removalChance) !== null && _a !== void 0 ? _a : 0;
        if (removalChance > 0)
            entries = applyRemovalRunsToTree(spec.tree, entries, removalChance, maxNodeSize, rng);
        return entries;
    });
}
exports.populateFuzzTrees = populateFuzzTrees;
function applyRemovalRunsToTree(tree, entries, removalChance, branchingFactor, rng) {
    if (removalChance <= 0 || entries.length === 0)
        return entries;
    var remaining = [];
    var index = 0;
    while (index < entries.length) {
        var _a = entries[index], key = _a[0], value = _a[1];
        if (rng.random() < removalChance) {
            tree.delete(key);
            index++;
            while (index < entries.length) {
                var candidateKey = entries[index][0];
                if (rng.random() < (1 / branchingFactor))
                    break;
                tree.delete(candidateKey);
                index++;
            }
        }
        else {
            remaining.push([key, value]);
            index++;
        }
    }
    return remaining;
}
exports.applyRemovalRunsToTree = applyRemovalRunsToTree;
function expectTreeMatchesEntries(tree, entries) {
    var index = 0;
    tree.forEachPair(function (key, value) {
        var expected = entries[index++];
        expect([key, value]).toEqual(expected);
    });
    expect(index).toBe(entries.length);
}
exports.expectTreeMatchesEntries = expectTreeMatchesEntries;
function validateFuzzSettings(settings) {
    settings.fractionsPerOOM.forEach(function (fraction) {
        if (fraction < 0 || fraction > 1)
            throw new Error('fractionsPerOOM values must be between 0 and 1');
    });
    settings.removalChances.forEach(function (chance) {
        if (chance < 0 || chance > 1)
            throw new Error('removalChances values must be between 0 and 1');
    });
}
function forEachFuzzCase(settings, callback) {
    validateFuzzSettings(settings);
    for (var _i = 0, _a = settings.branchingFactors; _i < _a.length; _i++) {
        var maxNodeSize = _a[_i];
        for (var _b = 0, _c = settings.removalChances; _b < _c.length; _b++) {
            var removalChance = _c[_b];
            var removalLabel = removalChance.toFixed(3);
            for (var _d = 0, _e = settings.ooms; _d < _e.length; _d++) {
                var oom = _e[_d];
                var size = 5 * Math.pow(10, oom);
                for (var _f = 0, _g = settings.fractionsPerOOM; _f < _g.length; _f++) {
                    var fractionA = _g[_f];
                    var fractionB = 1 - fractionA;
                    callback({ maxNodeSize: maxNodeSize, oom: oom, size: size, fractionA: fractionA, fractionB: fractionB, removalChance: removalChance, removalLabel: removalLabel });
                }
            }
        }
    }
}
exports.forEachFuzzCase = forEachFuzzCase;
