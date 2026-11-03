import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { colorChannels, pointerCoordinates, updateStarRepresentation } from './rendering.mjs';

let exoplanetsData;
let stars = [];
let labels = [];

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
);
camera.position.z = 300;

const c = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
resizeRenderer();

// Array of star textures
const starTextures = [
    new URL('./img/star.png', import.meta.url).href,
    new URL('./img/planet.png', import.meta.url).href
];

// Load textures and create an array of loaded textures
const loadedTextures = starTextures.map(texturePath => {
    return new THREE.TextureLoader().load(texturePath);
});

// Create controls for navigation
const controls = new OrbitControls(camera, renderer.domElement);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Distance threshold to swap PNG with 3D model
const distanceThreshold = 50; // Adjust as needed

// Function to create text labels for stars
function createTextLabel(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '30px Arial'; // Ensure font is set correctly
    context.fillStyle = 'orange';
    context.fillText(text, 0, 30); // Adjust text position if necessary

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(30, 15, 1); // Adjust label size

    return sprite;
}

// Function to calculate color based on mass and distance
function getColorFromData(mass, distance) {
    return new THREE.Color(...colorChannels(mass, distance));
}

// Fetch the exoplanets JSON data
fetch(new URL('./exoplanets.json', import.meta.url))
    .then(response => response.json())
    .then(data => {
        exoplanetsData = data;
        const maxDistance = Math.max(1, ...data.map(row => row.distance));
        camera.far = Math.max(10000, maxDistance * 4);
        camera.up.set(0, 0, 1); // Equatorial +Z is north.
        const initialExtent = Math.min(maxDistance, 1000);
        camera.position.set(0, -initialExtent * 1.5, initialExtent * 0.5);
        camera.updateProjectionMatrix();
        controls.update();

        exoplanetsData.forEach((starData, i) => {
            let randomTexture = loadedTextures[0];
            
            // Create star as a sprite using the selected random texture
            const color = getColorFromData(starData.mass, starData.distance);
            const starMaterial = new THREE.SpriteMaterial({ map: randomTexture, color: color, });
            const star = new THREE.Sprite(starMaterial);
            star.position.set(starData.coordinates.x, starData.coordinates.y, starData.coordinates.z); // One scene unit = one parsec
            star.scale.set(20, 20, 1); // Adjust the star size as needed
            star.userData = { name: starData.planet_name, star: starData.star_name, url: "https://science.nasa.gov/exoplanet-catalog/" + starData.planet_name.replace(/ /g, '-'), is3D: false, description: starData.description, mass: starData.mass, distance: starData.distance }; // Add is3D flag to track if it's swapped to 3D
            
            stars.push(star);
            scene.add(star);

            // Create and add labels (as sprites)
            const label = createTextLabel(starData.planet_name);
            label.position.set(...star.position.toArray());
            label.visible = false;  // Hidden by default
            labels.push(label);
            scene.add(label);
        });

        // Animate and render stars
        function animate() {
            requestAnimationFrame(animate);
            controls.update();

            // Check distance between the camera and each star
            stars.forEach((star, index) => {
                const distance = camera.position.distanceTo(star.position);

                const active = updateStarRepresentation(
                    THREE, scene, stars, index, distance < distanceThreshold, loadedTextures[0]
                );
                labels[index].position.copy(active.position);
            });

            renderer.render(scene, camera);
        }

        animate();
    })
    .catch(error => console.error('Error loading JSON:', error));

const tooltip = document.getElementById('tooltip');
const starhead = document.getElementById('starhead');
const starpara = document.getElementById('starpara');

    c.addEventListener('mousemove', (event) => {
        const rect = c.getBoundingClientRect();
        const pointer = pointerCoordinates(event, rect);
        if (!pointer) return;
        mouse.set(pointer.x, pointer.y);
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(stars);
    
        // Hide the tooltip by default
        tooltip.style.display = 'none';
    
        if (intersects.length > 0) {
            const star = intersects[0].object;
            const index = stars.indexOf(star);
    
            if (index !== -1) {
                // Show tooltip
                tooltip.style.display = 'block'; 
    
                // Project the star's position to 2D screen coordinates
                const vector = star.position.clone();
                vector.project(camera);
    
                // Convert normalized device coordinates to screen coordinates
                const x = rect.left + (vector.x * 0.5 + 0.5) * rect.width;
                const y = rect.top + (0.5 - vector.y * 0.5) * rect.height;
    
                // Set the tooltip's position
                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
    
                // Display star information in the tooltip
                tooltip.textContent = star.userData.name; // or any other relevant information
                starhead.textContent = star.userData.name;
                starpara.textContent = star.userData.description;
            }
        }
    });

// Resolve each click against the canvas, including touch-generated clicks.
c.addEventListener('click', (event) => {
    const pointer = pointerCoordinates(event, c.getBoundingClientRect());
    if (!pointer) return;
    mouse.set(pointer.x, pointer.y);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars);
    if (intersects.length && intersects[0].object.userData.url) {
        window.location.href = intersects[0].object.userData.url;
    }
});

function resizeRenderer() {
    const width = Math.max(1, c.parentElement.clientWidth);
    const height = Math.max(1, Math.round(window.innerHeight / 2));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
window.addEventListener('resize', resizeRenderer);
