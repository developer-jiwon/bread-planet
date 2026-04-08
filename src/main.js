import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing'

// ============================================
// WORLD CONFIG
// ============================================
const MAP_SIZE = 200
const REGIONS = [
  { name: '크루아상 산맥', nameEn: 'Croissant Mountains', desc: '버터가 녹아 흐르는 황금빛 산맥.\n가장 바삭한 봉우리에서 해가 뜬다.', x: 0, z: -40, radius: 30, color: 0xD4A574, height: 8, asset: 'croissant-mountain', count: 5 },
  { name: '꿀 호수', nameEn: 'Honey Lake', desc: '달콤한 꿀이 천천히 일렁이는 호수.\n호수 바닥에는 황금빛 빛이 흐른다.', x: 35, z: 20, radius: 20, color: 0xF5A623, height: 0.3, asset: 'honey-lake', count: 1 },
  { name: '우유 바다', nameEn: 'Milk Sea', desc: '부드러운 우유가 잔잔히 출렁이는 바다.\n크림 거품이 파도처럼 밀려온다.', x: -45, z: 30, radius: 25, color: 0xF5F0E8, height: 0.2, asset: 'milk-sea', count: 1 },
  { name: '밀밭', nameEn: 'Wheat Fields', desc: '황금빛 밀이 바람에 물결치는 들판.\n모든 빵의 시작점.', x: 30, z: -30, radius: 22, color: 0xE8D5A3, height: 1, asset: 'wheat-field', count: 3 },
  { name: '딸기잼 강', nameEn: 'Jam River', desc: '진한 딸기잼이 흐르는 달콤한 강.\n양 옆으로 딸기가 자란다.', x: -20, z: -10, radius: 15, color: 0xFF6B8A, height: 0.5, asset: 'jam-river', count: 2 },
]

const BUILDINGS = [
  { name: '프랑스 빵집', desc: '바게트와 크루아상의 본고장.\n매일 아침 4시에 불이 켜진다.', asset: 'french-bakery', x: -8, z: 5, scale: 4 },
  { name: '일본 빵집', desc: '멜론빵과 앙금빵의 성지.\n카레빵은 늘 오후 2시에 나온다.', asset: 'japan-bakery', x: 8, z: -5, scale: 4 },
  { name: '이탈리아 빵집', desc: '포카치아와 치아바타의 고향.\n올리브 오일 향이 마을을 감싼다.', asset: 'italian-bakery', x: 15, z: 10, scale: 4 },
  { name: '한국 빵집', desc: '소보로와 크림빵의 천국.\n슈크림은 항상 줄을 서야 한다.', asset: 'korean-bakery', x: -15, z: 12, scale: 4 },
  { name: '풍차', desc: '밀을 갈아 밀가루를 만드는 풍차.\n날개가 돌 때마다 밀가루가 날린다.', asset: 'windmill', x: 25, z: -15, scale: 5 },
  { name: '오븐 타워', desc: '빵별에서 가장 높은 건물.\n24시간 빵을 굽는다.', asset: 'oven-tower', x: 0, z: 0, scale: 6 },
]

const BREAD_TYPES = {
  baguette: { name: '바게트', asset: 'baguette-projectile', speed: 80, arc: 0.3, spin: 2 },
  croissant: { name: '크루아상', asset: 'croissant-projectile', speed: 60, arc: 0.5, spin: 5 },
  'melon-pan': { name: '멜론빵', asset: 'melon-pan-projectile', speed: 50, arc: 0.7, spin: 3 },
  pretzel: { name: '프레첼', asset: 'pretzel-projectile', speed: 70, arc: 0.4, spin: 8 },
}

// ============================================
// THREE.JS SETUP
// ============================================
const canvas = document.getElementById('planet-canvas')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xFFF8E7)
scene.fog = new THREE.FogExp2(0xFFF8E7, 0.008)

// Orthographic camera (top-down map view)
const frustum = 30
const aspect = window.innerWidth / window.innerHeight
const camera = new THREE.OrthographicCamera(
  -frustum * aspect, frustum * aspect,
  frustum, -frustum, 0.1, 500
)
camera.position.set(0, 60, 30)
camera.lookAt(0, 0, 0)

// Perspective camera for bread-follow mode
const perspCam = new THREE.PerspectiveCamera(50, aspect, 0.1, 500)

let activeCamera = camera
let isFollowingBread = false

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// ============================================
// POST-PROCESSING
// ============================================
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomEffect = new BloomEffect({ intensity: 0.4, luminanceThreshold: 0.6, mipmapBlur: true })
const vignetteEffect = new VignetteEffect({ darkness: 0.3, offset: 0.3 })
composer.addPass(new EffectPass(camera, bloomEffect, vignetteEffect))

// ============================================
// LIGHTING — warm bakery light
// ============================================
const ambientLight = new THREE.AmbientLight(0xFFE4C4, 0.8)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight(0xFFDDAA, 1.2)
sunLight.position.set(20, 40, 15)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 100
sunLight.shadow.camera.left = -50
sunLight.shadow.camera.right = 50
sunLight.shadow.camera.top = 50
sunLight.shadow.camera.bottom = -50
scene.add(sunLight)

// Warm point light at center (oven tower)
const ovenLight = new THREE.PointLight(0xFF8844, 1.5, 40)
ovenLight.position.set(0, 5, 0)
scene.add(ovenLight)

// ============================================
// GROUND — bread-colored terrain
// ============================================
const groundGeo = new THREE.CircleGeometry(MAP_SIZE / 2, 64)
const groundMat = new THREE.MeshStandardMaterial({
  color: 0xF5DEB3,
  roughness: 0.9,
  metalness: 0,
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Region colored areas
REGIONS.forEach((r) => {
  const geo = new THREE.CircleGeometry(r.radius, 32)
  const mat = new THREE.MeshStandardMaterial({
    color: r.color,
    roughness: 0.8,
    transparent: true,
    opacity: 0.7,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(r.x, 0.05, r.z)
  mesh.receiveShadow = true
  scene.add(mesh)
})

// ============================================
// LOAD ASSETS AS SPRITES
// ============================================
const textureLoader = new THREE.TextureLoader()
const allObjects = []
const clickables = []

// Wiggle shader for sprites
const wiggleVert = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float sway = sin(uTime * 1.5 + pos.y * 2.0) * 0.15 * (1.0 - uv.y);
    pos.x += sway;
    pos.y += sin(uTime * 0.8) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
const spriteFrag = `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    if (tex.a < 0.05) discard;
    gl_FragColor = tex;
  }
`

function createBillboard(assetName, x, y, z, scale, data) {
  const texture = textureLoader.load(`/assets/${assetName}.png`)
  texture.colorSpace = THREE.SRGBColorSpace

  const geo = new THREE.PlaneGeometry(scale, scale, 6, 6)
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTexture: { value: texture }, uTime: { value: 0 } },
    vertexShader: wiggleVert,
    fragmentShader: spriteFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  mesh.userData = { ...data, isClickable: !!data.name }

  scene.add(mesh)
  allObjects.push(mesh)
  if (data.name) clickables.push(mesh)
  return mesh
}

// Place region assets
REGIONS.forEach((r) => {
  for (let i = 0; i < r.count; i++) {
    const angle = (i / r.count) * Math.PI * 2
    const dist = r.radius * 0.5 * Math.random()
    const x = r.x + Math.cos(angle) * dist
    const z = r.z + Math.sin(angle) * dist
    createBillboard(r.asset, x, r.height + 2, z, 5 + Math.random() * 3, { name: r.name, desc: r.desc })
  }
})

// Place buildings
BUILDINGS.forEach((b) => {
  createBillboard(b.asset, b.x, b.scale / 2 + 0.5, b.z, b.scale, { name: b.name, desc: b.desc })
})

// Scatter decorations
for (let i = 0; i < 20; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = Math.random() * 50
  const x = Math.cos(angle) * dist
  const z = Math.sin(angle) * dist
  const deco = ['cherry-blossom-tree', 'bread-basket', 'flour-cloud'][Math.floor(Math.random() * 3)]
  createBillboard(deco, x, 1.5 + Math.random(), z, 2 + Math.random() * 2, {})
}

// Bread cat & creatures wandering
for (let i = 0; i < 8; i++) {
  const creature = ['bread-cat', 'flour-spirit', 'butter-slime'][Math.floor(Math.random() * 3)]
  const angle = Math.random() * Math.PI * 2
  const dist = 10 + Math.random() * 35
  createBillboard(creature, Math.cos(angle) * dist, 1, Math.sin(angle) * dist, 2, {
    wanderSpeed: 0.3 + Math.random() * 0.5,
    wanderPhase: Math.random() * Math.PI * 2,
  })
}

// ============================================
// FLOUR PARTICLES
// ============================================
const FLOUR_COUNT = 500
const flourGeo = new THREE.BufferGeometry()
const flourPos = new Float32Array(FLOUR_COUNT * 3)
for (let i = 0; i < FLOUR_COUNT; i++) {
  flourPos[i*3] = (Math.random()-0.5) * MAP_SIZE * 0.6
  flourPos[i*3+1] = Math.random() * 15
  flourPos[i*3+2] = (Math.random()-0.5) * MAP_SIZE * 0.6
}
flourGeo.setAttribute('position', new THREE.BufferAttribute(flourPos, 3))
const flourMat = new THREE.PointsMaterial({
  color: 0xFFF8E7, size: 0.15, transparent: true, opacity: 0.4,
  sizeAttenuation: true, depthWrite: false,
})
scene.add(new THREE.Points(flourGeo, flourMat))

// Steam particles near oven
const STEAM_COUNT = 100
const steamGeo = new THREE.BufferGeometry()
const steamPos = new Float32Array(STEAM_COUNT * 3)
const steamSpeeds = new Float32Array(STEAM_COUNT)
for (let i = 0; i < STEAM_COUNT; i++) {
  steamPos[i*3] = (Math.random()-0.5) * 6
  steamPos[i*3+1] = Math.random() * 10
  steamPos[i*3+2] = (Math.random()-0.5) * 6
  steamSpeeds[i] = 0.01 + Math.random() * 0.03
}
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3))
const steamMat = new THREE.PointsMaterial({
  color: 0xFFEEDD, size: 0.3, transparent: true, opacity: 0.3,
  sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
})
scene.add(new THREE.Points(steamGeo, steamMat))

// ============================================
// BREAD PROJECTILES
// ============================================
let selectedBread = 'baguette'
const flyingBreads = []

function shootBread(targetX, targetZ) {
  const breadDef = BREAD_TYPES[selectedBread]
  const texture = textureLoader.load(`/assets/${breadDef.asset}.png`)
  texture.colorSpace = THREE.SRGBColorSpace

  const size = 2.5
  const geo = new THREE.PlaneGeometry(size, size)
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })
  const bread = new THREE.Mesh(geo, mat)

  // Start from camera center, slightly below
  const startX = camTarget.x
  const startZ = camTarget.z + 5
  bread.position.set(startX, 15, startZ)

  const dx = targetX - startX
  const dz = targetZ - startZ
  const dist = Math.sqrt(dx*dx + dz*dz)
  const duration = dist / breadDef.speed * 2

  scene.add(bread)

  // Animate bread flying in arc
  const tl = gsap.timeline({
    onComplete: () => {
      // Impact effect
      createImpact(targetX, targetZ)
      scene.remove(bread)
      flyingBreads.splice(flyingBreads.indexOf(bread), 1)
      // Return to ortho camera
      if (isFollowingBread) {
        isFollowingBread = false
        gsap.to(camera.position, {
          x: camTarget.x, z: camTarget.z + 30, y: 60,
          duration: 0.8, ease: 'power2.inOut',
          onUpdate: () => camera.lookAt(camTarget.x, 0, camTarget.z),
        })
        activeCamera = camera
        composer.passes[0] = new RenderPass(scene, camera)
      }
    }
  })

  // XZ movement
  tl.to(bread.position, { x: targetX, z: targetZ, duration, ease: 'none' }, 0)
  // Y arc
  tl.to(bread.position, { y: 20 + dist * breadDef.arc * 0.3, duration: duration * 0.4, ease: 'power2.out' }, 0)
  tl.to(bread.position, { y: 1, duration: duration * 0.6, ease: 'power2.in' }, duration * 0.4)
  // Spin
  tl.to(bread.rotation, { z: Math.PI * breadDef.spin, duration, ease: 'none' }, 0)

  flyingBreads.push(bread)

  // Switch to perspective follow cam
  isFollowingBread = true
  activeCamera = perspCam
  composer.passes[0] = new RenderPass(scene, perspCam)
}

function createImpact(x, z) {
  // Flour explosion particles
  const count = 30
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15)
    const mat = new THREE.MeshBasicMaterial({ color: 0xFFF8E7, transparent: true, opacity: 0.8 })
    const p = new THREE.Mesh(geo, mat)
    p.position.set(x, 1, z)
    scene.add(p)

    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 5
    const vx = Math.cos(angle) * speed
    const vz = Math.sin(angle) * speed

    gsap.to(p.position, { x: x + vx, y: 1 + Math.random() * 4, z: z + vz, duration: 0.6, ease: 'power2.out' })
    gsap.to(p.material, { opacity: 0, duration: 0.8, delay: 0.3, onComplete: () => scene.remove(p) })
  }

  // Screen shake
  gsap.to(camera.position, { x: camera.position.x + (Math.random()-0.5)*0.5, duration: 0.05, yoyo: true, repeat: 5 })
}

// ============================================
// CAMERA CONTROLS (pan/zoom)
// ============================================
const camTarget = { x: 0, z: 0 }
let isDragging = false
let dragStart = { x: 0, y: 0 }
let zoom = 30

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2 || e.button === 1) { // Right/middle click = drag
    isDragging = true
    dragStart = { x: e.clientX, y: e.clientY }
    return
  }
})

canvas.addEventListener('mousemove', (e) => {
  // Update crosshair
  crosshair.style.left = e.clientX + 'px'
  crosshair.style.top = e.clientY + 'px'

  if (isDragging) {
    const dx = (e.clientX - dragStart.x) * 0.1 * (zoom / 30)
    const dy = (e.clientY - dragStart.y) * 0.1 * (zoom / 30)
    camTarget.x -= dx
    camTarget.z -= dy
    dragStart = { x: e.clientX, y: e.clientY }
  }
})

canvas.addEventListener('mouseup', () => { isDragging = false })

// Left click = shoot bread
canvas.addEventListener('click', (e) => {
  if (isFollowingBread) return

  // Raycast to find world position
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  // Check clickable objects first
  const hits = raycaster.intersectObjects(clickables)
  if (hits.length > 0) {
    const data = hits[0].object.userData
    if (data.name) {
      showInfo(data.name, data.desc)
      return
    }
  }

  // Otherwise, find ground position and shoot
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const target = new THREE.Vector3()
  raycaster.ray.intersectPlane(groundPlane, target)

  if (target) {
    shootBread(target.x, target.z)
  }
})

// Scroll = zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  zoom += e.deltaY * 0.02
  zoom = Math.max(10, Math.min(80, zoom))
}, { passive: false })

// Prevent context menu
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

// ============================================
// BREAD SELECTOR
// ============================================
document.querySelectorAll('.bread-option').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    document.querySelectorAll('.bread-option').forEach((b) => b.classList.remove('active'))
    el.classList.add('active')
    selectedBread = el.dataset.bread
  })
})

// ============================================
// INFO PANEL
// ============================================
const infoPanel = document.getElementById('info-panel')
const infoTitle = document.getElementById('info-title')
const infoDesc = document.getElementById('info-desc')
const crosshair = document.getElementById('crosshair')

function showInfo(title, desc) {
  infoTitle.textContent = title
  infoDesc.textContent = desc
  infoPanel.classList.remove('hidden')
}

document.getElementById('info-close').addEventListener('click', () => {
  infoPanel.classList.add('hidden')
})

// ============================================
// AUDIO — Lofi Bakery Ambience
// ============================================
let audioStarted = false
const audioState = {}

function initAudio() {
  if (audioStarted) return
  audioStarted = true

  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  const master = ctx.createGain()
  master.gain.value = 0.6
  master.connect(ctx.destination)

  // Warm pad (major chord: C3-E3-G3)
  const notes = [130.81, 164.81, 196.00, 261.63]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = i < 2 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.value = 0.04
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 300
    osc.connect(filter).connect(gain).connect(master)
    osc.start()
  })

  // Gentle rhythm (soft kick-like pulse)
  const bufSize = ctx.sampleRate * 2
  const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  noise.loop = true
  const noiseBP = ctx.createBiquadFilter()
  noiseBP.type = 'bandpass'
  noiseBP.frequency.value = 200
  noiseBP.Q.value = 1
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.02
  noise.connect(noiseBP).connect(noiseGain).connect(master)
  noise.start()

  audioState.ctx = ctx
}

;['click', 'touchstart', 'wheel', 'keydown', 'mousedown'].forEach((evt) => {
  document.addEventListener(evt, initAudio, { once: true })
  window.addEventListener(evt, initAudio, { once: true })
})

// ============================================
// RENDER LOOP
// ============================================
const clock = new THREE.Clock()
const locationEl = document.getElementById('location-name')
const coordsEl = document.getElementById('coordinates')

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Update ortho camera
  if (!isFollowingBread) {
    const f = zoom
    camera.left = -f * aspect
    camera.right = f * aspect
    camera.top = f
    camera.bottom = -f
    camera.updateProjectionMatrix()

    camera.position.x += (camTarget.x - camera.position.x) * 0.08
    camera.position.z += (camTarget.z + 30 - camera.position.z) * 0.08
    camera.position.y += (60 - camera.position.y) * 0.08
    camera.lookAt(camTarget.x, 0, camTarget.z)
  }

  // Follow bread in perspective
  if (isFollowingBread && flyingBreads.length > 0) {
    const bread = flyingBreads[flyingBreads.length - 1]
    const behindX = bread.position.x
    const behindZ = bread.position.z + 8
    perspCam.position.set(behindX, bread.position.y + 5, behindZ)
    perspCam.lookAt(bread.position.x, bread.position.y, bread.position.z - 5)
  }

  // Billboards face camera
  allObjects.forEach((obj) => {
    if (obj.material?.uniforms?.uTime) {
      obj.material.uniforms.uTime.value = t
    }
    // Billboard: rotate to face camera
    obj.lookAt(activeCamera.position.x, obj.position.y, activeCamera.position.z)

    // Wander creatures
    const u = obj.userData
    if (u.wanderSpeed) {
      obj.position.x += Math.sin(t * u.wanderSpeed + u.wanderPhase) * 0.02
      obj.position.z += Math.cos(t * u.wanderSpeed * 0.7 + u.wanderPhase) * 0.015
    }
  })

  // Flour particles drift
  const fp = flourGeo.attributes.position
  for (let i = 0; i < FLOUR_COUNT; i++) {
    fp.array[i*3] += Math.sin(t * 0.3 + i * 0.5) * 0.003
    fp.array[i*3+1] += 0.002
    fp.array[i*3+2] += Math.cos(t * 0.2 + i * 0.3) * 0.002
    if (fp.array[i*3+1] > 15) fp.array[i*3+1] = 0.5
  }
  fp.needsUpdate = true

  // Steam rises
  const sp = steamGeo.attributes.position
  for (let i = 0; i < STEAM_COUNT; i++) {
    sp.array[i*3+1] += steamSpeeds[i]
    sp.array[i*3] += Math.sin(t * 0.5 + i) * 0.005
    if (sp.array[i*3+1] > 12) {
      sp.array[i*3+1] = 0.5
      sp.array[i*3] = (Math.random()-0.5) * 6
      sp.array[i*3+2] = (Math.random()-0.5) * 6
    }
  }
  sp.needsUpdate = true

  // Oven light flicker
  ovenLight.intensity = 1.5 + Math.sin(t * 3) * 0.2

  // Update location name based on camera position
  let closest = null
  let closestDist = Infinity
  REGIONS.forEach((r) => {
    const dx = camTarget.x - r.x
    const dz = camTarget.z - r.z
    const d = Math.sqrt(dx*dx + dz*dz)
    if (d < r.radius && d < closestDist) {
      closest = r
      closestDist = d
    }
  })
  locationEl.textContent = closest ? closest.name : '빵별'
  coordsEl.textContent = `${camTarget.x.toFixed(0)}, ${camTarget.z.toFixed(0)}`

  // AudioContext resume check
  if (audioState.ctx?.state === 'suspended') audioState.ctx.resume()

  // Render
  composer.passes[0] = new RenderPass(scene, activeCamera)
  composer.render()
}

// ============================================
// LOADING
// ============================================
const loadingEl = document.getElementById('loading')
textureLoader.manager.onLoad = () => {
  if (loadingEl) {
    gsap.to(loadingEl, { opacity: 0, duration: 0.8, delay: 0.5, onComplete: () => loadingEl.remove() })
  }
}

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight
  camera.left = -zoom * a; camera.right = zoom * a
  camera.top = zoom; camera.bottom = -zoom
  camera.updateProjectionMatrix()
  perspCam.aspect = a
  perspCam.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ============================================
// START
// ============================================
animate()
