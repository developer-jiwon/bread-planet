import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing'

// ============================================
// WORLD
// ============================================
const MAP_R = 300 // 4x bigger — no visible edge

const REGIONS = [
  { name: '크루아상 산맥', desc: '버터가 녹아 흐르는 황금빛 산맥.\n가장 바삭한 봉우리에서 해가 뜬다.', x: 0, z: -60, r: 50, color: 0xD4A574, h: 0.3 },
  { name: '꿀 호수', desc: '달콤한 꿀이 천천히 일렁이는 호수.\n호수 바닥에는 황금빛 빛이 흐른다.', x: 60, z: 40, r: 35, color: 0xF5A623, h: -0.05 },
  { name: '우유 바다', desc: '부드러운 우유가 잔잔히 출렁이는 바다.\n크림 거품이 파도처럼 밀려온다.', x: -70, z: 50, r: 40, color: 0xF5F0E8, h: -0.05 },
  { name: '밀밭', desc: '황금빛 밀이 바람에 물결치는 들판.\n모든 빵의 시작점.', x: 50, z: -50, r: 38, color: 0xE8D5A3, h: 0.1 },
  { name: '딸기잼 강', desc: '진한 딸기잼이 흐르는 달콤한 강.\n양 옆으로 딸기가 자란다.', x: -35, z: -15, r: 22, color: 0xFF6B8A, h: -0.03 },
]

const BUILDINGS = [
  { name: '프랑스 빵집', desc: '바게트와 크루아상의 본고장.\n매일 아침 4시에 불이 켜진다.', asset: 'french-bakery', x: -10, z: 8, s: 12 },
  { name: '일본 빵집', desc: '멜론빵과 앙금빵의 성지.\n카레빵은 늘 오후 2시에 나온다.', asset: 'japan-bakery', x: 14, z: -8, s: 12 },
  { name: '이탈리아 빵집', desc: '포카치아와 치아바타의 고향.\n올리브 오일 향이 마을을 감싼다.', asset: 'italian-bakery', x: 28, z: 18, s: 12 },
  { name: '한국 빵집', desc: '소보로와 크림빵의 천국.\n슈크림은 항상 줄을 서야 한다.', asset: 'korean-bakery', x: -25, z: 20, s: 12 },
  { name: '풍차', desc: '밀을 갈아 밀가루를 만드는 풍차.\n날개가 돌 때마다 밀가루가 날린다.', asset: 'windmill', x: 40, z: -25, s: 15 },
  { name: '오븐 타워', desc: '빵별에서 가장 높은 건물.\n24시간 빵을 굽는다.', asset: 'oven-tower', x: 0, z: 0, s: 18 },
]

// ============================================
// THREE.JS
// ============================================
const texLoader = new THREE.TextureLoader()
const canvas = document.getElementById('c')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB) // sky blue
scene.fog = new THREE.FogExp2(0xE8DCC8, 0.006) // gentle fog hides edges

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new EffectPass(camera,
  new BloomEffect({ intensity: 0.5, luminanceThreshold: 0.7, mipmapBlur: true }),
  new VignetteEffect({ darkness: 0.25, offset: 0.3 })
))

// ============================================
// LIGHTING
// ============================================
scene.add(new THREE.AmbientLight(0xFFE4C4, 0.9))
const sun = new THREE.DirectionalLight(0xFFDDAA, 1.3)
sun.position.set(20, 35, 15)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
const sc = sun.shadow.camera
sc.near = 1; sc.far = 100; sc.left = sc.bottom = -50; sc.right = sc.top = 50
scene.add(sun)

// Warm oven glow at center
const ovenGlow = new THREE.PointLight(0xFF8844, 2, 30)
ovenGlow.position.set(0, 3, 0)
scene.add(ovenGlow)

// ============================================
// GROUND
// ============================================
// Main planet disc
const groundGeo = new THREE.CircleGeometry(MAP_R, 64)
const groundMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Region patches
REGIONS.forEach((r) => {
  const g = new THREE.CircleGeometry(r.r, 32)
  const m = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.8, transparent: true, opacity: 0.6 })
  const mesh = new THREE.Mesh(g, m)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(r.x, 0.02 + r.h, r.z)
  mesh.receiveShadow = true
  scene.add(mesh)
})

// Grass patches (green spots on ground)
for (let i = 0; i < 30; i++) {
  const gGeo = new THREE.CircleGeometry(3 + Math.random() * 8, 16)
  const gMat = new THREE.MeshStandardMaterial({ color: 0x8DB580, roughness: 0.9, transparent: true, opacity: 0.3 })
  const gMesh = new THREE.Mesh(gGeo, gMat)
  gMesh.rotation.x = -Math.PI / 2
  const angle = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 80
  gMesh.position.set(Math.cos(angle) * dist, 0.015, Math.sin(angle) * dist)
  scene.add(gMesh)
}

// ============================================
// ROADS — connect buildings
// ============================================
const ROAD_COLOR = 0x9E8E7E
const ROAD_WIDTH = 3

function makeRoad(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1
  const len = Math.sqrt(dx*dx + dz*dz)
  const angle = Math.atan2(dx, dz)

  const geo = new THREE.PlaneGeometry(ROAD_WIDTH, len)
  const mat = new THREE.MeshStandardMaterial({ color: ROAD_COLOR, roughness: 0.95 })
  const road = new THREE.Mesh(geo, mat)
  road.rotation.x = -Math.PI / 2
  road.rotation.z = -angle
  road.position.set((x1+x2)/2, 0.03, (z1+z2)/2)
  road.receiveShadow = true
  scene.add(road)

  // Center line (dashed effect — small yellow planes)
  const segments = Math.floor(len / 4)
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.3) / segments
    const lGeo = new THREE.PlaneGeometry(0.3, 1.5)
    const lMat = new THREE.MeshBasicMaterial({ color: 0xFFE4A0 })
    const line = new THREE.Mesh(lGeo, lMat)
    line.rotation.x = -Math.PI / 2
    line.rotation.z = -angle
    line.position.set(x1 + dx * t, 0.035, z1 + dz * t)
    scene.add(line)
  }
  return { x1, z1, x2, z2, angle, len }
}

// Main roads connecting buildings
const roads = []
roads.push(makeRoad(0, 0, -10, 8))       // oven → french
roads.push(makeRoad(0, 0, 14, -8))        // oven → japan
roads.push(makeRoad(0, 0, 28, 18))        // oven → italian
roads.push(makeRoad(0, 0, -25, 20))       // oven → korean
roads.push(makeRoad(0, 0, 40, -25))       // oven → windmill
roads.push(makeRoad(-10, 8, -25, 20))     // french → korean
roads.push(makeRoad(14, -8, 28, 18))      // japan → italian
roads.push(makeRoad(14, -8, 40, -25))     // japan → windmill
// Ring road
roads.push(makeRoad(-25, 20, -40, 35))
roads.push(makeRoad(28, 18, 45, 30))
roads.push(makeRoad(40, -25, 50, -40))

// ============================================
// VEHICLES — drive along roads
// ============================================
const vehicles = []
const vehicleAssets = ['bread-truck', 'croissant-car', 'milk-cart']

function spawnVehicle(roadIdx) {
  const r = roads[roadIdx % roads.length]
  const asset = vehicleAssets[Math.floor(Math.random() * vehicleAssets.length)]
  const tex = texLoader.load(`/assets/${asset}.png`)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), mat)
  mesh.position.y = 1.2
  scene.add(mesh)
  vehicles.push({
    mesh,
    road: r,
    t: Math.random(), // position along road 0-1
    speed: 0.02 + Math.random() * 0.03,
    dir: Math.random() > 0.5 ? 1 : -1,
  })
}

// Spawn vehicles on roads
for (let i = 0; i < 8; i++) spawnVehicle(i)

// Edge ring (crust)
const crustGeo = new THREE.RingGeometry(MAP_R - 2, MAP_R, 64)
const crustMat = new THREE.MeshStandardMaterial({ color: 0xC68B59, roughness: 0.7 })
const crust = new THREE.Mesh(crustGeo, crustMat)
crust.rotation.x = -Math.PI / 2
crust.position.y = 0.01
scene.add(crust)

// Sky dome gradient
const skyGeo = new THREE.SphereGeometry(400, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    varying vec3 vPos;
    uniform float uTime;
    void main() {
      float h = normalize(vPos).y;
      vec3 top = vec3(0.45, 0.7, 1.0);
      vec3 horizon = vec3(1.0, 0.92, 0.8);
      vec3 col = mix(horizon, top, smoothstep(0.0, 0.5, h));
      // Subtle warm tint
      col += vec3(0.05, 0.03, 0.0) * (1.0 - h);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
})
scene.add(new THREE.Mesh(skyGeo, skyMat))

// ============================================
// PLAYER — bread cat
// ============================================
const playerGroup = new THREE.Group()

// Body placeholder (will be replaced by sprite)
const playerTex = texLoader.load('/assets/bread-cat.png')
playerTex.colorSpace = THREE.SRGBColorSpace
const playerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: playerTex, transparent: true, alphaTest: 0.05 }))
playerSprite.scale.set(3, 3, 1)
playerSprite.position.y = 1.5
playerGroup.add(playerSprite)

// Shadow blob under player
const shadowGeo = new THREE.CircleGeometry(0.8, 16)
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
shadowMesh.rotation.x = -Math.PI / 2
shadowMesh.position.y = 0.02
playerGroup.add(shadowMesh)

playerGroup.position.set(0, 0, 8)
scene.add(playerGroup)

// ============================================
// OBJECT CREATION
// ============================================
const allBillboards = [] // things that sway (nature)
const allStatic = [] // things that DON'T sway (buildings)
const interactables = []
const buildingMeshes = [] // for entering

// STATIC billboard (buildings, landmarks) — NO wiggle
function makeStatic(asset, x, z, s, data) {
  const tex = texLoader.load(`/assets/${asset}.png`)
  tex.colorSpace = THREE.SRGBColorSpace
  const geo = new THREE.PlaneGeometry(s, s)
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, s / 2, z)
  mesh.userData = data || {}
  mesh.castShadow = true
  scene.add(mesh)
  allStatic.push(mesh)

  // Small shadow under building
  const shGeo = new THREE.CircleGeometry(s * 0.3, 16)
  const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })
  const sh = new THREE.Mesh(shGeo, shMat)
  sh.rotation.x = -Math.PI / 2
  sh.position.set(x, 0.01, z)
  scene.add(sh)

  if (data?.name) {
    mesh.userData.interactRadius = s * 0.7
    interactables.push(mesh)
  }
  if (data?.isBuilding) {
    buildingMeshes.push(mesh)
  }
  return mesh
}

// SWAYING billboard (nature, creatures) — wiggle shader
function makeSway(asset, x, z, s, data) {
  const tex = texLoader.load(`/assets/${asset}.png`)
  tex.colorSpace = THREE.SRGBColorSpace
  const geo = new THREE.PlaneGeometry(s, s, 4, 4)
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 1.2 + p.y * 2.0) * 0.08 * (1.0 - uv.y);
        p.y += sin(uTime * 0.6) * 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec2 vUv;
      void main() {
        vec4 t = texture2D(uTex, vUv);
        if (t.a < 0.05) discard;
        gl_FragColor = t;
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, s / 2, z)
  mesh.userData = data || {}
  scene.add(mesh)
  allBillboards.push(mesh)
  if (data?.name) {
    mesh.userData.interactRadius = s * 0.8
    interactables.push(mesh)
  }
  return mesh
}

// Buildings — STATIC, with 3D box behind, enterable
BUILDINGS.forEach((b) => makeStatic(b.asset, b.x, b.z, b.s, { name: b.name, desc: b.desc, isBuilding: true }))

// Region landmarks — STATIC (mountains, lakes don't sway)
REGIONS.forEach((r) => {
  const assets = { '크루아상 산맥': 'croissant-mountain', '꿀 호수': 'honey-lake', '우유 바다': 'milk-sea', '밀밭': 'wheat-field', '딸기잼 강': 'jam-river' }
  const a = assets[r.name]
  if (!a) return
  const sway = r.name === '밀밭' // only wheat sways
  const count = r.name === '크루아상 산맥' ? 12 : r.name === '밀밭' ? 10 : r.name === '우유 바다' ? 5 : 4
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8
    const dist = r.r * 0.15 + Math.random() * r.r * 0.7
    const size = r.name === '크루아상 산맥' ? 10 + Math.random() * 8 : 7 + Math.random() * 5
    const fn = sway ? makeSway : makeStatic
    fn(a, r.x + Math.cos(angle) * dist, r.z + Math.sin(angle) * dist, size, { name: r.name, desc: r.desc })
  }
})

// TREES — mix of types, dense
const treeTypes = ['cherry-blossom-tree', 'big-tree', 'pine-tree']
for (let i = 0; i < 60; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 8 + Math.random() * 100
  const tree = treeTypes[Math.floor(Math.random() * treeTypes.length)]
  makeSway(tree, Math.cos(angle) * dist, Math.sin(angle) * dist, 5 + Math.random() * 5, {})
}

// FLOWERS — lots, varied, small
const flowerTypes = ['flower-red', 'flower-yellow', 'flower-purple', 'flower-pink', 'flower-bush']
for (let i = 0; i < 80; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 5 + Math.random() * 90
  const flower = flowerTypes[Math.floor(Math.random() * flowerTypes.length)]
  makeSway(flower, Math.cos(angle) * dist, Math.sin(angle) * dist, 1 + Math.random() * 2, {})
}

// STREET FURNITURE — along roads
const streetItems = ['lamp-post', 'bench', 'traffic-light', 'mailbox', 'signpost']
roads.forEach((r) => {
  // Place items along each road
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + Math.random() * 0.6
    const x = r.x1 + (r.x2 - r.x1) * t
    const z = r.z1 + (r.z2 - r.z1) * t
    // Offset to side of road
    const perpX = -(r.z2 - r.z1) / r.len * 3
    const perpZ = (r.x2 - r.x1) / r.len * 3
    const side = Math.random() > 0.5 ? 1 : -1
    const item = streetItems[Math.floor(Math.random() * streetItems.length)]
    const size = item === 'lamp-post' ? 4 : item === 'traffic-light' ? 3.5 : 2
    makeStatic(item, x + perpX * side, z + perpZ * side, size, {})
  }
})

// NATURE EXTRAS
for (let i = 0; i < 20; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 80
  const item = ['mushroom', 'rock', 'fountain', 'bread-basket'][Math.floor(Math.random() * 4)]
  const size = item === 'fountain' ? 4 : item === 'rock' ? 2 : 2.5
  makeStatic(item, Math.cos(angle) * dist, Math.sin(angle) * dist, size, {})
}

// Creatures — sway, big, named
const creatures = []
const creatureTypes = [
  { asset: 'bread-cat', name: '식빵냥이' },
  { asset: 'flour-spirit', name: '밀가루요정' },
  { asset: 'butter-slime', name: '버터슬라임' },
]
for (let i = 0; i < 20; i++) {
  const type = creatureTypes[Math.floor(Math.random() * creatureTypes.length)]
  const angle = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 80
  const size = 4 + Math.random() * 2
  const m = makeSway(type.asset, Math.cos(angle) * dist, Math.sin(angle) * dist, size, { name: type.name, desc: `${type.name}이(가) 빵별을 산책하고 있다.` })
  m.userData.wander = { speed: 0.15 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2, ox: m.position.x, oz: m.position.z }
  creatures.push(m)
}

// ============================================
// PARTICLES
// ============================================
// Flour dust
const FLOUR = 600
const flourGeo = new THREE.BufferGeometry()
const fPos = new Float32Array(FLOUR * 3)
for (let i = 0; i < FLOUR; i++) {
  fPos[i*3] = (Math.random()-0.5) * 200
  fPos[i*3+1] = Math.random() * 15
  fPos[i*3+2] = (Math.random()-0.5) * 200
}
flourGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
scene.add(new THREE.Points(flourGeo, new THREE.PointsMaterial({
  color: 0xFFF8E7, size: 0.12, transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false,
})))

// Footstep puffs
const footPuffs = []
function spawnFootPuff(x, z) {
  const g = new THREE.SphereGeometry(0.15, 6, 6)
  const m = new THREE.MeshBasicMaterial({ color: 0xFFF8E7, transparent: true, opacity: 0.6 })
  const p = new THREE.Mesh(g, m)
  p.position.set(x, 0.1, z)
  scene.add(p)
  gsap.to(p.position, { y: 0.8, duration: 0.6, ease: 'power2.out' })
  gsap.to(p.scale, { x: 2, y: 2, z: 2, duration: 0.6 })
  gsap.to(m, { opacity: 0, duration: 0.6, onComplete: () => { scene.remove(p); footPuffs.splice(footPuffs.indexOf(p), 1) } })
  footPuffs.push(p)
}

// ============================================
// CONTROLS
// ============================================
const keys = {}
const playerSpeed = 8
const playerPos = playerGroup.position
let playerAngle = 0
let lastPuffTime = 0

window.addEventListener('keyup', (e) => { keys[e.code] = false })

// Mobile: touch joystick
let touchStart = null, touchDelta = { x: 0, y: 0 }
canvas.addEventListener('touchstart', (e) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY } }, { passive: true })
canvas.addEventListener('touchmove', (e) => {
  if (!touchStart) return
  touchDelta.x = (e.touches[0].clientX - touchStart.x) / 50
  touchDelta.y = (e.touches[0].clientY - touchStart.y) / 50
}, { passive: true })
canvas.addEventListener('touchend', () => { touchStart = null; touchDelta = { x: 0, y: 0 } }, { passive: true })

// ============================================
// BUILDING ENTRY SYSTEM
// ============================================
let insideBuilding = null
let nearBuilding = null
const enterPrompt = document.getElementById('enter-prompt')

// Interior colors per building type
const interiorColors = {
  '프랑스 빵집': 0xF5E6D0,
  '일본 빵집': 0xFFF0E0,
  '이탈리아 빵집': 0xF0E0D0,
  '한국 빵집': 0xFFF5E8,
  '풍차': 0xE8DCC0,
  '오븐 타워': 0xFFDDC0,
}

function enterBuilding(building) {
  if (insideBuilding) return
  insideBuilding = building
  enterPrompt.classList.add('hidden')

  // Camera zoom into building
  gsap.to(camera, {
    fov: 40,
    duration: 0.8,
    ease: 'power2.inOut',
    onUpdate: () => camera.updateProjectionMatrix(),
  })
  gsap.to(camera.position, {
    x: building.position.x,
    y: 4,
    z: building.position.z + 3,
    duration: 0.8,
    ease: 'power2.inOut',
  })

  // Change background to interior
  const color = interiorColors[building.userData.name] || 0xFFF0E0
  gsap.to(scene.background, {
    r: ((color >> 16) & 0xff) / 255,
    g: ((color >> 8) & 0xff) / 255,
    b: (color & 0xff) / 255,
    duration: 0.8,
  })
  gsap.to(scene.fog, { density: 0.04, duration: 0.8 }) // thick fog = indoors

  // Show interior info
  showInfo(building.userData.name, building.userData.desc + '\n\nESC 로 나가기')

  // Hide player
  playerGroup.visible = false
}

function exitBuilding() {
  if (!insideBuilding) return
  insideBuilding = null

  gsap.to(camera, {
    fov: 55,
    duration: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => camera.updateProjectionMatrix(),
  })
  gsap.to(scene.background, { r: 0x87/255, g: 0xCE/255, b: 0xEB/255, duration: 0.6 })
  gsap.to(scene.fog, { density: 0.006, duration: 0.6 })

  playerGroup.visible = true
  hideInfo()
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true
  if (e.code === 'KeyE' && nearBuilding && !insideBuilding) {
    enterBuilding(nearBuilding)
  }
  if (e.code === 'Escape' && insideBuilding) {
    exitBuilding()
  }
})

// ============================================
// INFO PANEL
// ============================================
const infoEl = document.getElementById('info')
const infoTitle = document.getElementById('info-title')
const infoDesc = document.getElementById('info-desc')
const locationEl = document.getElementById('location')
let activeInfo = null

function showInfo(title, desc) {
  if (activeInfo === title) return
  activeInfo = title
  infoTitle.textContent = title
  infoDesc.textContent = desc
  infoEl.classList.remove('hidden')
}

function hideInfo() {
  infoEl.classList.add('hidden')
  activeInfo = null
}

document.getElementById('info-close').addEventListener('click', hideInfo)

// ============================================
// AUDIO — Lofi Bakery
// ============================================
let audioOn = false
function initAudio() {
  if (audioOn) return; audioOn = true
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  const master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination)

  // Warm major pad C-E-G-C5
  ;[130.81, 164.81, 196.00, 261.63].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = i < 2 ? 'sine' : 'triangle'
    o.frequency.value = f
    const g = ctx.createGain(); g.gain.value = 0.035
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 250
    o.connect(lp).connect(g).connect(master); o.start()
  })

  // Birds/nature noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 5
  const ng = ctx.createGain(); ng.gain.value = 0.008
  n.connect(bp).connect(ng).connect(master); n.start()
}
;['click','touchstart','keydown'].forEach((e) => { document.addEventListener(e, initAudio, { once: true }) })

// ============================================
// LOADING
// ============================================
const loadingEl = document.getElementById('loading')
function dismissLoading() {
  if (!loadingEl || loadingEl.dataset.done) return
  loadingEl.dataset.done = '1'
  gsap.to(loadingEl, { opacity: 0, duration: 0.8, delay: 0.3, onComplete: () => loadingEl?.remove() })
}
texLoader.manager.onLoad = dismissLoading
texLoader.manager.onError = (url) => { console.warn('Failed to load:', url) }
// Fallback: dismiss after 3 seconds no matter what
setTimeout(dismissLoading, 3000)

// ============================================
// ANIMATION
// ============================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  // --- MOVEMENT (disabled when inside building) ---
  let dx = 0, dz = 0
  if (insideBuilding) { composer.render(); return }
  if (keys['KeyW'] || keys['ArrowUp']) dz -= 1
  if (keys['KeyS'] || keys['ArrowDown']) dz += 1
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1

  // Mobile touch
  dx += touchDelta.x
  dz += touchDelta.y

  const moving = dx !== 0 || dz !== 0
  if (moving) {
    const len = Math.sqrt(dx*dx + dz*dz)
    dx /= len; dz /= len
    playerPos.x += dx * playerSpeed * dt
    playerPos.z += dz * playerSpeed * dt
    playerAngle = Math.atan2(dx, dz)

    // Clamp to planet
    const dist = Math.sqrt(playerPos.x**2 + playerPos.z**2)
    if (dist > MAP_R - 3) {
      playerPos.x *= (MAP_R - 3) / dist
      playerPos.z *= (MAP_R - 3) / dist
    }

    // Footstep puffs
    if (t - lastPuffTime > 0.25) {
      spawnFootPuff(playerPos.x, playerPos.z)
      lastPuffTime = t
    }
  }

  // Player bounce when walking
  playerSprite.position.y = 1.5 + (moving ? Math.abs(Math.sin(t * 8)) * 0.3 : Math.sin(t * 1.5) * 0.05)
  // Flip sprite based on direction
  playerSprite.material.map.center.set(0.5, 0.5)
  if (dx < -0.1) playerSprite.scale.x = -3
  else if (dx > 0.1) playerSprite.scale.x = 3

  // --- CAMERA: 3rd person follow ---
  const camDist = 12
  const camHeight = 9
  const idealX = playerPos.x - Math.sin(playerAngle) * camDist * 0.3
  const idealZ = playerPos.z + camDist
  const idealY = camHeight

  camera.position.x += (idealX - camera.position.x) * 0.05
  camera.position.y += (idealY - camera.position.y) * 0.05
  camera.position.z += (idealZ - camera.position.z) * 0.05
  camera.lookAt(playerPos.x, 2, playerPos.z)

  // --- BILLBOARDS ---
  // Swaying (nature) — face camera + wiggle
  allBillboards.forEach((m) => {
    m.lookAt(camera.position.x, m.position.y, camera.position.z)
    if (m.material.uniforms?.uTime) m.material.uniforms.uTime.value = t
  })
  // Static (buildings) — face camera, no wiggle
  allStatic.forEach((m) => {
    m.lookAt(camera.position.x, m.position.y, camera.position.z)
  })

  // --- CREATURES wander ---
  creatures.forEach((c) => {
    const w = c.userData.wander
    if (!w) return
    c.position.x = w.ox + Math.sin(t * w.speed + w.phase) * 8
    c.position.z = w.oz + Math.cos(t * w.speed * 0.7 + w.phase) * 6
  })

  // --- FLOUR drift ---
  const fp = flourGeo.attributes.position
  for (let i = 0; i < FLOUR; i++) {
    fp.array[i*3] += Math.sin(t * 0.2 + i * 0.4) * 0.002
    fp.array[i*3+1] += 0.001
    fp.array[i*3+2] += Math.cos(t * 0.15 + i * 0.3) * 0.001
    if (fp.array[i*3+1] > 12) fp.array[i*3+1] = 0.3
  }
  fp.needsUpdate = true

  // --- PROXIMITY CHECK ---
  if (!insideBuilding) {
    nearBuilding = null
    let nearestDist = Infinity
    buildingMeshes.forEach((b) => {
      const ddx = playerPos.x - b.position.x
      const ddz = playerPos.z - b.position.z
      const d = Math.sqrt(ddx*ddx + ddz*ddz)
      if (d < (b.userData.interactRadius || 5) && d < nearestDist) {
        nearBuilding = b
        nearestDist = d
      }
    })

    if (nearBuilding) {
      enterPrompt.classList.remove('hidden')
      showInfo(nearBuilding.userData.name, nearBuilding.userData.desc)
    } else {
      enterPrompt.classList.add('hidden')
      if (activeInfo) hideInfo()
    }
  }

  // --- LOCATION NAME ---
  let region = null
  REGIONS.forEach((r) => {
    const d = Math.sqrt((playerPos.x - r.x) ** 2 + (playerPos.z - r.z) ** 2)
    if (d < r.r) region = r
  })
  locationEl.textContent = region ? region.name : '빵별'

  // --- VEHICLES drive along roads ---
  vehicles.forEach((v) => {
    v.t += v.speed * dt * v.dir
    if (v.t > 1) { v.t = 0; v.dir = 1 }
    if (v.t < 0) { v.t = 1; v.dir = -1 }
    const r = v.road
    v.mesh.position.x = r.x1 + (r.x2 - r.x1) * v.t
    v.mesh.position.z = r.z1 + (r.z2 - r.z1) * v.t
    v.mesh.lookAt(camera.position.x, v.mesh.position.y, camera.position.z)
  })

  // --- OVEN GLOW flicker ---
  ovenGlow.intensity = 2 + Math.sin(t * 3) * 0.3

  // --- RENDER ---
  composer.render()
}

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

animate()
