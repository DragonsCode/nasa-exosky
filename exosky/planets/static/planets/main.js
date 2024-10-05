import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

let exoplanetsData;
let stars = [];
let labels = [];

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 300;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Array of star textures
const starTextures = [
    'static/planets/img/star.png'
    // 'static/planets/img/planet.png'
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

// Random position helper
function randomPosition() {
    const range = 500;
    return [
        THREE.MathUtils.randFloatSpread(range),
        THREE.MathUtils.randFloatSpread(range),
    ];
}

// Fetch the exoplanets JSON data
fetch('./static/planets/exoplanets.json')
    .then(response => response.json())
    .then(data => {
        exoplanetsData = data;
        console.log(exoplanetsData);  // Now you have the JSON data

        exoplanetsData.forEach((starData, i) => {
            // Select a random texture from the loaded textures
            let randomTexture = loadedTextures[0];
            if (!starData.planet_name) {
                randomTexture = loadedTextures[1];
            }
            
            // Create star as a sprite using the selected random texture
            const starMaterial = new THREE.SpriteMaterial({ map: randomTexture });
            const star = new THREE.Sprite(starMaterial);
            star.position.set(starData.coordinates.x*5000, starData.coordinates.y*5000, starData.coordinates.z*5000); // Set to random position
            star.scale.set(20, 20, 1); // Adjust the star size as needed
            star.userData = { name: starData.planet_name, url: "https://science.nasa.gov/exoplanet-catalog/"+starData.planet_name.replace(/ /g, '-'), is3D: false }; // Add is3D flag to track if it's swapped to 3D
            
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

                // If close enough and star is not yet a 3D sphere
                if (distance < distanceThreshold && !star.userData.is3D) {
                    scene.remove(star); // Remove the 2D PNG star

                    // Create a 3D star as a sphere
                    const starGeometry = new THREE.SphereGeometry(10, 32, 32); // 10 = radius, 32 segments
                    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    const star3D = new THREE.Mesh(starGeometry, starMaterial);
                    star3D.position.copy(star.position); // Match the position
                    star3D.userData = star.userData; // Retain the same userData
                    scene.add(star3D);

                    star.userData.is3D = true;
                    star.userData.replacedWith3D = star3D; // Store the reference to the 3D model
                } 
                // If far enough and it's a 3D model, swap back to PNG
                else if (distance >= distanceThreshold && star.userData.is3D) {
                    scene.remove(star.userData.replacedWith3D); // Remove the 3D model

                    // Select a random texture for the new star sprite
                    let randomTexture = loadedTextures[0];
                    if (!star.userData.planet_name) {
                        randomTexture = loadedTextures[1];
                    }
                    const starMaterial = new THREE.SpriteMaterial({ map: randomTexture });
                    const newStar = new THREE.Sprite(starMaterial);
                    newStar.position.copy(star.userData.replacedWith3D.position); // Keep the same position
                    newStar.scale.set(20, 20, 1); // Adjust scale as needed
                    newStar.userData = star.userData;
                    scene.add(newStar);

                    star.userData.is3D = false;
                }
            });

            renderer.render(scene, camera);
        }

        animate();
    })
    .catch(error => console.error('Error loading JSON:', error));

// Handle mouse movement for hover effect
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars);

    // Hide all labels by default
    labels.forEach(label => label.visible = false);

    if (intersects.length > 0) {
        const star = intersects[0].object;
        const index = stars.indexOf(star);

        if (index !== -1) {
            labels[index].visible = true; // Show label for the hovered star
            // Update label position to follow the star
            labels[index].position.copy(star.position); // Keep the same position
            labels[index].position.y += 10; // Offset for label position
        }
    }
});

// Handle click event for redirection
window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stars);

    if (intersects.length > 0 && intersects[0].object.userData.is3D) {
        const star = intersects[0].object;
        window.location.href = star.userData.url;
    }
});

// Handle resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
