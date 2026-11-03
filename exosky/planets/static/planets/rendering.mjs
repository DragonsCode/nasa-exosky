// Visualization helpers are independent of the browser for offline regression tests.
export function colorChannels(mass, distancePc) {
    if (typeof mass !== 'number' || !Number.isFinite(mass) || mass <= 0 ||
        typeof distancePc !== 'number' || !Number.isFinite(distancePc) || distancePc <= 0) {
        return [0.65, 0.65, 0.65];
    }
    const red = Math.min(mass / 10, 1);
    // Color only uses log distance: geometry remains linear in parsecs.
    const blue = Math.min(Math.log1p(distancePc) / Math.log1p(10000), 1);
    return [red, 0.5 * (2 - red - blue), blue];
}

export function pointerCoordinates(event, rect) {
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
}

export function updateStarRepresentation(THREE, scene, stars, index, near, texture) {
    const previous = stars[index];
    if (Boolean(previous.userData.is3D) === near) return previous;
    const color = new THREE.Color(...colorChannels(previous.userData.mass, previous.userData.distance));
    const next = near
        ? new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), new THREE.MeshBasicMaterial({ color }))
        : new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color }));
    if (!near) next.scale.set(20, 20, 1);
    next.position.copy(previous.position);
    next.userData = { ...previous.userData, is3D: near };
    scene.remove(previous);
    // Sprite geometry is shared by Three.js; only dispose owned mesh geometry.
    if (previous.isMesh) previous.geometry.dispose();
    previous.material.dispose();
    // The shared sprite texture belongs to the renderer, not each material.
    stars[index] = next;
    scene.add(next);
    return next;
}
