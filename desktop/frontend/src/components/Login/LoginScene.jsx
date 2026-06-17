"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * LoginScene — full-screen animated globe background for the login page.
 *
 * A glowing fibonacci-sphere of points (emerald → indigo gradient), a wireframe
 * shell, a counter-rotating inner core, and an ambient particle field. Slowly
 * auto-rotates and responds to the cursor with parallax. The globe is offset to
 * the left so the login card on the right sits over open space.
 *
 * All WebGL runs client-side in useEffect and is fully torn down on unmount.
 */
export default function LoginScene({ className = "", isDark = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Theme palette: dark uses additive glow on near-black; light uses normal
    // blending with darker indigo/emerald so points read on a pale background.
    const theme = isDark
      ? {
          blending: THREE.AdditiveBlending,
          pointsOpacity: 1, gradA: "#34d399", gradB: "#6366f1",
          wire: 0x3713ec, wireOpacity: 0.12,
          core: 0x34d399, coreOpacity: 0.18,
          field: 0x93c5fd, fieldOpacity: 0.5,
        }
      : {
          blending: THREE.NormalBlending,
          pointsOpacity: 0.95, gradA: "#10b981", gradB: "#4f46e5",
          wire: 0x6366f1, wireOpacity: 0.16,
          core: 0x10b981, coreOpacity: 0.22,
          field: 0x6366f1, fieldOpacity: 0.35,
        };

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      return; // No WebGL — leave the CSS background only.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 420;

    // soft round sprite for glowing points
    const makeDot = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.25, "rgba(255,255,255,0.9)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    };
    const sprite = makeDot();

    const group = new THREE.Group();
    scene.add(group);

    // globe surface points (fibonacci sphere) with emerald↔indigo gradient
    const R = 150, N = 1100;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const cA = new THREE.Color(theme.gradA), cB = new THREE.Color(theme.gradB);
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = R * Math.sin(phi) * Math.cos(theta);
      const y = R * Math.cos(phi);
      const z = R * Math.sin(phi) * Math.sin(theta);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const c = cA.clone().lerp(cB, (y + R) / (2 * R));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    gGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const gMat = new THREE.PointsMaterial({
      size: 5, map: sprite, vertexColors: true, opacity: theme.pointsOpacity,
      transparent: true, depthWrite: false, blending: theme.blending,
    });
    const points = new THREE.Points(gGeo, gMat);
    group.add(points);

    // wireframe globe shell
    const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 3));
    const wireMat = new THREE.LineBasicMaterial({ color: theme.wire, transparent: true, opacity: theme.wireOpacity });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    group.add(wire);

    // counter-rotating inner core
    const coreGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 0.55, 1));
    const coreMat = new THREE.LineBasicMaterial({ color: theme.core, transparent: true, opacity: theme.coreOpacity });
    const core = new THREE.LineSegments(coreGeo, coreMat);
    group.add(core);

    // ambient particle field
    const M = 700, fpos = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) {
      fpos[i * 3] = (Math.random() - 0.5) * 1600;
      fpos[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      fpos[i * 3 + 2] = (Math.random() - 0.5) * 900;
    }
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
    const fMat = new THREE.PointsMaterial({
      size: 3, map: sprite, color: theme.field,
      transparent: true, opacity: theme.fieldOpacity, depthWrite: false, blending: theme.blending,
    });
    const field = new THREE.Points(fGeo, fMat);
    scene.add(field);

    // shift globe toward the left so the form sits over empty space on the right
    const place = () => { group.position.x = window.innerWidth < 1024 ? 0 : -90; };
    place();

    // mouse parallax
    let mx = 0, my = 0;
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      place();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.12 + mx * 0.6;
      group.rotation.x = Math.sin(t * 0.15) * 0.08 - my * 0.4;
      core.rotation.y = -t * 0.25;
      core.rotation.x = t * 0.18;
      field.rotation.y = t * 0.02;
      camera.position.x += (mx * 40 - camera.position.x) * 0.04;
      camera.position.y += (-my * 40 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      gGeo.dispose(); gMat.dispose();
      wireGeo.dispose(); wireMat.dispose();
      coreGeo.dispose(); coreMat.dispose();
      fGeo.dispose(); fMat.dispose();
      sprite.dispose();
      renderer.dispose();
    };
  }, [isDark]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
