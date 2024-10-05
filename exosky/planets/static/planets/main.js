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

const c = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);

// Array of star textures
const starTextures = [
    'static/planets/img/star.png',
    'static/planets/img/planet.png'
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

// Fetch the exoplanets JSON data
fetch('./static/planets/exoplanets.json')
    .then(response => response.json())
    .then(data => {
        exoplanetsData = data;
        console.log(exoplanetsData);  // Now you have the JSON data

        exoplanetsData.forEach((starData, i) => {
            // Select a random texture from the loaded textures
            let randomTexture = loadedTextures[1];
            if (!starData.planet_name) {
                randomTexture = loadedTextures[0];
            }
            
            // Create star as a sprite using the selected random texture
            const starMaterial = new THREE.SpriteMaterial({ map: randomTexture });
            const star = new THREE.Sprite(starMaterial);
            star.position.set(starData.coordinates.x * 5000, starData.coordinates.y * 5000, starData.coordinates.z * 5000); // Set to random position
            star.scale.set(20, 20, 1); // Adjust the star size as needed
            star.userData = { name: starData.planet_name, url: "https://science.nasa.gov/exoplanet-catalog/" + starData.planet_name.replace(/ /g, '-'), is3D: false, description: starData.description }; // Add is3D flag to track if it's swapped to 3D
            
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
                    let newrandomTexture = loadedTextures[0];
                    if (!star.userData.planet_name) {
                        newrandomTexture = loadedTextures[1];
                    }
                    const starMaterial = new THREE.SpriteMaterial({ map: newrandomTexture });
                    const newStar = new THREE.Sprite(starMaterial);
                    newStar.position.copy(star.userData.replacedWith3D.position); // Keep the same position
                    newStar.scale.set(20, 20, 1); // Adjust scale as needed
                    newStar.userData = star.userData;
                    scene.add(newStar);

                    star.userData.is3D = false;
                }

                // Update label position even if star is 2D or 3D
                labels[index].position.copy(star.position); // Keep the same position
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
        mouse.x = (event.clientX / (window.innerWidth)) * 2 - 1;
        mouse.y = -(event.clientY / (window.innerHeight)) * 2 + 1;
    
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
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
    
                // Set the tooltip's position
                tooltip.style.left = `${x}px`;
                tooltip.style.top = `${y}px`;
    
                // Display star information in the tooltip
                tooltip.innerHTML = star.userData.name; // or any other relevant information
                starhead.innerHTML = star.userData.name;
                starpara.innerHTML = star.userData.description;
            }
        }
    });

// Handle click event for redirection
window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...stars, ...scene.children.filter(child => child.isMesh)]); // Check both stars and 3D meshes

    if (intersects.length > 0 && intersects[0].object.isMesh) {
        const star = intersects[0].object;

        // Check if star is a sprite or a 3D model and handle accordingly
        if (star.userData.is3D) {
            window.location.href = star.userData.url;
        } else if (star.userData.url) {
            window.location.href = star.userData.url; // Handle the case for 2D stars
        }
    }
});

// Handle resizing
window.addEventListener('resize', () => {
    camera.aspect = (window.innerWidth / 2) / (window.innerHeight / 2);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
});
