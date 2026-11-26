import * as THREE from 'three';

export interface ProceduralTexturePack {
  earthMap: THREE.CanvasTexture;
  marsMap: THREE.CanvasTexture;
  marsBump: THREE.CanvasTexture;
  hullMap: THREE.CanvasTexture;
  saturnRollMap: THREE.CanvasTexture;
  goldFoilBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  // 1. Earth albedo (deep oceans, emerald/ochre continents, swirling clouds)
  const [earthCanvas, eCtx] = makeCanvas(512, 256);
  const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 256);
  oceanGrad.addColorStop(0, '#dbeafe');
  oceanGrad.addColorStop(0.12, '#0c4a6e');
  oceanGrad.addColorStop(0.5, '#075985');
  oceanGrad.addColorStop(0.88, '#0c4a6e');
  oceanGrad.addColorStop(1, '#e2e8f0');
  eCtx.fillStyle = oceanGrad;
  eCtx.fillRect(0, 0, 512, 256);

  // Stylized continents
  eCtx.fillStyle = '#2d6a4f';
  const blobs = [
    [95, 92, 48, 30],
    [130, 145, 32, 44],
    [255, 84, 62, 34],
    [270, 138, 42, 46],
    [375, 95, 68, 38],
    [415, 168, 32, 22],
  ];
  for (const [x, y, rx, ry] of blobs) {
    eCtx.beginPath();
    eCtx.ellipse(x, y, rx, ry, 0.25, 0, Math.PI * 2);
    eCtx.fill();
  }
  eCtx.fillStyle = '#8b6f47';
  eCtx.beginPath();
  eCtx.ellipse(272, 118, 28, 14, 0.1, 0, Math.PI * 2);
  eCtx.fill();

  // Cloud wisps
  eCtx.fillStyle = 'rgba(241, 245, 249, 0.42)';
  for (let i = 0; i < 42; i += 1) {
    const cx = (i * 73) % 512;
    const cy = 28 + ((i * 47) % 200);
    eCtx.beginPath();
    eCtx.ellipse(cx, cy, 24 + (i % 18), 5 + (i % 6), (i % 5) * 0.15, 0, Math.PI * 2);
    eCtx.fill();
  }
  const earthMap = new THREE.CanvasTexture(earthCanvas);
  earthMap.colorSpace = THREE.SRGBColorSpace;
  earthMap.anisotropy = maxAnisotropy;

  // 2. Mars albedo + cratered bump
  const [marsCanvas, mCtx] = makeCanvas(512, 256);
  const [marsBumpCanvas, mbCtx] = makeCanvas(512, 256);
  const marsGrad = mCtx.createLinearGradient(0, 0, 0, 256);
  marsGrad.addColorStop(0, '#e2d9d0');
  marsGrad.addColorStop(0.1, '#9c4221');
  marsGrad.addColorStop(0.48, '#b8502c');
  marsGrad.addColorStop(0.88, '#8a371c');
  marsGrad.addColorStop(1, '#dfd5cb');
  mCtx.fillStyle = marsGrad;
  mCtx.fillRect(0, 0, 512, 256);

  mbCtx.fillStyle = '#808080';
  mbCtx.fillRect(0, 0, 512, 256);

  // Dark basaltic plains & craters
  for (let i = 0; i < 85; i += 1) {
    const x = (i * 97 + 19) % 512;
    const y = 26 + ((i * 53) % 204);
    const r = 4 + (i % 18);
    mCtx.fillStyle = i % 3 === 0 ? 'rgba(82, 30, 16, 0.38)' : 'rgba(217, 119, 66, 0.25)';
    mCtx.beginPath();
    mCtx.arc(x, y, r, 0, Math.PI * 2);
    mCtx.fill();

    mbCtx.strokeStyle = 'rgba(225, 225, 225, 0.55)';
    mbCtx.lineWidth = 2;
    mbCtx.beginPath();
    mbCtx.arc(x, y, r, 0, Math.PI * 2);
    mbCtx.stroke();
    mbCtx.fillStyle = 'rgba(45, 45, 45, 0.5)';
    mbCtx.beginPath();
    mbCtx.arc(x, y, r * 0.72, 0, Math.PI * 2);
    mbCtx.fill();
  }
  const marsMap = new THREE.CanvasTexture(marsCanvas);
  marsMap.colorSpace = THREE.SRGBColorSpace;
  marsMap.wrapS = THREE.RepeatWrapping;
  marsMap.wrapT = THREE.RepeatWrapping;
  marsMap.anisotropy = maxAnisotropy;

  const marsBump = new THREE.CanvasTexture(marsBumpCanvas);
  marsBump.wrapS = THREE.RepeatWrapping;
  marsBump.wrapT = THREE.RepeatWrapping;

  // 3. Apollo 11-M brushed titanium hull panels
  const [hullCanvas, hCtx] = makeCanvas(512, 256);
  hCtx.fillStyle = '#d8dee6';
  hCtx.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 3) {
    hCtx.fillStyle = y % 6 === 0 ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)';
    hCtx.fillRect(0, y, 512, 1);
  }
  hCtx.strokeStyle = '#64748b';
  hCtx.lineWidth = 2;
  for (let x = 0; x < 512; x += 64) {
    hCtx.beginPath();
    hCtx.moveTo(x, 0);
    hCtx.lineTo(x, 256);
    hCtx.stroke();
  }
  hCtx.beginPath();
  hCtx.moveTo(0, 128);
  hCtx.lineTo(512, 128);
  hCtx.stroke();
  // Iconic Apollo 11-M insignia stripe
  hCtx.fillStyle = '#0f172a';
  hCtx.fillRect(0, 18, 512, 14);
  hCtx.fillStyle = '#f59e0b';
  hCtx.fillRect(0, 34, 512, 5);
  hCtx.fillStyle = '#0f172a';
  hCtx.font = 'bold 20px monospace';
  hCtx.fillText('APOLLO 11-M', 175, 110);

  const hullMap = new THREE.CanvasTexture(hullCanvas);
  hullMap.colorSpace = THREE.SRGBColorSpace;
  hullMap.wrapS = THREE.RepeatWrapping;
  hullMap.wrapT = THREE.ClampToEdgeWrapping;
  hullMap.anisotropy = maxAnisotropy;

  // 4. Classic Saturn-V / Saturn-XI black-and-white roll pattern
  const [satCanvas, sCtx] = makeCanvas(256, 256);
  sCtx.fillStyle = '#f1f5f9';
  sCtx.fillRect(0, 0, 256, 256);
  sCtx.fillStyle = '#111827';
  sCtx.fillRect(0, 0, 64, 128);
  sCtx.fillRect(128, 0, 64, 128);
  sCtx.fillRect(64, 128, 64, 128);
  sCtx.fillRect(192, 128, 64, 128);
  sCtx.fillStyle = '#b91c1c';
  sCtx.fillRect(0, 118, 256, 12);
  const saturnRollMap = new THREE.CanvasTexture(satCanvas);
  saturnRollMap.colorSpace = THREE.SRGBColorSpace;
  saturnRollMap.anisotropy = maxAnisotropy;

  // 5. Crinkled Gold Kapton foil bump map
  const [foilCanvas, fCtx] = makeCanvas(256, 256);
  fCtx.fillStyle = '#808080';
  fCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i += 1) {
    const x = (i * 59) % 256;
    const y = (i * 83) % 256;
    const v = 90 + ((i * 29) % 140);
    fCtx.fillStyle = `rgb(${v},${v},${v})`;
    fCtx.beginPath();
    fCtx.moveTo(x, y);
    fCtx.lineTo(x + 18, y + 7);
    fCtx.lineTo(x + 6, y + 20);
    fCtx.closePath();
    fCtx.fill();
  }
  const goldFoilBump = new THREE.CanvasTexture(foilCanvas);
  goldFoilBump.wrapS = THREE.RepeatWrapping;
  goldFoilBump.wrapT = THREE.RepeatWrapping;

  // 6. Soft radial contact shadow disc
  const [shCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shCanvas);

  return {
    earthMap,
    marsMap,
    marsBump,
    hullMap,
    saturnRollMap,
    goldFoilBump,
    contactShadow,
    dispose: () => {
      earthMap.dispose();
      marsMap.dispose();
      marsBump.dispose();
      hullMap.dispose();
      saturnRollMap.dispose();
      goldFoilBump.dispose();
      contactShadow.dispose();
    },
  };
}
