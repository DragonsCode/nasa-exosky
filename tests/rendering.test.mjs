import assert from 'node:assert/strict';
import test from 'node:test';
import { colorChannels, pointerCoordinates, updateStarRepresentation } from '../exosky/planets/static/planets/rendering.mjs';

test('missing, legacy unknown and nonfinite mass always produce neutral finite color', () => {
    for (const mass of [null, 'Unknown', NaN, Infinity, -1, undefined]) {
        assert.deepEqual(colorChannels(mass, 100), [0.65, 0.65, 0.65]);
    }
    assert.ok(colorChannels(1, 100).every(Number.isFinite));
    assert.ok(colorChannels(1, 10)[2] < colorChannels(1, 100)[2]);
    assert.ok(colorChannels(1, 100)[2] < colorChannels(1, 1000)[2]);
});

test('pointer center and corners follow offset canvas bounds', () => {
    const rect = { left: 120, top: 80, width: 400, height: 200 };
    assert.deepEqual(pointerCoordinates({ clientX: 320, clientY: 180 }, rect), { x: 0, y: 0 });
    assert.deepEqual(pointerCoordinates({ clientX: 120, clientY: 80 }, rect), { x: -1, y: 1 });
    assert.deepEqual(pointerCoordinates({ clientX: 520, clientY: 280 }, rect), { x: 1, y: -1 });
    assert.equal(pointerCoordinates({}, { width: 0, height: 10 }), null);
});

test('repeated near/far swaps retain one active raycast target and release owned resources', () => {
    let materialsDisposed = 0, geometriesDisposed = 0;
    const sharedTexture = { dispose() { assert.fail('Shared texture must remain usable'); } };
    class Material { dispose() { materialsDisposed++; } }
    class Geometry { dispose() { geometriesDisposed++; } }
    class Object3D {
        constructor() {
            this.position = { x: 3, copy(other) { this.x = other.x; } };
            this.scale = { set() {} };
        }
    }
    class Sprite extends Object3D { constructor(material) { super(); this.material = material; } }
    class Mesh extends Object3D {
        constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; }
    }
    const THREE = { Color: class {}, SphereGeometry: Geometry, MeshBasicMaterial: Material, SpriteMaterial: Material, Mesh, Sprite };
    const first = new Sprite(new Material());
    first.userData = { name: 'Synthetic', is3D: false, mass: null, distance: 100 };
    const stars = [first];
    const scene = { children: new Set(stars), add(obj) { this.children.add(obj); }, remove(obj) { this.children.delete(obj); } };
    for (const near of [true, false, true, false]) {
        const active = updateStarRepresentation(THREE, scene, stars, 0, near, sharedTexture);
        assert.equal(scene.children.size, 1);
        assert.ok(scene.children.has(stars[0]));
        assert.equal(stars[0], active);
        assert.equal(active.userData.is3D, near);
        assert.equal(active.position.x, 3);
        assert.equal(updateStarRepresentation(THREE, scene, stars, 0, near, sharedTexture), active);
    }
    assert.equal(materialsDisposed, 4);
    assert.equal(geometriesDisposed, 2);
});
