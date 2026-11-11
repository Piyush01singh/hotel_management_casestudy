"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PropertyViewer3DProps {
  occupancyRate?: number;
  onFloorSelect?: (floor: number) => void;
}

export default function PropertyViewer3D({ occupancyRate = 72, onFloorSelect }: PropertyViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [is3DActive, setIs3DActive] = useState<boolean>(true);

  useEffect(() => {
    if (!mountRef.current || !is3DActive) return;

    const width = mountRef.current.clientWidth || 360;
    const height = 260;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7, 6, 9);
    camera.lookAt(0, 1.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x14b8a6, 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x10b981, 0.8, 15);
    pointLight.position.set(-4, 4, 3);
    scene.add(pointLight);

    // Hotel Building Floors
    // 4 floors representing categories:
    // Floor 1: Standard (STD)
    // Floor 2: Deluxe (DLX)
    // Floor 3: Suite (SUI)
    // Floor 4: Executive (EXE)
    const floorGroup = new THREE.Group();
    const floorMeshes: THREE.Mesh[] = [];

    const floorColors = [
      0x1e293b, // Floor 1 - STD
      0x1e3a5f, // Floor 2 - DLX
      0x0f766e, // Floor 3 - SUI
      0x047857, // Floor 4 - EXE
    ];

    for (let f = 0; f < 4; f++) {
      const geometry = new THREE.BoxGeometry(4.2, 0.6, 2.8);
      const isSelected = f + 1 === selectedFloor;
      const mat = new THREE.MeshStandardMaterial({
        color: floorColors[f],
        metalness: 0.2,
        roughness: 0.4,
        emissive: isSelected ? 0x14b8a6 : 0x000000,
        emissiveIntensity: isSelected ? 0.35 : 0.0,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.y = f * 0.85 + 0.3;
      mesh.userData = { floorNumber: f + 1 };
      floorGroup.add(mesh);
      floorMeshes.push(mesh);

      // Add window glowing strips
      const windowGeo = new THREE.PlaneGeometry(3.6, 0.2);
      const windowMat = new THREE.MeshBasicMaterial({
        color: occupancyRate > 75 ? 0x34d399 : 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const windowMesh = new THREE.Mesh(windowGeo, windowMat);
      windowMesh.position.set(0, f * 0.85 + 0.3, 1.41);
      floorGroup.add(windowMesh);
    }

    // Base podium
    const podiumGeo = new THREE.BoxGeometry(5.2, 0.2, 3.8);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.1;
    floorGroup.add(podium);

    scene.add(floorGroup);

    // Animation loop (slow gentle rotation)
    let animationId: number;
    let rotationSpeed = 0.003;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      floorGroup.rotation.y += rotationSpeed;
      renderer.render(scene, camera);
    };
    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedFloor, is3DActive, occupancyRate]);

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Property Twin (3D)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-accent-teal border border-teal-800/40">
              Interactive
            </span>
          </h3>
          <p className="text-xs text-slate-400">Live category spatial layout</p>
        </div>
        <button
          onClick={() => setIs3DActive(!is3DActive)}
          className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-navy-800 border border-slate-700"
        >
          {is3DActive ? "2D Mode" : "3D Mode"}
        </button>
      </div>

      <div className="relative w-full h-[240px] flex items-center justify-center overflow-hidden rounded-lg bg-navy-950/60 border border-slate-800/60">
        {is3DActive ? (
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-xs text-slate-300">
            <div className="w-full max-w-[240px] space-y-1.5">
              <div className="p-2 rounded bg-navy-800 border border-slate-700 flex justify-between">
                <span>Floor 4 · Penthouse (EXE)</span>
                <span className="text-accent-emerald font-bold">10 Keys</span>
              </div>
              <div className="p-2 rounded bg-navy-800 border border-slate-700 flex justify-between">
                <span>Floor 3 · Suites (SUI)</span>
                <span className="text-accent-teal font-bold">20 Keys</span>
              </div>
              <div className="p-2 rounded bg-navy-800 border border-slate-700 flex justify-between">
                <span>Floor 2 · Deluxe Ocean (DLX)</span>
                <span className="text-cyan-400 font-bold">40 Keys</span>
              </div>
              <div className="p-2 rounded bg-navy-800 border border-slate-700 flex justify-between">
                <span>Floor 1 · Standard (STD)</span>
                <span className="text-slate-200 font-bold">70 Keys</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800 mt-2">
        <span>Click level to isolate</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((f) => (
            <button
              key={f}
              onClick={() => {
                setSelectedFloor(f);
                if (onFloorSelect) onFloorSelect(f);
              }}
              className={`w-6 h-6 rounded text-[11px] font-bold ${
                selectedFloor === f
                  ? "bg-accent-teal text-slate-950 shadow-sm"
                  : "bg-navy-800 text-slate-400 hover:text-white"
              }`}
            >
              L{f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
