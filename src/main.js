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
const texLoader = new THREE.TextureLoader()
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
// BUILDINGS & DECORATIONS (billboards)
// ============================================
const allBillboards = []
const interactables = []

function makeBillboard(asset, x, z, s, data) {
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

// Buildings
BUILDINGS.forEach((b) => makeBillboard(b.asset, b.x, b.z, b.s, { name: b.name, desc: b.desc }))

// Region landmarks — BIG, lots of them
REGIONS.forEach((r) => {
  const assets = { '크루아상 산맥': 'croissant-mountain', '꿀 호수': 'honey-lake', '우유 바다': 'milk-sea', '밀밭': 'wheat-field', '딸기잼 강': 'jam-river' }
  const a = assets[r.name]
  if (!a) return
  const count = r.name === '크루아상 산맥' ? 12 : r.name === '밀밭' ? 10 : r.name === '우유 바다' ? 5 : 4
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8
    const dist = r.r * 0.15 + Math.random() * r.r * 0.7
    const size = r.name === '크루아상 산맥' ? 10 + Math.random() * 8 : 7 + Math.random() * 5
    makeBillboard(a, r.x + Math.cos(angle) * dist, r.z + Math.sin(angle) * dist, size, { name: r.name, desc: r.desc })
  }
})

// Dense scattered decorations — fill the world
const allDecos = ['cherry-blossom-tree', 'bread-basket', 'flour-cloud', 'steam-puff', 'baguette-bridge', 'baguette-projectile', 'croissant-projectile', 'melon-pan-projectile', 'pretzel-projectile']
for (let i = 0; i < 80; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 8 + Math.random() * 120
  const deco = allDecos[Math.floor(Math.random() * allDecos.length)]
  const size = deco.includes('tree') ? 5 + Math.random() * 4 : deco.includes('cloud') ? 4 + Math.random() * 3 : 2 + Math.random() * 3
  makeBillboard(deco, Math.cos(angle) * dist, Math.sin(angle) * dist, size, {})
}

// Extra bread scattered on ground (planet-base as small accents)
for (let i = 0; i < 40; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 15 + Math.random() * 100
  const bread = ['croissant-projectile', 'pretzel-projectile', 'melon-pan-projectile', 'baguette-projectile'][Math.floor(Math.random() * 4)]
  makeBillboard(bread, Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5 + Math.random() * 1.5, {})
}

// Wandering creatures — BIGGER, more visible, named
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
  const size = 4 + Math.random() * 2 // much bigger
  const m = makeBillboard(type.asset, Math.cos(angle) * dist, Math.sin(angle) * dist, size, { name: type.name, desc: `${type.name}이(가) 빵별을 산책하고 있다.` })
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

window.addEventListener('keydown', (e) => { keys[e.code] = true })
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

// Click on buildings
canvas.addEventListener('click', (e) => {
  const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(mouse, camera)
  const hits = ray.intersectObjects(interactables)
  if (hits.length > 0 && hits[0].object.userData.name) {
    showInfo(hits[0].object.userData.name, hits[0].object.userData.desc)
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
texLoader.manager.onLoad = () => {
  gsap.to(loadingEl, { opacity: 0, duration: 0.8, delay: 0.5, onComplete: () => loadingEl?.remove() })
}

// ============================================
// ANIMATION
// ============================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  // --- MOVEMENT ---
  let dx = 0, dz = 0
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

  // --- BILLBOARDS face camera ---
  allBillboards.forEach((m) => {
    m.lookAt(camera.position.x, m.position.y, camera.position.z)
    if (m.material.uniforms?.uTime) m.material.uniforms.uTime.value = t
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

  // --- PROXIMITY CHECK: show info when near building ---
  let nearestBuilding = null
  let nearestDist = Infinity
  interactables.forEach((b) => {
    const ddx = playerPos.x - b.position.x
    const ddz = playerPos.z - b.position.z
    const d = Math.sqrt(ddx*ddx + ddz*ddz)
    if (d < (b.userData.interactRadius || 4) && d < nearestDist) {
      nearestBuilding = b
      nearestDist = d
    }
  })

  if (nearestBuilding) {
    showInfo(nearestBuilding.userData.name, nearestBuilding.userData.desc)
  } else if (activeInfo) {
    hideInfo()
  }

  // --- LOCATION NAME ---
  let region = null
  REGIONS.forEach((r) => {
    const d = Math.sqrt((playerPos.x - r.x) ** 2 + (playerPos.z - r.z) ** 2)
    if (d < r.r) region = r
  })
  locationEl.textContent = region ? region.name : '빵별'

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
