"use client";

import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

extend({ RoundedBoxGeometry });

const GOLD = "#e9bb64";
const EMERALD = "#34d399";
const TAU = Math.PI * 2;

function Fallback() {
  return (
    <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}>
      <span style={{
        display: "grid", placeItems: "center", width: 112, height: 112,
        borderRadius: "50%", fontSize: 52, lineHeight: 1, color: GOLD,
        background: "radial-gradient(circle, #e9bb642b, #e9bb6408)",
        border: "1px solid #e9bb6455", boxShadow: "0 0 48px #e9bb6426",
      }}>🔒</span>
    </div>
  );
}

class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Fallback /> : this.props.children; }
}

function Particles() {
  const points = useRef();
  const data = useMemo(() => {
    const positions = new Float32Array(280 * 3);
    const colors = new Float32Array(280 * 3);
    const gold = new THREE.Color(GOLD);
    const teal = new THREE.Color(EMERALD);
    // Deterministic scatter, with no texture or per-frame allocations.
    for (let i = 0; i < 280; i++) {
      const angle = i * 2.399963;
      const radius = 2 + ((i * 37) % 101) / 50;
      positions.set([
        Math.cos(angle) * radius,
        (((i * 71) % 277) / 277 - 0.5) * 5,
        Math.sin(angle) * radius * 0.6 - 0.8,
      ], i * 3);
      (i % 3 ? gold : teal).toArray(colors, i * 3);
    }
    return { positions, colors };
  }, []);
  useFrame(({ clock }, delta) => {
    points.current.rotation.y += delta * 0.025;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.22) * 0.12;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.022} transparent opacity={0.35}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Shards({ signatures }) {
  const ring = useRef();
  useFrame((_, delta) => { ring.current.rotation.z += delta * 0.14; });
  return (
    <group rotation={[0.56, 0.15, 0.1]}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[2.05, 0.006, 6, 96]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.15} />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => {
          const active = i < signatures;
          return (
            <group key={i} position={[
              Math.cos(i * TAU / 5) * 2.05, Math.sin(i * TAU / 5) * 2.05, 0,
            ]}>
              <mesh>
                <sphereGeometry args={[0.09, 16, 12]} />
                <meshStandardMaterial color={active ? EMERALD : "#475569"}
                  emissive={active ? EMERALD : "#334155"}
                  emissiveIntensity={active ? 2.8 : 0.25} metalness={0.45} roughness={0.3} />
              </mesh>
              <mesh scale={1.9}>
                <sphereGeometry args={[0.09, 12, 8]} />
                <meshBasicMaterial color={active ? EMERALD : "#64748b"}
                  transparent opacity={active ? 0.13 : 0.035} depthWrite={false}
                  blending={THREE.AdditiveBlending} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

function VaultScene({ state, signatures }) {
  const floating = useRef();
  const spinning = useRef();
  const flap = useRef();
  const shackle = useRef();
  const seal = useRef();
  const document = useRef();
  const documentGlow = useRef();
  const innerLight = useRef();
  const innerGlow = useRef();
  const risingGlow = useRef();
  const progress = useRef(0);
  const triangle = useMemo(() => new Float32Array([
    -1.36, 0, 0, 0, -1.04, 0, 1.36, 0, 0,
  ]), []);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    // Exponential damping remains smooth at any refresh rate.
    const ease = 1 - Math.exp(-3 * delta);
    progress.current = THREE.MathUtils.lerp(progress.current, state === "open" ? 1 : 0, ease);
    const p = progress.current;
    floating.current.position.y = Math.sin(t * 0.8) * 0.11;
    floating.current.rotation.x = THREE.MathUtils.lerp(floating.current.rotation.x, -pointer.y * 0.13, ease);
    floating.current.rotation.y = THREE.MathUtils.lerp(floating.current.rotation.y, pointer.x * 0.2, ease);
    // A slow oscillation keeps the front readable while giving automatic rotation.
    spinning.current.rotation.y = Math.sin(t * 0.17) * 0.22;
    spinning.current.rotation.z = Math.sin(t * 0.23) * 0.025;
    flap.current.rotation.x = p * Math.PI * 0.94;
    shackle.current.position.y = 0.18 + p * 0.24;
    shackle.current.rotation.y = -p * 1.25;
    seal.current.emissiveIntensity = (0.35 + Math.sin(t * 2) * 0.12) * (1 - p) + p * 0.12;
    document.current.position.y = -0.55 + p * 1.7;
    document.current.visible = p > 0.01;
    documentGlow.current.opacity = p * 0.12;
    innerLight.current.intensity = p * 2.6;
    innerLight.current.position.y = 0.6 + p * 0.6;
    innerGlow.current.opacity = p * 0.1;
    risingGlow.current.position.y = 0.65 + p * 0.5;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[-3, 5, 5]} color="#ffe1aa" intensity={3.2} />
      <directionalLight position={[4, 2, -3]} color="#81bcff" intensity={3.5} />
      <directionalLight position={[1, -2, 4]} color="#b8dbed" intensity={0.7} />
      <Particles />
      <group ref={floating}>
        <group ref={spinning}>
          <Shards signatures={signatures} />
          {/* Rounded geometry comes with three.js; no helper library needed. */}
          <mesh>
            <roundedBoxGeometry args={[2.9, 1.8, 0.3, 3, 0.1]} />
            <meshStandardMaterial color="#0b1934" metalness={0.65} roughness={0.32}
              emissive="#102244" emissiveIntensity={0.22} />
          </mesh>
          <group ref={flap} position={[0, 0.83, 0.17]}>
            <mesh>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[triangle, 3]} />
                <bufferAttribute attach="attributes-normal" args={[
                  new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3,
                ]} />
              </bufferGeometry>
              <meshStandardMaterial color="#172b4d" metalness={0.55} roughness={0.36}
                side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.72, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.235, 0.235, 0.065, 40]} />
              <meshStandardMaterial ref={seal} color={GOLD} emissive="#d49635"
                metalness={0.75} roughness={0.3} />
            </mesh>
          </group>
          <pointLight position={[0, 0.2, 1.1]} color={GOLD} intensity={1.8} distance={4} />
          <group position={[0, -0.26, 0.49]}>
            <mesh>
              <roundedBoxGeometry args={[0.7, 0.55, 0.26, 3, 0.075]} />
              <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25}
                emissive="#80541c" emissiveIntensity={0.18} />
            </mesh>
            <mesh position={[0, 0.02, 0.14]}>
              <circleGeometry args={[0.055, 20]} />
              <meshBasicMaterial color="#342713" />
            </mesh>
            <mesh position={[0, -0.045, 0.14]}>
              <planeGeometry args={[0.045, 0.1]} />
              <meshBasicMaterial color="#342713" />
            </mesh>
            {/* Pivot at the right foot so the lifted shackle swings aside. */}
            <group ref={shackle} position={[0.24, 0.18, 0]}>
              <mesh position={[-0.24, 0.1, 0]}>
                <torusGeometry args={[0.24, 0.052, 12, 40, Math.PI]} />
                <meshStandardMaterial color="#ffe0a0" metalness={0.9} roughness={0.25} />
              </mesh>
              {[-0.48, 0].map((x) => (
                <mesh key={x} position={[x, 0.025, 0]}>
                  <cylinderGeometry args={[0.052, 0.052, 0.15, 12]} />
                  <meshStandardMaterial color="#ffe0a0" metalness={0.9} roughness={0.25} />
                </mesh>
              ))}
            </group>
          </group>
          <group ref={document} position={[0, -0.55, 0]} visible={false}>
            <mesh>
              <planeGeometry args={[1.5, 1.2]} />
              <meshStandardMaterial color="#ccfbea" emissive={EMERALD}
                emissiveIntensity={0.5} side={THREE.DoubleSide} roughness={0.7} />
            </mesh>
            {[0.28, 0.08, -0.12].map((y) => (
              <mesh key={y} position={[0, y, 0.006]}>
                <planeGeometry args={[0.95, 0.025]} />
                <meshBasicMaterial color="#299878" />
              </mesh>
            ))}
            <mesh position={[0, 0, -0.02]}>
              <planeGeometry args={[1.8, 1.5]} />
              <meshBasicMaterial ref={documentGlow} color={EMERALD} transparent opacity={0}
                depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
          <pointLight ref={innerLight} position={[0, 0.6, 0.25]}
            color={EMERALD} intensity={0} distance={4} />
          <mesh ref={risingGlow} position={[0, 0.65, -0.2]} scale={[0.85, 1.2, 0.3]}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshBasicMaterial ref={innerGlow} color={EMERALD} transparent opacity={0}
              depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export default function Vault3D({ state = "sealed", signatures = 0, className = "" }) {
  const [supported, setSupported] = useState(false);
  const [lost, setLost] = useState(false);
  const canvas = useRef(null);
  useEffect(() => {
    // Probe only after mount; current three.js requires WebGL 2.
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2");
      setSupported(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setSupported(false); }
  }, []);
  useEffect(() => {
    if (!supported || lost) return;
    const element = canvas.current;
    const onLost = (event) => { event.preventDefault(); setLost(true); };
    element?.addEventListener("webglcontextlost", onLost);
    return () => element?.removeEventListener("webglcontextlost", onLost);
  }, [supported, lost]);
  const count = Number.isFinite(signatures) ? Math.max(0, Math.min(5, Math.floor(signatures))) : 0;

  return (
    <div className={`relative w-full h-full ${className}`}
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img" aria-label={`Bid envelope ${state === "open" ? "open" : "sealed"}, ${count} of 5 committee signatures`}>
      <CanvasBoundary>
        {supported && !lost ? (
          <Canvas ref={canvas} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}
            camera={{ position: [0, 0.35, 8.7], fov: 40 }} fallback={<Fallback />}>
            <VaultScene state={state} signatures={count} />
          </Canvas>
        ) : <Fallback />}
      </CanvasBoundary>
    </div>
  );
}
