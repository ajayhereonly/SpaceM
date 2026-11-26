import * as THREE from 'three';
import type { ProceduralTexturePack } from './proceduralTextures';

export function marsGroundHeightAt(x: number, z: number): number {
  const distSq = x * x + z * z;
  // Flat Jezero landing basin near center (radius 10m), rolling hills & crater rim beyond
  const basinFactor = THREE.MathUtils.smoothstep(Math.sqrt(distSq), 8, 22);
  const dunes =
    Math.sin(x * 0.14) * Math.cos(z * 0.12) * 0.9 +
    Math.sin(x * 0.06 + z * 0.08) * 1.4;
  const craterRim = THREE.MathUtils.smoothstep(Math.sqrt(distSq), 34, 62) * 9.5;
  return basinFactor * dunes + craterRim;
}

export interface ApolloSpacecraftRig {
  root: THREE.Group;
  stage1Group: THREE.Group;
  flameGroup: THREE.Group;
  antigravRing: THREE.Mesh;
  solarLeft: THREE.Group;
  solarRight: THREE.Group;
  dishGroup: THREE.Group;
  shieldMesh: THREE.Mesh;
}

export function createApolloSpacecraft(textures: ProceduralTexturePack): ApolloSpacecraftRig {
  const root = new THREE.Group();

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hullMap,
    metalness: 0.65,
    roughness: 0.3,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.42,
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xf5b324,
    metalness: 0.88,
    roughness: 0.26,
    bumpMap: textures.goldFoilBump,
    bumpScale: 0.05,
  });

  const heatShieldMat = new THREE.MeshStandardMaterial({
    color: 0x2a2422,
    metalness: 0.15,
    roughness: 0.86,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    metalness: 0.2,
    roughness: 0.12,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    metalness: 0.55,
    roughness: 0.2,
    emissive: 0x0b2559,
    emissiveIntensity: 0.35,
  });

  // 1. Conical Apollo 11 Command Module (CM)
  const cmCone = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 1.45, 2.2, 24), titaniumMat);
  cmCone.position.y = 4.6;
  cmCone.castShadow = true;
  root.add(cmCone);

  // Docking probe spire on nose
  const dockingCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.35, 16), goldFoilMat);
  dockingCollar.position.y = 5.85;
  root.add(dockingCollar);

  const dockingProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.75, 12), darkMetalMat);
  dockingProbe.position.y = 6.35;
  root.add(dockingProbe);

  // Forward cockpit observation windows
  const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), windowMat);
  leftWin.position.set(-0.42, 4.65, 1.02);
  leftWin.rotation.set(-0.38, -0.32, 0);
  root.add(leftWin);

  const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), windowMat);
  rightWin.position.set(0.42, 4.65, 1.02);
  rightWin.rotation.set(-0.38, 0.32, 0);
  root.add(rightWin);

  // Ablative Heat Shield Rim at CM base
  const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.42, 0.28, 24), heatShieldMat);
  heatShield.position.y = 3.42;
  root.add(heatShield);

  // 2. Service Module (SM) with gold Kapton band & radiators
  const smBody = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 3.2, 24), titaniumMat);
  smBody.position.y = 1.72;
  smBody.castShadow = true;
  root.add(smBody);

  const goldCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.45, 24), goldFoilMat);
  goldCollar.position.y = 2.95;
  root.add(goldCollar);

  // 4 RCS thruster quads around SM
  for (let i = 0; i < 4; i += 1) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.26), darkMetalMat);
    pod.position.set(Math.cos(angle) * 1.48, 2.2, Math.sin(angle) * 1.48);
    pod.rotation.y = -angle;
    root.add(pod);
  }

  // 3. Futuristic Superconducting Antigravity Ring (glows cyan/amber when active!)
  const antigravRingMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5,
    metalness: 0.7,
    roughness: 0.18,
  });
  const antigravRing = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.11, 14, 48), antigravRingMat);
  antigravRing.rotation.x = Math.PI / 2;
  antigravRing.position.y = 1.65;
  root.add(antigravRing);

  // 4 struts connecting gravitic ring to SM
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.12), darkMetalMat);
    strut.position.set(Math.cos(a) * 1.66, 1.65, Math.sin(a) * 1.66);
    strut.rotation.y = -a;
    root.add(strut);
  }

  // Twin Solar-Fusion Wings
  const buildSolarWing = (dir: number): THREE.Group => {
    const wing = new THREE.Group();
    wing.position.set(dir * 1.45, 1.4, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), darkMetalMat);
    arm.position.x = dir * 0.45;
    wing.add(arm);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 1.15), solarMat);
    panel.position.x = dir * 2.4;
    wing.add(panel);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.08), goldFoilMat);
    frame.position.set(dir * 2.4, 0, 0.6);
    wing.add(frame);
    return wing;
  };
  const solarLeft = buildSolarWing(-1);
  const solarRight = buildSolarWing(1);
  root.add(solarLeft, solarRight);

  // High-Gain Parabolic Comms Dish
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 0.65, 1.55);
  const dishArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), darkMetalMat);
  dishArm.rotation.x = Math.PI / 3;
  dishGroup.add(dishArm);
  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
    goldFoilMat,
  );
  dishBowl.position.set(0, -0.15, 0.45);
  dishBowl.rotation.x = -Math.PI * 0.65;
  dishGroup.add(dishBowl);
  root.add(dishGroup);

  // SPS Upper Stage Engine Bell
  const spsBell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.92, 1.15, 20, 1, true), darkMetalMat);
  spsBell.material.side = THREE.DoubleSide;
  spsBell.position.y = -0.35;
  root.add(spsBell);

  // 4. Detachable Saturn-XI First Stage Booster
  const stage1Group = new THREE.Group();
  const saturnMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.saturnRollMap,
    metalness: 0.28,
    roughness: 0.48,
  });

  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.72, 1.4, 24), darkMetalMat);
  interstage.position.y = -0.55;
  stage1Group.add(interstage);

  const boosterBody = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.78, 6.2, 24), saturnMat);
  boosterBody.position.y = -4.35;
  boosterBody.castShadow = true;
  stage1Group.add(boosterBody);

  // 4 aerodynamic tail fins
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.55, 0.12), darkMetalMat);
    fin.position.set(Math.cos(a) * 2.05, -6.5, Math.sin(a) * 2.05);
    fin.rotation.y = -a;
    stage1Group.add(fin);
  }

  // 5 Saturn-XI engine bells
  const engineOffsets: [number, number][] = [
    [0, 0],
    [0.95, 0],
    [-0.95, 0],
    [0, 0.95],
    [0, -0.95],
  ];
  for (const [ex, ez] of engineOffsets) {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 0.95, 14), darkMetalMat);
    bell.position.set(ex, -7.8, ez);
    stage1Group.add(bell);
  }
  root.add(stage1Group);

  // 5. Animated Engine Exhaust Plume
  const flameGroup = new THREE.Group();
  flameGroup.position.y = -8.3;
  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(1.65, 7.5, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  outerFlame.rotation.x = Math.PI;
  outerFlame.position.y = -3.75;
  flameGroup.add(outerFlame);

  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 5.2, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  innerFlame.rotation.x = Math.PI;
  innerFlame.position.y = -2.6;
  flameGroup.add(innerFlame);
  flameGroup.visible = false;
  root.add(flameGroup);

  // 6. Magnetic Radiation Shield bubble (visible when solarShield switch is ON in space)
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 24, 18),
    new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
      depthWrite: false,
    }),
  );
  shieldMesh.position.y = 2.4;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  return {
    root,
    stage1Group,
    flameGroup,
    antigravRing,
    solarLeft,
    solarRight,
    dishGroup,
    shieldMesh,
  };
}

export function createLaunchpad(textures: ProceduralTexturePack): THREE.Group {
  const pad = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.08,
  });
  const gantryRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.55,
    metalness: 0.45,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.4,
    metalness: 0.7,
  });

  // Ground apron
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(42, 46, 0.8, 32), concreteMat);
  ground.position.y = -0.4;
  ground.receiveShadow = true;
  pad.add(ground);

  // Blast deck pedestal
  const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 12), concreteMat);
  deck.position.y = 0.7;
  deck.receiveShadow = true;
  pad.add(deck);

  // Contact shadow disc under rocket
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 24),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 1.43;
  pad.add(shadowDisc);

  // Launch Gantry Tower
  const towerX = -5.2;
  const pillars: [number, number][] = [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ];
  for (const [px, pz] of pillars) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, 17, 0.24), gantryRedMat);
    col.position.set(towerX + px, 8.5, pz);
    col.castShadow = true;
    pad.add(col);
  }

  for (let level = 2.5; level <= 16.5; level += 2.8) {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 2.1), steelMat);
    platform.position.set(towerX, level, 0);
    pad.add(platform);
  }

  // Crew Access Swing Arm connecting tower to Command Module hatch
  const accessArm = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.45, 0.55), steelMat);
  accessArm.position.set(towerX + 2.75, 13.8, 0);
  pad.add(accessArm);

  // Lightning arrestor mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 4.5, 8), steelMat);
  mast.position.set(towerX, 19.2, 0);
  pad.add(mast);

  return pad;
}

export interface AntigravityCabinRig {
  root: THREE.Group;
  floaters: Array<{
    mesh: THREE.Object3D;
    deckY: number;
    floatY: number;
    phaseOffset: number;
    spinSpeed: number;
  }>;
  gravRingMesh: THREE.Mesh;
}

export function createAntigravityCabinProps(textures: ProceduralTexturePack): AntigravityCabinRig {
  const root = new THREE.Group();

  const bulkheadMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.6,
    metalness: 0.45,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.48,
    metalness: 0.55,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.22,
    bumpMap: textures.goldFoilBump,
    bumpScale: 0.03,
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.2,
    metalness: 0.5,
    roughness: 0.2,
  });

  // Circular cabin deck floor
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.2, 32), deckMat);
  floor.position.y = -1.6;
  root.add(floor);

  // Curved back bulkhead arc
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.4, 4.2, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7),
    bulkheadMat,
  );
  wall.material.side = THREE.DoubleSide;
  wall.position.y = 0.5;
  root.add(wall);

  // Back bulkhead glowing Apollo cockpit monitor screens
  const panelColors = [0x0ea5e9, 0xf59e0b, 0x10b981];
  for (let i = 0; i < 3; i += 1) {
    const angle = Math.PI + (i - 1) * 0.42;
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.58, 0.08),
      new THREE.MeshStandardMaterial({
        color: panelColors[i],
        emissive: panelColors[i],
        emissiveIntensity: 0.75,
        roughness: 0.2,
      }),
    );
    screen.position.set(Math.sin(angle) * 4.15, 0.35, Math.cos(angle) * 4.15);
    screen.lookAt(0, 0.35, 0);
    root.add(screen);
  }

  // Illuminated Gravitic Floor Ring
  const gravRingMesh = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 12, 48), cyanMat);
  gravRingMesh.rotation.x = Math.PI / 2;
  gravRingMesh.position.y = -1.46;
  root.add(gravRingMesh);

  // Floating Prop 1: Apollo Titanium Wrench
  const wrench = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.95, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }),
  );
  const head = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.06, 8, 16, Math.PI * 1.45),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 }),
  );
  head.position.y = 0.52;
  wrench.add(handle, head);
  wrench.position.set(-1.35, -1.25, 0.4);
  root.add(wrench);

  // Floating Prop 2: Glowing Telemetry Data Tablet
  const tablet = new THREE.Group();
  const tBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.52, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.65, roughness: 0.35 }),
  );
  const tScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.42, 0.07),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.12,
    }),
  );
  tablet.add(tBody, tScreen);
  tablet.position.set(0, -1.2, 0.85);
  root.add(tablet);

  // Floating Prop 3: Pressurized O2 Canister
  const o2Can = new THREE.Group();
  const o2Body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.82, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.35 }),
  );
  const o2Band = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.16, 16), goldMat);
  const o2Cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), o2Body.material);
  o2Cap.position.y = 0.41;
  o2Can.add(o2Body, o2Band, o2Cap);
  o2Can.position.set(1.38, -1.08, 0.25);
  root.add(o2Can);

  // Floating Prop 4: Superconducting Brass Gyroscope Orb
  const gyro = new THREE.Group();
  const gCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), goldMat);
  const gRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 10, 28), cyanMat);
  const gRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 10, 28), goldMat);
  gRing2.rotation.x = Math.PI / 2;
  gyro.add(gCore, gRing1, gRing2);
  gyro.position.set(0.1, -0.95, -0.65);
  root.add(gyro);

  return {
    root,
    gravRingMesh,
    floaters: [
      { mesh: wrench, deckY: -1.38, floatY: 0.55, phaseOffset: 0.0, spinSpeed: 0.85 },
      { mesh: tablet, deckY: -1.24, floatY: 0.72, phaseOffset: 1.4, spinSpeed: 0.55 },
      { mesh: o2Can, deckY: -1.08, floatY: 0.65, phaseOffset: 2.8, spinSpeed: 0.65 },
      { mesh: gyro, deckY: -0.96, floatY: 1.05, phaseOffset: 4.1, spinSpeed: 1.35 },
    ],
  };
}

export interface MarsSurfaceRig {
  root: THREE.Group;
  roverGroup: THREE.Group;
  drillGroup: THREE.Group;
  moxieGroup: THREE.Group;
  relayGroup: THREE.Group;
  habitatGroup: THREE.Group;
  seismicGroup: THREE.Group;
  astronauts: THREE.Group[];
  drillBit: THREE.Mesh;
}

function createSuitedAstronaut(accentColor: string, textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const suitWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.15 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, metalness: 0.3 });
  const darkBoot = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.25 });
  const visorGold = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.14,
  });

  // Boots + legs (pivot at bottom center y=0)
  for (const sx of [-0.14, 0.14]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.26), darkBoot);
    boot.position.set(sx, 0.07, 0.04);
    g.add(boot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.62, 10), suitWhite);
    leg.position.set(sx, 0.44, 0);
    g.add(leg);
  }
  // Pressurized torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.28), suitWhite);
  torso.position.y = 1.02;
  g.add(torso);
  // Chest life support unit
  const chestBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.12), accentMat);
  chestBox.position.set(0, 1.05, 0.16);
  g.add(chestBox);
  // PLSS Backpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.22), suitWhite);
  pack.position.set(0, 1.08, -0.22);
  g.add(pack);
  // Arms
  for (const sx of [-0.3, 0.3]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.5, 10), suitWhite);
    arm.position.set(sx, 0.98, 0.04);
    arm.rotation.z = sx > 0 ? -0.18 : 0.18;
    g.add(arm);
  }
  // Helmet + reflective gold visor
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), suitWhite);
  helmet.position.y = 1.5;
  g.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.22, Math.PI * 0.52),
    visorGold,
  );
  visor.position.set(0, 1.5, 0.07);
  g.add(visor);

  // Soft contact shadow at feet
  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  g.add(sh);

  return g;
}

export function createMarsSurfaceWorld(textures: ProceduralTexturePack): MarsSurfaceRig {
  const root = new THREE.Group();

  // 1. Sculpted Mars Jezero Crater Terrain
  const terrainGeo = new THREE.PlaneGeometry(140, 140, 64, 64);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i += 1) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, marsGroundHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.marsMap,
    bumpMap: textures.marsBump,
    bumpScale: 0.35,
    roughness: 0.92,
    metalness: 0.04,
  });
  textures.marsMap.repeat.set(6, 6);
  textures.marsBump.repeat.set(6, 6);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // 2. InstancedMesh Martian Boulders with scale & tint variation
  const rockGeo = new THREE.DodecahedronGeometry(0.65, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.08,
  });
  const rockCount = 72;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  const palette = [0x9a4224, 0x7c341d, 0xb45530, 0x5c3428];

  for (let i = 0; i < rockCount; i += 1) {
    const angle = (i / rockCount) * Math.PI * 2 + (i % 7) * 0.25;
    const radius = 11 + ((i * 19.3) % 36);
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;
    const ry = marsGroundHeightAt(rx, rz);
    const s = 0.45 + ((i * 37) % 100) / 75;
    dummy.position.set(rx, ry + s * 0.28, rz);
    dummy.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    dummy.scale.set(s * 1.2, s * 0.72, s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rockColor.setHex(palette[i % palette.length]);
    rocks.setColorAt(i, rockColor);
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  root.add(rocks);

  // 3. Apollo 11-M Mars Lander (grounded flush in Jezero Basin)
  const lander = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf5b324,
    metalness: 0.86,
    roughness: 0.26,
    bumpMap: textures.goldFoilBump,
    bumpScale: 0.04,
  });
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.hullMap,
    metalness: 0.62,
    roughness: 0.32,
  });
  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.78,
    roughness: 0.38,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.5,
  });

  // Descent stage octagon
  const descentBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 1.5, 8), goldMat);
  descentBase.position.y = 2.0;
  descentBase.castShadow = true;
  lander.add(descentBase);

  // Command Module Ascent Cabin
  const ascentCabin = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.75, 2.5, 20), hullMat);
  ascentCabin.position.y = 4.0;
  ascentCabin.castShadow = true;
  lander.add(ascentCabin);

  // Cabin glowing windows
  for (const wx of [-0.46, 0.46]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), winMat);
    win.position.set(wx, 4.15, 1.18);
    win.rotation.x = -0.35;
    lander.add(win);
  }

  // 4 extended landing legs with footpads flush at y = 0
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.75, 10), strutMat);
    leg.position.set(Math.cos(a) * 2.45, 1.18, Math.sin(a) * 2.45);
    leg.rotation.z = Math.cos(a) * 0.42;
    leg.rotation.x = -Math.sin(a) * 0.42;
    lander.add(leg);

    const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.14, 14), goldMat);
    footPad.position.set(Math.cos(a) * 3.05, 0.07, Math.sin(a) * 3.05);
    lander.add(footPad);
  }

  // Lander contact shadow
  const landerShadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 24),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    }),
  );
  landerShadow.rotation.x = -Math.PI / 2;
  landerShadow.position.y = 0.03;
  lander.add(landerShadow);
  lander.position.set(0, marsGroundHeightAt(0, 0), -1.5);
  root.add(lander);

  // 4. Deployable Ares-IX 6-Wheel Pressurized Mars Rover
  const roverGroup = new THREE.Group();
  const roverBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.85, 2.85),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.42 }),
  );
  roverBody.position.y = 0.95;
  roverGroup.add(roverBody);

  const roverCab = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.55, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.35, roughness: 0.12, emissive: 0x0369a1, emissiveIntensity: 0.5 }),
  );
  roverCab.position.set(0, 1.25, 0.92);
  roverGroup.add(roverCab);

  const roverMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 8), strutMat);
  roverMast.position.set(0, 1.82, 0.4);
  roverGroup.add(roverMast);

  const lidarHead = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.24), goldMat);
  lidarHead.position.set(0, 2.38, 0.42);
  roverGroup.add(lidarHead);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.4 });
  for (const wx of [-1.02, 1.02]) {
    for (const wz of [-0.95, 0, 0.95]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.4, wz);
      roverGroup.add(wheel);
    }
  }
  roverGroup.position.set(6.2, marsGroundHeightAt(6.2, 3.8), 3.8);
  roverGroup.visible = false;
  root.add(roverGroup);

  // 5. Deployable Deep-Core Regolith Drill
  const drillGroup = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const a = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), strutMat);
    leg.position.set(Math.cos(a) * 0.6, 1.2, Math.sin(a) * 0.6);
    leg.rotation.z = Math.cos(a) * 0.32;
    leg.rotation.x = -Math.sin(a) * 0.32;
    drillGroup.add(leg);
  }
  const drillHousing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), goldMat);
  drillHousing.position.y = 2.2;
  drillGroup.add(drillHousing);
  const drillBit = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.04, 2.1, 8), strutMat);
  drillBit.position.y = 1.05;
  drillGroup.add(drillBit);
  drillGroup.position.set(-5.8, marsGroundHeightAt(-5.8, 3.4), 3.4);
  drillGroup.visible = false;
  root.add(drillGroup);

  // 6. Deployable MOXIE-IV Oxygen Plant
  const moxieGroup = new THREE.Group();
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.35 });
  for (const tx of [-0.45, 0.45]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.65, 16), tankMat);
    tank.position.set(tx, 0.85, 0);
    moxieGroup.add(tank);
  }
  const moxieBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 0.95), strutMat);
  moxieBase.position.y = 0.125;
  moxieGroup.add(moxieBase);
  const moxieStatus = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.18, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.3 }),
  );
  moxieStatus.position.set(0, 1.4, 0.35);
  moxieGroup.add(moxieStatus);
  moxieGroup.position.set(4.8, marsGroundHeightAt(4.8, -4.5), -4.5);
  moxieGroup.visible = false;
  root.add(moxieGroup);

  // 7. Deployable Quantum Relay Dish
  const relayGroup = new THREE.Group();
  const relayMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.6, 10), strutMat);
  relayMast.position.y = 1.3;
  relayGroup.add(relayMast);
  const relayDish = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.4),
    goldMat,
  );
  relayDish.position.set(0, 2.8, 0);
  relayDish.rotation.x = Math.PI * 0.72;
  relayGroup.add(relayDish);
  relayGroup.position.set(-6.4, marsGroundHeightAt(-6.4, -3.6), -3.6);
  relayGroup.visible = false;
  root.add(relayGroup);

  // 8. Deployable Thermal Habitat Dome Beacon
  const habitatGroup = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.35, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.18 }),
  );
  habitatGroup.add(dome);
  const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.35, 1.4), goldMat);
  airlock.position.set(0, 0.68, 2.15);
  habitatGroup.add(airlock);
  const habWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.45, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.1 }),
  );
  habWindow.position.set(0, 0.9, 2.86);
  habitatGroup.add(habWindow);
  habitatGroup.position.set(-9.2, marsGroundHeightAt(-9.2, 0.5), 0.5);
  habitatGroup.visible = false;
  root.add(habitatGroup);

  // 9. Deployable Seismic & Weather Array
  const seismicGroup = new THREE.Group();
  const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8), strutMat);
  sPole.position.y = 1.1;
  const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), goldMat);
  sHead.position.y = 2.25;
  seismicGroup.add(sPole, sHead);
  seismicGroup.position.set(3.4, marsGroundHeightAt(3.4, 6.2), 6.2);
  seismicGroup.visible = false;
  root.add(seismicGroup);

  // 10. Four Suited Crew Astronauts exploring near Lander
  const crewAccents = ['#F59E0B', '#06B6D4', '#38BDF8', '#10B981'];
  const crewPositions: [number, number, number][] = [
    [-2.4, 3.8, 0.4],
    [2.6, 3.4, -0.5],
    [-1.1, 5.2, 0.1],
    [1.3, 4.9, -0.25],
  ];
  const astronauts = crewPositions.map(([ax, az, rotY], idx) => {
    const astro = createSuitedAstronaut(crewAccents[idx], textures);
    astro.position.set(ax, marsGroundHeightAt(ax, az), az);
    astro.rotation.y = rotY;
    root.add(astro);
    return astro;
  });

  return {
    root,
    roverGroup,
    drillGroup,
    moxieGroup,
    relayGroup,
    habitatGroup,
    seismicGroup,
    astronauts,
    drillBit,
  };
}
