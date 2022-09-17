import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three'
import { CameraHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

//SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

//CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

//RENDERER
const renderer = new THREE.WebGL1Renderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 15
orbitControls.enablePan = false
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
orbitControls.update();

//LIGHT
function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(- 60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;

  scene.add(dirLight);
}
light();

//FLOOR
function generateFloor() {
  //TEXTURES
  const textureLoader = new THREE.TextureLoader();
  const floorBaseColor = textureLoader.load('./textures/floor/Gravel_color.jpg');
  const floorNormalMap = textureLoader.load('./textures/floor/Gravel_NRM.jpg');
  const floorHeightMap = textureLoader.load('./textures/floor/Gravel_DISP.png');
  const floorAmbienOclusion = textureLoader.load('./textures/floor/Gravel_OCC.jpg');

  const WIDTH = 80;
  const LENGTH = 80;

  const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  const material = new THREE.MeshStandardMaterial({
    map: floorBaseColor, normalMap: floorNormalMap,
    displacementMap: floorHeightMap, displacementScale: 0.1,
    aoMap: floorAmbienOclusion,
  });
  material.side = THREE.DoubleSide;

  wrapAndRepeatTexture(material.map);
  wrapAndRepeatTexture(material.normalMap);
  wrapAndRepeatTexture(material.displacementMap);
  wrapAndRepeatTexture(material.aoMap);
  const floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);
}
generateFloor();

//MODEL WITH ANIMATION
var characterControls: CharacterControls;
new GLTFLoader().load('models/helper.glb', (gltf) => {
  const model = gltf.scene;
  model.traverse((object: any) => {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(model);

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map();
  gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
    animationsMap.set(a.name, mixer.clipAction(a));
  });
  characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle');
});

// CONTROL KEYS
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
  keyDisplayQueue.down(event.key);
  if (event.shiftKey && characterControls) {
    characterControls.switchRunToggle();
  } else {
    (keysPressed as any)[event.key.toLowerCase()] = true;
  }
}, false);
document.addEventListener('keyup', (event) => {
  keyDisplayQueue.up(event.key);
  (keysPressed as any)[event.key.toLowerCase()] = false;
}, false);

const clock = new THREE.Clock();

// REPETITION OF PLANE TEXTURE
function wrapAndRepeatTexture(map: THREE.Texture) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = map.repeat.y = 4;
}
// ANIMATE LOOP
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }

  orbitControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();
