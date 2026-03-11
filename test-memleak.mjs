// Isolated test for the ring layer memory leak.
// Tests that completed tweens accumulate in TweenGroup and that
// ThreeDigest's obj.__data back-reference retains removed data.
//
// Run: node --expose-gc test-memleak.mjs

import assert from 'node:assert';
import { Group as TweenGroup, Tween } from '@tweenjs/tween.js';
import DataBindMapper from 'data-bind-mapper';

// ---------- Test 1: TweenGroup never removes completed tweens ----------
function testTweenGroupAccumulation() {
  const group = new TweenGroup();

  // Create 5 tweens that complete instantly (duration=0)
  for (let i = 0; i < 5; i++) {
    const t = new Tween({ v: 0 }).to({ v: 1 }, 0).start(0);
    group.add(t);
  }

  // Update to let them all complete
  group.update(1000);

  const remaining = group.getAll().length;
  console.log(`[TweenGroup] after completion: ${remaining} tweens remain (expect 5 if preserve=true bug)`);
  assert.strictEqual(remaining, 5, 'Completed tweens should remain in group (preserve=true default)');

  // Verify they ARE removed with preserve=false
  group.update(2000, false);
  const afterCleanup = group.getAll().length;
  console.log(`[TweenGroup] after update(t, false): ${afterCleanup} tweens remain (expect 0)`);
  assert.strictEqual(afterCleanup, 0, 'Tweens should be removed with preserve=false');

  console.log('[TweenGroup] PASS: confirmed completed tweens accumulate with default preserve=true\n');
}

// ---------- Test 2: Tween closures retain obj references ----------
function testTweenClosureRetainsObj() {
  const group = new TweenGroup();
  const refs = [];

  for (let i = 0; i < 3; i++) {
    const obj = { id: i, __data: { lat: i, lng: i } };
    const weakRef = new WeakRef(obj.__data);
    refs.push(weakRef);

    const tween = new Tween({ t: 0 })
      .to({ t: 1 }, 0)
      .onComplete(() => {
        // Closure captures obj (simulates ring tween pattern)
        void obj;
      })
      .start(0);
    group.add(tween);
  }

  // Complete all tweens
  group.update(1000);

  // Force GC
  if (global.gc) {
    global.gc();
    // Allow weak refs to settle
    global.gc();
  }

  const alive = refs.filter(r => r.deref() !== undefined).length;
  console.log(`[Closure retention] ${alive}/3 data objects still alive (expect 3 since tweens retain obj→__data)`);
  assert.strictEqual(alive, 3, 'Data objects should be retained via tween closure → obj → __data');
  console.log('[Closure retention] PASS: confirmed tween closures prevent GC of data objects\n');
}

// ---------- Test 3: DataBindMapper correctly removes entries ----------
function testDataBindMapperCleanup() {
  const mapper = new DataBindMapper();
  const createdObjs = [];

  mapper
    .onCreateObj(d => {
      const obj = { type: 'three-group' };
      d.__threeObj = obj;
      obj.__data = d;
      createdObjs.push(obj);
      return obj;
    })
    .onRemoveObj((obj, dId) => {
      const d = mapper.getData(obj);
      if (d) delete d.__threeObj;
      // NOTE: obj.__data is NOT deleted (this is the bug)
    });

  // Add data
  const d1 = { lat: 10, lng: 20 };
  mapper.digest([d1]);
  assert.strictEqual(mapper.entries().length, 1, 'Should have 1 entry after digest');

  // Remove by passing empty
  mapper.digest([]);
  assert.strictEqual(mapper.entries().length, 0, 'Should have 0 entries after empty digest');

  // Verify: maps are clean, but obj.__data still points to d1
  const obj1 = createdObjs[0];
  assert.strictEqual(obj1.__data, d1, 'obj.__data still references d1 (the leak path)');
  assert.strictEqual(d1.__threeObj, undefined, 'd1.__threeObj was cleaned up');

  console.log('[DataBindMapper] Maps cleaned correctly, but obj.__data retains reference to data');
  console.log('[DataBindMapper] PASS: confirmed obj→data back-reference is never cleaned\n');
}

// ---------- Test 4: Full integration - simulate ring lifecycle ----------
async function testFullRingLifecycle() {
  if (!global.gc) {
    console.log('[Full lifecycle] SKIP: run with --expose-gc to enable this test\n');
    return;
  }

  const group = new TweenGroup();
  const mapper = new DataBindMapper();
  const registry = new FinalizationRegistry(() => { stats.finalized++; });
  const stats = { created: 0, finalized: 0 };

  mapper
    .onCreateObj(d => {
      const obj = { type: 'group', children: [] };
      d.__threeObjRing = obj;
      obj.__data = d;
      return obj;
    })
    .onRemoveObj((obj, dId) => {
      const d = mapper.getData(obj);
      if (d) delete d.__threeObjRing;
      // obj.__data is NOT deleted (the bug)
    });

  // Simulate 20 ring cycles: create ring, digest, create tween, digest empty
  for (let cycle = 0; cycle < 20; cycle++) {
    const ring = { lat: Math.random() * 90, lng: Math.random() * 180 };
    stats.created++;
    registry.register(ring);

    // digest adds ring
    mapper.digest([ring]);

    // Simulate ticker creating a tween (captures obj in closure)
    const [d, obj] = mapper.entries()[0];
    const tween = new Tween({ t: 0 })
      .to({ t: 1 }, 0)
      .onComplete(() => { void obj; }) // closure captures obj
      .start(0);
    group.add(tween);

    // Complete tween
    group.update(1000 + cycle);

    // digest removes ring
    mapper.digest([]);
  }

  // Force GC multiple times and wait for FinalizationRegistry
  for (let i = 0; i < 5; i++) {
    global.gc();
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`[Full lifecycle] created=${stats.created} finalized=${stats.finalized} leaked=${stats.created - stats.finalized}`);
  console.log(`[Full lifecycle] TweenGroup size: ${group.getAll().length} (all completed, none removed)`);

  // With the bug, finalized should be 0 (or very low)
  const leakRatio = (stats.created - stats.finalized) / stats.created;
  assert.ok(leakRatio > 0.5, `Expected most objects to leak (ratio=${leakRatio.toFixed(2)}), got finalized=${stats.finalized}/${stats.created}`);
  assert.strictEqual(group.getAll().length, 20, 'All 20 completed tweens should still be in the group');

  console.log('[Full lifecycle] PASS: confirmed memory leak - ring data objects not GC\'d\n');
}

// ---------- Test 5: Verify the fix works (with simulated removeDelay) ----------
async function testFixedRingLifecycle() {
  if (!global.gc) {
    console.log('[Fixed lifecycle] SKIP: run with --expose-gc to enable this test\n');
    return;
  }

  const group = new TweenGroup();
  const mapper = new DataBindMapper();
  const registry = new FinalizationRegistry(() => { stats.finalized++; });
  const stats = { created: 0, finalized: 0 };
  const scene = { children: [], add(o) { this.children.push(o); }, remove(o) { this.children = this.children.filter(c => c !== o); } };

  mapper
    .onCreateObj(d => {
      const obj = { type: 'group', children: [] };
      d.__threeObjRing = obj;
      obj.__data = d;
      scene.add(obj);
      return obj;
    })
    .onRemoveObj((obj, dId) => {
      const d = mapper.getData(obj);
      // FIX: break BOTH cross-references immediately
      delete obj.__data;
      delete d.__threeObjRing;
      // Simulate removeDelay: obj stays in scene for 200ms (simulating 30s)
      setTimeout(() => { scene.remove(obj); }, 200);
    });

  for (let cycle = 0; cycle < 20; cycle++) {
    const ring = { lat: Math.random() * 90, lng: Math.random() * 180 };
    stats.created++;
    registry.register(ring);

    mapper.digest([ring]);

    const [d, obj] = mapper.entries()[0];
    // FIX: remove tween from group on completion
    const tween = new Tween({ t: 0 })
      .to({ t: 1 }, 0)
      .onComplete(() => {
        void obj;
        group.remove(tween);
      })
      .start(0);
    group.add(tween);

    group.update(1000 + cycle);

    mapper.digest([]);
  }

  // Wait for removeDelay timeouts to fire
  await new Promise(r => setTimeout(r, 300));

  for (let i = 0; i < 5; i++) {
    global.gc();
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`[Fixed lifecycle] created=${stats.created} finalized=${stats.finalized} leaked=${stats.created - stats.finalized}`);
  console.log(`[Fixed lifecycle] TweenGroup size: ${group.getAll().length}`);
  console.log(`[Fixed lifecycle] Scene children: ${scene.children.length}`);

  assert.ok(stats.finalized >= stats.created * 0.8, `Expected most objects finalized, got ${stats.finalized}/${stats.created}`);
  assert.strictEqual(group.getAll().length, 0, 'Completed tweens should be removed from group');
  assert.strictEqual(scene.children.length, 0, 'Scene should be empty after removeDelay');

  console.log('[Fixed lifecycle] PASS: ring data objects are properly GC\'d after fix\n');
}

// ---------- Run all tests ----------
console.log('=== Ring layer memory leak tests ===\n');

testTweenGroupAccumulation();
testTweenClosureRetainsObj();
testDataBindMapperCleanup();
await testFullRingLifecycle();
await testFixedRingLifecycle();

console.log('=== All tests passed ===');
