import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CameraMode, MissionState } from '../simulation/types';
import { createProceduralTextures } from '../three/proceduralTextures';
import {
  createAntigravityCabinProps,
  createApolloSpacecraft,
  createLaunchpad,
  createMarsSurfaceWorld,
  marsGroundHeightAt,
} from '../three/spacecraftModels';

interface SpaceViewport3DProps {
  mission: MissionState;
}

// Pre-allocated scratch objects outside the render loop (zero per-frame GC)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 2, 0);

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function SpaceViewport3D({ mission }: SpaceViewport3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const missionRef = useRef<MissionState>(mission);
  missionRef.current = mission;

  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = Math.max(container.clientWidth, 320);
    const initH = Math.max(container.clientHeight, 240);
    renderer.setSize(initW, initH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);

    // Mandatory studio environment map via RoomEnvironment on all devices
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(48, initW / initH, 0.1, 450);
    camera.position.set(10, 6.5, 16);

    // Balanced warm/cool 3-point lighting rig
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.3);
    keyLight.position.set(22, 28, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -22;
    keyLight.shadow.camera.right = 22;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x8ecae6, 0x3b261c, 0.85);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-18, 10, -20);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());

    // Deep-space starfield (Points)
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const theta = ((i * 2.39996) % (Math.PI * 2));
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      const r = 135 + (i % 45);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.72, sizeAttenuation: true }),
    );
    scene.add(starField);

    // Space Flight Group (Apollo 11-M + Pad 39A + Earth + Mars Globes)
    const flightWorld = new THREE.Group();
    scene.add(flightWorld);

    const apollo = createApolloSpacecraft(textures);
    apollo.root.position.set(0, 9.7, 0);
    flightWorld.add(apollo.root);

    const launchpad = createLaunchpad(textures);
    flightWorld.add(launchpad);

    // Earth & Mars orbital spheres
    const earthSphere = new THREE.Mesh(
      new THREE.SphereGeometry(28, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.earthMap,
        roughness: 0.72,
        metalness: 0.05,
      }),
    );
    earthSphere.position.set(-28, -36, -54);
    flightWorld.add(earthSphere);

    const marsSphere = new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.marsMap,
        bumpMap: textures.marsBump,
        bumpScale: 0.25,
        roughness: 0.88,
        metalness: 0.04,
      }),
    );
    marsSphere.position.set(22, 14, -75);
    flightWorld.add(marsSphere);

    // Antigravity Cabin Diorama Group (isolated at origin when cameraMode === 'cabin')
    const cabinRig = createAntigravityCabinProps(textures);
    cabinRig.root.visible = false;
    scene.add(cabinRig.root);

    // Mars Jezero Crater Surface Diorama Group
    const marsWorld = createMarsSurfaceWorld(textures);
    marsWorld.root.visible = false;
    scene.add(marsWorld.root);

    // Subtle pointer drag orbit offset so users can inspect spacecraft/Mars freely
    let dragActive = false;
    let lastX = 0;
    let lastY = 0;
    let orbitYaw = 0;
    let orbitPitch = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragActive = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragActive) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitYaw = THREE.MathUtils.clamp(orbitYaw - dx * 0.006, -1.35, 1.35);
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * 0.004, -0.45, 0.55);
    };
    const onPointerUp = () => {
      dragActive = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 85);
      }
    }

    const skyEarth = new THREE.Color(0x0c1e38);
    const skySpace = new THREE.Color(0x050811);
    const skyMars = new THREE.Color(0x8c4a32);
    const currentBg = new THREE.Color(0x0c1e38);

    const damp = (cur: number, target: number, lambda: number, dt: number) =>
      THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

    function updateScene(dt: number) {
      const m = missionRef.current;
      const camMode: CameraMode = m.cameraMode;
      const isMarsView = camMode === 'mars' || (m.phase === 'MARS_SURFACE' && camMode !== 'cabin');
      const isCabinView = camMode === 'cabin';

      flightWorld.visible = !isMarsView && !isCabinView;
      cabinRig.root.visible = isCabinView;
      marsWorld.root.visible = isMarsView;
      starField.visible = !isMarsView;

      // Sky & Fog matching horizon continuously
      if (isMarsView) {
        currentBg.lerp(skyMars, 1 - Math.exp(-4 * dt));
        scene.background = currentBg;
        if (!(scene.fog instanceof THREE.FogExp2)) {
          scene.fog = new THREE.FogExp2(currentBg.getHex(), 0.014);
        } else {
          scene.fog.color.copy(currentBg);
          scene.fog.density = 0.014;
        }
        hemiLight.color.setHex(0xf3b38a);
        hemiLight.groundColor.setHex(0x522112);
      } else if (m.phase === 'PRE_LAUNCH' || m.phase === 'COUNTDOWN') {
        currentBg.lerp(skyEarth, 1 - Math.exp(-4 * dt));
        scene.background = currentBg;
        if (!(scene.fog instanceof THREE.FogExp2)) {
          scene.fog = new THREE.FogExp2(currentBg.getHex(), 0.008);
        } else {
          scene.fog.color.copy(currentBg);
          scene.fog.density = isCabinView ? 0.002 : 0.008;
        }
        hemiLight.color.setHex(0x93c5fd);
        hemiLight.groundColor.setHex(0x1e293b);
      } else {
        currentBg.lerp(skySpace, 1 - Math.exp(-3 * dt));
        scene.background = currentBg;
        scene.fog = null;
        hemiLight.color.setHex(0x7dd3fc);
        hemiLight.groundColor.setHex(0x172033);
      }

      // 1. Flight World kinematics
      if (flightWorld.visible) {
        const showPad = m.phase === 'PRE_LAUNCH' || m.phase === 'COUNTDOWN' || (m.phase === 'ASCENT' && m.telemetry.altitudeKm < 60);
        launchpad.visible = showPad;

        const thrusting =
          m.phase === 'COUNTDOWN' ||
          m.phase === 'ASCENT' ||
          m.phase === 'DESCENT' ||
          (m.phase === 'TRANSIT' && m.telemetry.throttlePct > 15);
        apollo.flameGroup.visible = thrusting;

        if (thrusting) {
          const pulse = 0.88 + Math.sin(elapsed * 28) * 0.14;
          const throttleScale = 0.35 + (m.telemetry.throttlePct / 100) * 0.85;
          apollo.flameGroup.scale.set(
            0.8 + throttleScale * 0.35,
            pulse * throttleScale,
            0.8 + throttleScale * 0.35,
          );
        }

        // Stage 1 separation visual
        apollo.stage1Group.visible = !m.telemetry.stage1Separated;
        apollo.flameGroup.position.y = m.telemetry.stage1Separated ? -1.1 : -8.3;

        // Antigravity ring spin & color feedback
        const ringMat = apollo.antigravRing.material as THREE.MeshStandardMaterial;
        if (m.switches.antigravCore && m.telemetry.gravityG > 0.05) {
          apollo.antigravRing.rotation.z += dt * (m.telemetry.gravityG >= 0.9 ? 2.4 : 1.3);
          ringMat.emissive.setHex(m.telemetry.gravityG >= 0.9 ? 0x06b6d4 : 0xf59e0b);
          ringMat.emissiveIntensity = 1.6;
        } else {
          ringMat.emissive.setHex(0x334155);
          ringMat.emissiveIntensity = 0.25;
        }

        apollo.shieldMesh.visible = m.switches.solarShield && (m.phase === 'TRANSIT' || m.phase === 'DESCENT');
        apollo.shieldMesh.rotation.y += dt * 0.25;

        // Solar wings fold on pad, unfold in space!
        const wingAngle = m.phase === 'PRE_LAUNCH' || m.phase === 'COUNTDOWN' ? 1.35 : 0;
        apollo.solarLeft.rotation.z = damp(apollo.solarLeft.rotation.z, wingAngle, 4, dt);
        apollo.solarRight.rotation.z = damp(apollo.solarRight.rotation.z, -wingAngle, 4, dt);

        // Rocket vertical lift & pitch during ascent / transit
        if (m.phase === 'PRE_LAUNCH') {
          apollo.root.position.set(0, 9.7, 0);
          apollo.root.rotation.set(0, 0, 0);
        } else if (m.phase === 'COUNTDOWN') {
          const jitter = (Math.random() - 0.5) * 0.08;
          apollo.root.position.set(jitter, 9.7, jitter);
          apollo.root.rotation.set(0, 0, 0);
        } else if (m.phase === 'ASCENT') {
          const climbY = 9.7 + Math.min(35, m.telemetry.altitudeKm * 0.25);
          apollo.root.position.y = damp(apollo.root.position.y, climbY, 3, dt);
          apollo.root.rotation.z = damp(apollo.root.rotation.z, -0.22, 1.5, dt);
        } else if (m.phase === 'TRANSIT' || m.phase === 'DESCENT') {
          apollo.root.position.set(0, 2.0 + Math.sin(elapsed * 0.8) * 0.22, 0);
          apollo.root.rotation.set(0.18, elapsed * 0.14, -0.45);
        }

        // Planets scale & approach during Earth -> Mars transit
        const progress = m.telemetry.transitProgressPct / 100;
        earthSphere.visible = m.phase !== 'PRE_LAUNCH' && m.phase !== 'COUNTDOWN';
        earthSphere.rotation.y += dt * 0.08;
        const earthScale = Math.max(0.25, 1.15 - progress * 0.9);
        earthSphere.scale.setScalar(earthScale);
        earthSphere.position.set(-22 - progress * 35, -18 - progress * 10, -45 - progress * 40);

        marsSphere.visible = m.phase === 'TRANSIT' || m.phase === 'DESCENT' || m.phase === 'ASCENT';
        marsSphere.rotation.y += dt * 0.12;
        const marsScale = m.phase === 'DESCENT' ? 2.8 : 0.45 + progress * 1.95;
        marsSphere.scale.setScalar(marsScale);
        marsSphere.position.set(20 - progress * 12, 10 - progress * 8, -72 + progress * 36);

        // Camera target selection
        const shipPos = apollo.root.position;
        if (camMode === 'window') {
          // Forward cockpit window view looking out over nose cone toward space/Mars
          _camTargetPos.set(shipPos.x + Math.sin(orbitYaw) * 1.4, shipPos.y + 5.2, shipPos.z + 2.4);
          _camLookTarget.set(
            marsSphere.visible ? marsSphere.position.x * 0.45 : 0,
            shipPos.y + 6.5 + orbitPitch * 8,
            shipPos.z - 28,
          );
        } else {
          const dist = m.phase === 'PRE_LAUNCH' || m.phase === 'COUNTDOWN' ? 23.5 : 14;
          _camTargetPos.set(
            shipPos.x + Math.sin(orbitYaw + 0.45) * dist,
            shipPos.y + (m.phase === 'PRE_LAUNCH' ? 1.8 : 2.4) + orbitPitch * 8,
            shipPos.z + Math.cos(orbitYaw + 0.45) * dist,
          );
          _camLookTarget.set(
            shipPos.x,
            shipPos.y + (m.phase === 'PRE_LAUNCH' ? 0.35 : 1.6),
            shipPos.z,
          );
        }
      }

      // 2. Antigravity Cabin Diorama physics!
      if (isCabinView) {
        const isZeroG = m.telemetry.gravityG < 0.1;
        const isMarsG = m.telemetry.gravityG >= 0.1 && m.telemetry.gravityG < 0.7;
        const ringMat = cabinRig.gravRingMesh.material as THREE.MeshStandardMaterial;
        ringMat.emissive.setHex(isZeroG ? 0x64748b : isMarsG ? 0xf59e0b : 0x06b6d4);
        ringMat.emissiveIntensity = isZeroG ? 0.35 : 1.5;

        for (const item of cabinRig.floaters) {
          const targetY = isZeroG
            ? item.floatY + Math.sin(elapsed * 1.4 + item.phaseOffset) * 0.28
            : isMarsG
              ? item.deckY + 0.12 + Math.abs(Math.sin(elapsed * 0.9 + item.phaseOffset)) * 0.08
              : item.deckY;

          item.mesh.position.y = damp(item.mesh.position.y, targetY, isZeroG ? 2.2 : 5.5, dt);

          if (isZeroG) {
            item.mesh.rotation.x += dt * item.spinSpeed * 0.7;
            item.mesh.rotation.y += dt * item.spinSpeed;
          } else {
            item.mesh.rotation.x = damp(item.mesh.rotation.x, 0, 5.5, dt);
            item.mesh.rotation.y = damp(item.mesh.rotation.y, 0.3, 4.0, dt);
          }
        }

        _camTargetPos.set(Math.sin(orbitYaw) * 5.2, 0.65 + orbitPitch * 2.5, Math.cos(orbitYaw) * 5.2);
        _camLookTarget.set(0, -0.3, 0);
      }

      // 3. Mars Surface Exploration World
      if (isMarsView) {
        const deployedIds = new Set(
          m.equipment.filter((e) => e.status === 'DEPLOYED').map((e) => e.id),
        );
        marsWorld.roverGroup.visible = deployedIds.has('rover-ares');
        marsWorld.drillGroup.visible = deployedIds.has('core-drill');
        marsWorld.moxieGroup.visible = deployedIds.has('moxie-o2');
        marsWorld.relayGroup.visible = deployedIds.has('quantum-relay');
        marsWorld.habitatGroup.visible = deployedIds.has('habitat-beacon');
        marsWorld.seismicGroup.visible = deployedIds.has('seismic-weather');

        // Animate Rover patrol arc across Jezero Basin
        if (marsWorld.roverGroup.visible) {
          const rAngle = elapsed * 0.16;
          const rx = Math.cos(rAngle) * 7.8;
          const rz = Math.sin(rAngle) * 6.4 + 2.0;
          marsWorld.roverGroup.position.set(rx, marsGroundHeightAt(rx, rz), rz);
          marsWorld.roverGroup.rotation.y = -rAngle;
        }
        if (marsWorld.drillGroup.visible) {
          marsWorld.drillBit.rotation.y += dt * 7.0;
        }

        // Subtle EVA crew breathing/idle sway
        marsWorld.astronauts.forEach((astro, idx) => {
          astro.rotation.y = (idx % 2 === 0 ? 0.3 : -0.35) + Math.sin(elapsed * 0.7 + idx) * 0.12;
        });

        const dist = 16.5;
        _camTargetPos.set(
          Math.sin(orbitYaw + 0.35) * dist,
          5.2 + orbitPitch * 6,
          Math.cos(orbitYaw + 0.35) * dist + 1.5,
        );
        _camLookTarget.set(0, 1.8, 0.5);
      }

      camera.position.x = damp(camera.position.x, _camTargetPos.x, 4.5, dt);
      camera.position.y = damp(camera.position.y, _camTargetPos.y, 4.5, dt);
      camera.position.z = damp(camera.position.z, _camTargetPos.z, 4.5, dt);
      _currentLook.x = damp(_currentLook.x, _camLookTarget.x, 5.5, dt);
      _currentLook.y = damp(_currentLook.y, _camLookTarget.y, 5.5, dt);
      _currentLook.z = damp(_currentLook.z, _camLookTarget.z, 5.5, dt);
      camera.lookAt(_currentLook);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - prevTime) / 1000);
      prevTime = now;
      elapsed += dt;

      updateScene(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      textures.dispose();
      envTex.dispose();
      starGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div
        data-testid="viewport-fallback"
        className="w-full h-full flex flex-col items-center justify-center bg-[#0B0F17] text-slate-300 p-6 text-center"
      >
        <p className="font-display text-lg font-semibold text-amber-400">
          Apollo 11-M Optical Telemetry Feed
        </p>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          3D WebGL viewport paused or unavailable in this browser context. All cockpit computer systems, crew comms, and Mars controls remain fully operational.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="space-viewport-3d"
      data-phase={mission.phase}
      data-camera={mission.cameraMode}
      data-gravity={mission.telemetry.gravityG.toFixed(2)}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      aria-label="Interactive 3D Apollo 11-M spacecraft and Mars viewport"
    />
  );
}
