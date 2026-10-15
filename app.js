/* =========================================================
   BEVORA — app.js
   Modular vanilla JS: nav, reveals, 3D viewport, catalog, modal
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDrawer();
  initReveals();
  initMaterialPills(); // wires pills to both copy + 3D scene
  initProductCatalog();
  initModal();
  initContactForm();
  initViewport3D(); // Three.js — last, heaviest
});

/* ---------------------------------------------------------
   1. Header — background solidifies on scroll
   --------------------------------------------------------- */
function initHeader() {
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------------------------------------------------
   2. Fullscreen drawer menu
   --------------------------------------------------------- */
function initDrawer() {
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('navDrawer');
  const closeBtn = document.getElementById('drawerClose');

  const open = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  };
  const close = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  };

  toggle.addEventListener('click', () => {
    drawer.classList.contains('open') ? close() : open();
  });
  closeBtn.addEventListener('click', close);

  // Close on link click or Escape
  drawer.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', close);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });
}

/* ---------------------------------------------------------
   3. Scroll reveals via GSAP + ScrollTrigger
   --------------------------------------------------------- */
function initReveals() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero elements animate in immediately on load
  gsap.to('.hero-section [data-reveal]', {
    opacity: 1,
    y: 0,
    duration: 1.1,
    ease: 'power3.out',
    stagger: 0.12,
    delay: 0.2
  });

  // Everything else reveals on scroll
  document.querySelectorAll('[data-reveal]').forEach(el => {
    if (el.closest('.hero-section')) return;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true
      }
    });
  });

  // Scroll cue fades as user leaves hero
  gsap.to('.scroll-cue', {
    opacity: 0,
    scrollTrigger: {
      trigger: '.hero-section',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
}

/* ---------------------------------------------------------
   4. Material data — shared by pills, detail copy & 3D scene
   --------------------------------------------------------- */
const MATERIALS = {
  titanium: {
    label: 'Titanium',
    desc: 'Aerospace-grade and near-indestructible, brushed to a soft, low-glare finish that ages without tarnish.',
    specs: [['Hardness', '6.0 Mohs'], ['Weight', 'Ultra-light'], ['Finish', 'Brushed matte']],
    color: 0x9a9d9f,
    metalness: 0.88,
    roughness: 0.42,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4
  },
  palladium: {
    label: 'Palladium',
    desc: 'A rare platinum-group metal, polished to a bright, mirror-cool white that never needs rhodium plating.',
    specs: [['Hardness', '4.8 Mohs'], ['Weight', 'Dense'], ['Finish', 'High polish']],
    color: 0xdcdedb,
    metalness: 1.0,
    roughness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.08
  },
  rosegold: {
    label: 'Rose Gold',
    desc: 'An 18k blend warmed with copper, giving every piece a soft, romantic glow that suits any skin tone.',
    specs: [['Purity', '18k / 75%'], ['Weight', 'Medium'], ['Finish', 'Polished']],
    color: 0xd8a488,
    metalness: 0.95,
    roughness: 0.22,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15
  },
  carbon: {
    label: 'Carbon Fibre',
    desc: 'Woven and resin-set by hand, prized for a featherweight body and a depth no plated metal can fake.',
    specs: [['Hardness', 'N/A — composite'], ['Weight', 'Featherweight'], ['Finish', 'Gloss weave']],
    color: 0x141414,
    metalness: 0.25,
    roughness: 0.5,
    clearcoat: 0.75,
    clearcoatRoughness: 0.1
  }
};

let onMaterialChange = null; // set by initViewport3D

function initMaterialPills() {
  const pills = document.querySelectorAll('.pill');
  const nameEl = document.getElementById('matName');
  const descEl = document.getElementById('matDesc');
  const specsEl = document.getElementById('matSpecs');

  const applyMaterial = (key) => {
    const mat = MATERIALS[key];
    if (!mat) return;

    nameEl.textContent = mat.label;
    descEl.textContent = mat.desc;
    specsEl.innerHTML = mat.specs
      .map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`)
      .join('');

    pills.forEach(p => {
      const active = p.dataset.material === key;
      p.classList.toggle('active', active);
      p.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (typeof onMaterialChange === 'function') onMaterialChange(mat);
  };

  pills.forEach(pill => {
    pill.addEventListener('click', () => applyMaterial(pill.dataset.material));
  });

  // Expose for the 3D module to sync default state on load
  window.__applyBevoraMaterial = applyMaterial;
}

/* ---------------------------------------------------------
   5. Three.js — procedural luxury ring viewport
   --------------------------------------------------------- */
function initViewport3D() {
  const container = document.getElementById('canvas3d');
  const loadingEl = document.getElementById('viewportLoading');
  if (!container || !window.THREE) return;

  const THREE_ = window.THREE;
  let width = container.clientWidth;
  let height = container.clientHeight;

  // Scene / Camera / Renderer
  const scene = new THREE_.Scene();
  const camera = new THREE_.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0.4, 6.2);

  const renderer = new THREE_.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE_.sRGBEncoding;
  renderer.toneMapping = THREE_.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // Studio lighting rig: ambient + two rim directionals + point light
  const ambient = new THREE_.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const rimLight1 = new THREE_.DirectionalLight(0xfff3da, 2.2);
  rimLight1.position.set(-4, 3, 2);
  scene.add(rimLight1);

  const rimLight2 = new THREE_.DirectionalLight(0xd8e6ff, 1.4);
  rimLight2.position.set(4, -1, -3);
  scene.add(rimLight2);

  const studioPoint = new THREE_.PointLight(0xc9a961, 3.2, 12, 2);
  studioPoint.position.set(1.5, 2.2, 3.5);
  scene.add(studioPoint);

  const fillPoint = new THREE_.PointLight(0x88a4c9, 1.1, 10, 2);
  fillPoint.position.set(-2.5, -1.8, 2.5);
  scene.add(fillPoint);

  // Simple procedural environment map (gradient sphere) for realistic reflections
  scene.environment = buildProceduralEnvMap(THREE_, renderer);

  // ---- Procedural "multi-layered ring" object ----
  const ringGroup = new THREE_.Group();

  const bandMaterial = new THREE_.MeshPhysicalMaterial({
    color: MATERIALS.titanium.color,
    metalness: MATERIALS.titanium.metalness,
    roughness: MATERIALS.titanium.roughness,
    clearcoat: MATERIALS.titanium.clearcoat,
    clearcoatRoughness: MATERIALS.titanium.clearcoatRoughness,
    envMapIntensity: 1.4
  });

  // Outer band
  const outerBand = new THREE_.Mesh(new THREE_.TorusGeometry(1.35, 0.16, 64, 128), bandMaterial);
  ringGroup.add(outerBand);

  // Inner secondary band (slightly offset, layered look)
  const innerBand = new THREE_.Mesh(new THREE_.TorusGeometry(1.35, 0.055, 32, 128), bandMaterial);
  innerBand.position.z = 0.24;
  ringGroup.add(innerBand);

  const innerBand2 = new THREE_.Mesh(new THREE_.TorusGeometry(1.35, 0.055, 32, 128), bandMaterial);
  innerBand2.position.z = -0.24;
  ringGroup.add(innerBand2);

  // Faceted gem accent (icosahedron reads as a cut stone)
  const gemMaterial = new THREE_.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 0.92,
    thickness: 1.2,
    ior: 2.4,
    clearcoat: 1,
    envMapIntensity: 2
  });
  const gem = new THREE_.Mesh(new THREE_.IcosahedronGeometry(0.34, 0), gemMaterial);
  gem.position.set(0, 1.32, 0);
  gem.scale.set(1, 1.15, 1);
  ringGroup.add(gem);

  // Small prong studs around the gem
  const studMaterial = bandMaterial;
  [-0.22, 0.22].forEach((x) => {
    const stud = new THREE_.Mesh(new THREE_.SphereGeometry(0.045, 16, 16), studMaterial);
    stud.position.set(x, 1.55, 0);
    ringGroup.add(stud);
  });

  ringGroup.rotation.x = 0.35;
  scene.add(ringGroup);

  // Soft contact shadow via a transparent circular plane
  const shadowGeo = new THREE_.CircleGeometry(1.9, 48);
  const shadowMat = new THREE_.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28
  });
  const shadowMesh = new THREE_.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2.4;
  shadowMesh.position.y = -1.6;
  scene.add(shadowMesh);

  // Orbit controls — click & drag
  let controls = null;
  if (THREE_.OrbitControls) {
    controls = new THREE_.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 1.7;
    controls.rotateSpeed = 0.6;
  }

  // Idle ambient motion — resumes automatically after inactivity
  let userInteracting = false;
  let idleTimer = null;
  const IDLE_DELAY = 2200;

  const flagInteraction = () => {
    userInteracting = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { userInteracting = false; }, IDLE_DELAY);
  };
  ['pointerdown', 'wheel', 'touchstart'].forEach(evt => {
    renderer.domElement.addEventListener(evt, flagInteraction, { passive: true });
  });

  // Wire material switching for the pills
  onMaterialChange = (mat) => {
    gsap.to(bandMaterial.color, {
      r: ((mat.color >> 16) & 255) / 255,
      g: ((mat.color >> 8) & 255) / 255,
      b: (mat.color & 255) / 255,
      duration: 0.7,
      ease: 'power2.out'
    });
    gsap.to(bandMaterial, {
      metalness: mat.metalness,
      roughness: mat.roughness,
      clearcoat: mat.clearcoat,
      clearcoatRoughness: mat.clearcoatRoughness,
      duration: 0.7,
      ease: 'power2.out'
    });
  };

  // Resize handling
  const handleResize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  // Reveal the canvas once first frame is ready
  requestAnimationFrame(() => {
    loadingEl.classList.add('hidden');
  });

  // Animation loop
  const clock = new THREE_.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (controls) controls.update();

    // Gentle procedural ambient rotation when idle
    if (!userInteracting) {
      ringGroup.rotation.y = t * 0.35;
      ringGroup.position.y = Math.sin(t * 0.8) * 0.05;
    }

    gem.rotation.y = t * 0.6;
    studioPoint.position.x = Math.sin(t * 0.4) * 2 + 1.5;

    renderer.render(scene, camera);
  }
  animate();
}

/* Builds a small procedural gradient environment map so metals get
   believable studio reflections without an external HDRI file. */
function buildProceduralEnvMap(THREE_, renderer) {
  const pmrem = new THREE_.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#3a3d45');
  gradient.addColorStop(0.35, '#c9a961');
  gradient.addColorStop(0.5, '#f4f1ea');
  gradient.addColorStop(0.65, '#1b1e26');
  gradient.addColorStop(1, '#0b0c10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE_.CanvasTexture(canvas);
  tex.mapping = THREE_.EquirectangularReflectionMapping;
  tex.encoding = THREE_.sRGBEncoding;

  const envMap = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return envMap;
}

/* ---------------------------------------------------------
   6. Product catalog — data, render, filter
   --------------------------------------------------------- */
const PRODUCTS = [
  {
    id: 'p1',
    name: 'Solene Band',
    category: 'atelier',
    material: 'Titanium · Brushed',
    price: '$1,240',
    img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'A single unbroken curve of brushed titanium, faceted along one edge to catch light without ever announcing itself.',
    specs: [['Material', 'Grade 5 Titanium'], ['Width', '4.2mm'], ['Finish', 'Brushed matte'], ['Made in', 'Nairobi Atelier']]
  },
  {
    id: 'p2',
    name: 'Odessa Cuff',
    category: 'heritage',
    material: 'Palladium · Polished',
    price: '$3,680',
    img: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'Hand-forged from a single palladium ingot, this cuff carries the hammer marks of the smith who shaped it.',
    specs: [['Material', 'Palladium 950'], ['Width', '14mm'], ['Finish', 'High polish'], ['Made in', 'Geneva Atelier']]
  },
  {
    id: 'p3',
    name: 'Amara Solitaire',
    category: 'bridal',
    material: 'Rose Gold · 18k',
    price: '$5,920',
    img: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1603561596112-0a132b757442?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'A single old-mine cut stone, set high on a tapered rose gold band so it sits like a droplet caught mid-fall.',
    specs: [['Material', '18k Rose Gold'], ['Stone', '1.1ct Old-Mine Cut'], ['Band', 'Tapered'], ['Made in', 'Geneva Atelier']]
  },
  {
    id: 'p4',
    name: 'Vireo Signet',
    category: 'atelier',
    material: 'Carbon Fibre · Resin-Set',
    price: '$1,890',
    img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603561596112-0a132b757442?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'Woven carbon set in a hand-poured resin face, framed by a hairline titanium bezel. Weightless on the hand.',
    specs: [['Material', 'Carbon Fibre + Resin'], ['Bezel', 'Titanium'], ['Weight', '4.1g'], ['Made in', 'Kyoto Atelier']]
  },
  {
    id: 'p5',
    name: 'Halcyon Eternity',
    category: 'bridal',
    material: 'Palladium · Pavé',
    price: '$4,410',
    img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603561596112-0a132b757442?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'Thirty-two stones, hand-set flush into a palladium band so the surface reads smooth under a bare fingertip.',
    specs: [['Material', 'Palladium 950'], ['Stones', '32 · Pavé Set'], ['Width', '2.4mm'], ['Made in', 'Geneva Atelier']]
  },
  {
    id: 'p6',
    name: 'Marrow Chain',
    category: 'heritage',
    material: 'Titanium · Link',
    price: '$2,150',
    img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=1200&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop'
    ],
    description: 'Every link machined and hand-finished separately, so the chain moves like fabric rather than metal.',
    specs: [['Material', 'Grade 5 Titanium'], ['Length', '50cm'], ['Clasp', 'Hidden box'], ['Made in', 'Nairobi Atelier']]
  }
];

function initProductCatalog() {
  const grid = document.getElementById('productGrid');
  const filters = document.querySelectorAll('.badge-filter');
  if (!grid) return;

  const render = (list) => {
    grid.innerHTML = list.map(p => `
      <div class="col-sm-6 col-lg-4">
        <article class="product-card" data-id="${p.id}" data-reveal>
          <div class="product-media">
            <img src="${p.img}" alt="${p.name}" loading="lazy">
            <span class="product-tag">${capitalize(p.category)}</span>
          </div>
          <div class="product-body">
            <h3 class="product-name">${p.name}</h3>
            <p class="product-material">${p.material}</p>
            <div class="product-footer">
              <span class="product-price">${p.price}</span>
              <span class="product-inquiry">Quick Inquiry</span>
            </div>
          </div>
        </article>
      </div>
    `).join('');

    // Re-run reveal animation for freshly injected cards
    if (window.gsap) {
      gsap.fromTo(grid.querySelectorAll('.product-card'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }
      );
    }

    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => openProductModal(card.dataset.id));
    });
  };

  render(PRODUCTS);

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
      render(filtered);
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ---------------------------------------------------------
   7. Product detail modal
   --------------------------------------------------------- */
function initModal() {
  const modal = document.getElementById('productModal');
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
  };

  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });

  window.__closeBevoraModal = close;
}

function openProductModal(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const modal = document.getElementById('productModal');
  document.getElementById('modalCategory').textContent = capitalize(product.category);
  document.getElementById('modalTitle').textContent = product.name;
  document.getElementById('modalPrice').textContent = product.price;
  document.getElementById('modalDescription').textContent = product.description;
  document.getElementById('modalMainImg').src = product.gallery[0];
  document.getElementById('modalMainImg').alt = product.name;

  document.getElementById('modalSpecs').innerHTML = product.specs
    .map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`)
    .join('');

  const thumbs = document.getElementById('modalThumbs');
  thumbs.innerHTML = product.gallery
    .map((src, i) => `<img src="${src}" alt="${product.name} view ${i + 1}" class="${i === 0 ? 'active' : ''}">`)
    .join('');

  thumbs.querySelectorAll('img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('modalMainImg').src = thumb.src;
      thumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
}

/* ---------------------------------------------------------
   8. Contact form — inline confirmation, no page reload
   --------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Enquiry Sent ✦';
    btn.disabled = true;
    form.reset();
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2600);
  });
}
