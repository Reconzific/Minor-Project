// Get references to DOM elements
const infoBox = document.getElementById('info-box');
const container = document.getElementById('three-container');

// Three.js scene setup
const scene = new THREE.Scene();

// Perspective camera setup: FOV 75, aspect ratio, near and far clipping planes
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// WebGL renderer setup and append canvas to container div
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Function to create a building as a colored 3D box mesh
function createBuilding(x, y, z, width, height, depth, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const building = new THREE.Mesh(geometry, material);
  building.position.set(x, y, z);
  return building;
}

// Create buildings at different positions, with different sizes and colors
const building1 = createBuilding(-2, 0, 0, 1, 2, 1, 0xff0000); // Red: Science Block
const building2 = createBuilding(0, 0, 0, 1.5, 3, 1, 0x0000ff); // Blue: Library
const building3 = createBuilding(2, 0, 0, 1, 1.5, 1, 0x00ff00); // Green: Admin Office

// Represent campus paths as a graph with weighted edges
const campusGraph = {
  "Science Block": { "Library": 5, "Admin Office": 10 },
  "Library": { "Science Block": 5, "Admin Office": 3 },
  "Admin Office": { "Science Block": 10, "Library": 3 }
};

// Assign names to building objects for identification
building1.name = "Science Block";
building2.name = "Library";
building3.name = "Admin Office";

// Collect all buildings into an array for easy access
const buildings = [building1, building2, building3];

// Add buildings to the scene
buildings.forEach(building => scene.add(building));

// Position the camera so buildings are visible
camera.position.z = 7;

// Prepare raycaster and mouse vector for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to reset buildings to their original colors
function resetBuildingColors() {
  buildings.forEach(building => {
    switch (building.name) {
      case "Science Block":
        building.material.color.set(0xff0000);
        break;
      case "Library":
        building.material.color.set(0x0000ff);
        break;
      case "Admin Office":
        building.material.color.set(0x00ff00);
        break;
    }
  });
}

// Handle mouse clicks: highlight clicked building and show info
function onMouseClick(event) {
  // Reset all buildings to their original colors
  resetBuildingColors();

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  // Set raycaster from camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate buildings intersected by the ray
  const intersects = raycaster.intersectObjects(buildings);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    // Highlight clicked building in yellow
    clickedObject.material.color.set(0xffff00);

    // Show building name in info box
    infoBox.style.display = "block";
    infoBox.textContent = "Building: " + clickedObject.name;
  } else {
    // Hide info box if no building clicked
    infoBox.style.display = "none";
  }
}

// Listen for click events on the window
window.addEventListener('click', onMouseClick, false);

// Adjust camera and renderer when window resizes for responsiveness
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Variable to hold current path line object
let pathLines = null;

// Draw shortest path as a line connecting buildings
function drawPath(path) {
  // Remove existing path highlight if any
  if (pathLines) {
    scene.remove(pathLines);
    pathLines.geometry.dispose();
    pathLines.material.dispose();
    pathLines = null;
  }

  const points = [];

  // Translate building names in path to their 3D coordinates
  path.forEach(name => {
    const building = buildings.find(b => b.name === name);
    if (building) {
      points.push(building.position);
    }
  });

  // Require at least two points to draw path
  if (points.length < 2) return;

  // Create line geometry and material then add to scene
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
  pathLines = new THREE.Line(geometry, material);
  scene.add(pathLines);
}

// Animation loop for rendering and rotating buildings
function animate() {
  requestAnimationFrame(animate);
  buildings.forEach(building => {
    building.rotation.y += 0.01; // Rotate slowly on y-axis
  });
  renderer.render(scene, camera);
}

// Dijkstra’s shortest path algorithm implementation
function dijkstra(graph, start, end) {
  const distances = {};
  const prev = {};
  const pq = new Set();

  // Initialize all distances to infinity and previous nodes to null
  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
    prev[node] = null;
    pq.add(node);
  });

  distances[start] = 0;

  while (pq.size > 0) {
    // Find node in pq with smallest distance
    let current = null;
    pq.forEach(node => {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    });

    // Stop if end node reached or remaining nodes unreachable
    if (current === end || distances[current] === Infinity) break;
    pq.delete(current);

    // Update distances to neighbors if shorter path via current found
    Object.entries(graph[current]).forEach(([neighbor, weight]) => {
      const alt = distances[current] + weight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = current;
      }
    });
  }

  // Reconstruct path from end to start using prev map
  const path = [];
  let currentNode = end;
  while (currentNode) {
    path.unshift(currentNode);
    currentNode = prev[currentNode];
  }

  // If path doesn't start with start node, means no valid path found
  if (path[0] !== start) return [];
  return path;
}

// Get search input element
const searchInput = document.getElementById('search-input');

// Search input event to highlight matching buildings dynamically
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();

  buildings.forEach(building => {
    if (building.name.toLowerCase().includes(query)) {
      // Highlight matched buildings in cyan
      building.material.color.set(0x00ffff);
    } else {
      // Reset building colors to original
      switch (building.name) {
        case "Science Block":
          building.material.color.set(0xff0000);
          break;
        case "Library":
          building.material.color.set(0x0000ff);
          break;
        case "Admin Office":
          building.material.color.set(0x00ff00);
          break;
      }
    }
  });
});

// Test path from Science Block to Admin Office on load and draw
console.log(dijkstra(campusGraph, "Science Block", "Admin Office"));
const testPath = dijkstra(campusGraph, "Science Block", "Admin Office");
drawPath(testPath);

// Start animation loop
animate();
