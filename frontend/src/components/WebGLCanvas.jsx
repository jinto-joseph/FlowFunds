import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-screen finance-themed Three.js canvas:
 *  - Responsive glowing particle network
 *  - Floating finance symbols: + (income), - (expense), ₹ (cash), ! (debt)
 *  - Symbol mix and motion respond to income/expense/debt state
 *  - Mouse/touch parallax and repulsion for interactivity
 */
export default function WebGLCanvas({
  balanceHealth = 1,
  totalIncome = 0,
  totalExpense = 0,
  balance = 0,
  hasUnpaidLoans = false,
  paybackReady = false,
  sceneMode = "dashboard",
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const isMobile = W < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 32;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Textures ─────────────────────────────────────────────────────────────
    function makeGlowTexture() {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    }

    function makeSymbolTexture(symbol, fill, glow) {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
      grad.addColorStop(0, glow);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.font = "900 72px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(15,23,42,0.75)";
      ctx.lineWidth = 8;
      ctx.strokeText(symbol, size / 2, size / 2 + 1);
      ctx.fillStyle = fill;
      ctx.fillText(symbol, size / 2, size / 2);

      return new THREE.CanvasTexture(canvas);
    }

    const glowTex = makeGlowTexture();
    const symbolTextures = {
      income: makeSymbolTexture("+", "#22c55e", "rgba(34,197,94,0.34)"),
      expense: makeSymbolTexture("−", "#f43f5e", "rgba(244,63,94,0.34)"),
      cash: makeSymbolTexture("₹", "#38bdf8", "rgba(56,189,248,0.34)"),
      debt: makeSymbolTexture("!", "#f59e0b", "rgba(245,158,11,0.38)"),
      payoff: makeSymbolTexture("✓", "#10b981", "rgba(16,185,129,0.44)"),
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    function healthColor(health) {
      // continuous gradient: 0=red, 0.3=amber, 0.6=cyan, 1=emerald
      const c = new THREE.Color();
      if (health < 0.3) {
        c.setHSL(0.02 + health * 0.1, 0.95, 0.55);  // red → amber
      } else if (health < 0.6) {
        const t = (health - 0.3) / 0.3;
        c.setHSL(0.12 + t * 0.36, 0.9, 0.52);        // amber → cyan
      } else {
        const t = (health - 0.6) / 0.4;
        c.setHSL(0.48 + t * 0.08, 0.85, 0.50);       // cyan → emerald
      }
      return c;
    }

    // Spread & speed scale: low balance = more chaotic
    function chaosScale(health) { return 1.0 + (1 - health) * 2.2; }

    function financeMix() {
      const income = Math.max(0, Number(stateRef.current.totalIncome ?? 0));
      const expense = Math.max(0, Number(stateRef.current.totalExpense ?? 0));
      const total = income + expense || 1;
      const incomeRatio = income / total;
      const expenseRatio = expense / total;
      const debt = Number(stateRef.current.balance ?? 0) < 0 || Boolean(stateRef.current.hasUnpaidLoans);
      const ready = Boolean(stateRef.current.paybackReady);

      // keep some fixed cash symbols, distribute rest by ratios
      const cashRatio = ready ? 0.18 : 0.24;
      const debtRatio = ready ? 0.02 : debt ? 0.14 : 0.03;
      const payoffRatio = ready ? 0.24 : 0.0;
      const variable = Math.max(0.1, 1 - cashRatio - debtRatio - payoffRatio);

      return {
        income: variable * incomeRatio,
        expense: variable * expenseRatio,
        cash: cashRatio,
        debt: debtRatio,
        payoff: payoffRatio,
        debt,
        ready,
      };
    }

    // ── Particle network ─────────────────────────────────────────────────────
    const PARTICLE_COUNT = isMobile ? 90 : 160;
    const particles = [];
    const spread = 42;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: healthColor(stateRef.current.health ?? 1),
        transparent: true,
        opacity: Math.random() * 0.45 + 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = Math.random() * 0.55 + 0.18;
      sprite.scale.setScalar(scale);
      sprite.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.7,
        (Math.random() - 0.5) * 20
      );
      sprite.userData = {
        vx: (Math.random() - 0.5) * 0.018,
        vy: (Math.random() - 0.5) * 0.018,
        vz: (Math.random() - 0.5) * 0.006,
        baseScale: scale,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.025 + 0.012,
      };
      scene.add(sprite);
      particles.push(sprite);
    }

    // ── Finance symbol sprites ───────────────────────────────────────────────
    const SYMBOL_COUNT = isMobile ? 20 : 34;
    const symbols = [];

    const weightedTypes = ["income", "income", "expense", "expense", "cash", "cash", "cash", "debt"];

    for (let i = 0; i < SYMBOL_COUNT; i++) {
      const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: symbolTextures[type],
          transparent: true,
          opacity: Math.random() * 0.28 + 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const scale = Math.random() * 0.8 + 0.75;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 44,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 12
      );
      sprite.userData = {
        type,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.002,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        baseScale: scale,
      };
      scene.add(sprite);
      symbols.push(sprite);
    }

    // ── Connection lines ─────────────────────────────────────────────────────
    const MAX_CONNECTIONS = isMobile ? 120 : 260;
    const LINE_DIST = isMobile ? 8.4 : 9.5;
    const linePositions = new Float32Array(MAX_CONNECTIONS * 2 * 3);
    const lineColors = new Float32Array(MAX_CONNECTIONS * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(lineMat);

    // ── Mouse state ──────────────────────────────────────────────────────────
    const mouse = { nx: 0, ny: 0 };   // normalised -1..1
    const mouse3D = new THREE.Vector3();

    function onMouseMove(e) {
      mouse.nx = (e.clientX / W) * 2 - 1;
      mouse.ny = -((e.clientY / H) * 2 - 1);
    }
    function onTouchMove(e) {
      if (!e.touches[0]) return;
      mouse.nx = (e.touches[0].clientX / W) * 2 - 1;
      mouse.ny = -((e.touches[0].clientY / H) * 2 - 1);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // ── Refs for live health updates ─────────────────────────────────────────
    stateRef.current.particles = particles;
    stateRef.current.symbols = symbols;
    stateRef.current.lineMat = lineMat;
    stateRef.current.health = 1;
    stateRef.current.totalIncome = totalIncome;
    stateRef.current.totalExpense = totalExpense;
    stateRef.current.balance = balance;
    stateRef.current.hasUnpaidLoans = hasUnpaidLoans;
    stateRef.current.paybackReady = paybackReady;
    stateRef.current.sceneMode = sceneMode;

    // ── Animation loop ───────────────────────────────────────────────────────
    let animId;
    let frame = 0;
    const HALF_SPREAD_X = spread / 2 + 2;
    const HALF_SPREAD_Y = spread * 0.7 / 2 + 2;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame++;

      const h = stateRef.current.health ?? 1;
      const chaos = chaosScale(h);
      const col = healthColor(h);
      const mix = financeMix();
      const mode = stateRef.current.sceneMode ?? "dashboard";

      // Mouse 3D position (projected to z=0 plane)
      mouse3D.set(mouse.nx * 24, mouse.ny * 16, 0);

      // Parallax camera drift
      const modeDrift = mode === "analytics" ? 1.25 : mode === "loans" ? 0.9 : 1;
      camera.position.x += (mouse.nx * 2.5 * modeDrift - camera.position.x) * 0.03;
      camera.position.y += (mouse.ny * 1.5 * modeDrift - camera.position.y) * 0.03;
      if (mode === "goals") {
        camera.position.y += Math.sin(frame * 0.006) * 0.004;
      }
      camera.lookAt(scene.position);

      // Update particles
      particles.forEach((p) => {
        const u = p.userData;

        // Mouse repulsion
        const dx = p.position.x - mouse3D.x;
        const dy = p.position.y - mouse3D.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 7 && dist > 0) {
          const force = (7 - dist) / 7 * 0.06;
          p.userData.vx += (dx / dist) * force;
          p.userData.vy += (dy / dist) * force;
        }

        // Dampen
        u.vx *= 0.985;
        u.vy *= 0.985;

        // Move
        const speedBoost = mode === "analytics" ? 1.15 : mode === "loans" ? 1.05 : mode === "goals" ? 0.92 : 1;
        const speed = chaos * speedBoost;
        p.position.x += u.vx * speed;
        p.position.y += u.vy * speed;
        p.position.z += u.vz;

        // Wrap boundaries
        if (p.position.x > HALF_SPREAD_X) p.position.x = -HALF_SPREAD_X;
        else if (p.position.x < -HALF_SPREAD_X) p.position.x = HALF_SPREAD_X;
        if (p.position.y > HALF_SPREAD_Y) p.position.y = -HALF_SPREAD_Y;
        else if (p.position.y < -HALF_SPREAD_Y) p.position.y = HALF_SPREAD_Y;
        if (p.position.z > 12) p.position.z = -12;
        else if (p.position.z < -12) p.position.z = 12;

        // Pulse scale
        const pulse = 1 + Math.sin(frame * u.pulseSpeed + u.pulsePhase) * 0.22;
        const s = u.baseScale * pulse * (0.7 + h * 0.5);
        p.scale.setScalar(s);

        // Colour + opacity
        p.material.color.copy(col);
        // Flicker more when chaotic (low balance)
        const flickerAmt = (1 - h) * 0.3;
        p.material.opacity = Math.min(0.7, p.material.opacity + (Math.random() - 0.5) * flickerAmt + (Math.sin(frame * u.pulseSpeed * 0.5 + u.pulsePhase) * 0.05));
        p.material.opacity = Math.max(0.05, Math.min(0.65, p.material.opacity));
      });

      // Update finance symbol behavior
      symbols.forEach((s, idx) => {
        const u = s.userData;

        // Slowly reassign type to match finance ratios
        if (frame % 120 === 0) {
          const r = ((idx * 37 + frame) % 1000) / 1000;
          let t = "cash";
          if (r < mix.income) t = "income";
          else if (r < mix.income + mix.expense) t = "expense";
          else if (r < mix.income + mix.expense + mix.cash) t = "cash";
          else if (r < mix.income + mix.expense + mix.cash + mix.payoff) t = "payoff";
          else t = "debt";
          if (u.type !== t) {
            u.type = t;
            s.material.map = symbolTextures[t];
            s.material.needsUpdate = true;
          }
        }

        // Type-specific motion
        if (u.type === "income") {
          s.position.y += 0.03 + Math.abs(u.vy) * 0.5;
          s.position.x += Math.sin(frame * 0.01 + idx) * 0.006;
          s.material.opacity = 0.24 + Math.sin(frame * 0.02 + u.pulse) * 0.08;
        } else if (u.type === "expense") {
          s.position.y -= 0.028 + Math.abs(u.vy) * 0.5;
          s.position.x += Math.cos(frame * 0.012 + idx) * 0.006;
          s.material.opacity = 0.24 + Math.sin(frame * 0.02 + u.pulse) * 0.06;
        } else if (u.type === "debt") {
          s.position.y += Math.sin(frame * 0.03 + idx) * 0.02;
          s.position.x += Math.cos(frame * 0.024 + idx) * 0.02;
          s.material.opacity = 0.2 + Math.sin(frame * 0.05 + u.pulse) * 0.12;
        } else if (u.type === "payoff") {
          s.position.y += 0.04 + Math.sin(frame * 0.03 + idx) * 0.01;
          s.position.x += Math.sin(frame * 0.02 + idx) * 0.02;
          s.material.opacity = 0.32 + Math.sin(frame * 0.04 + u.pulse) * 0.12;
        } else {
          s.position.y += Math.sin(frame * 0.016 + idx) * 0.01;
          s.position.x += Math.cos(frame * 0.016 + idx) * 0.01;
          s.material.opacity = 0.22 + Math.sin(frame * 0.02 + u.pulse) * 0.05;
        }

        // Debt mode highlights symbols
        const debtBoost = mix.debt ? 1.25 : 1;
        const payoffBoost = mix.ready ? 1.15 : 1;
        const pulse = 1 + Math.sin(frame * u.pulseSpeed + u.pulse) * 0.18;
        const scale = u.baseScale * pulse * (0.8 + h * 0.35) * debtBoost * payoffBoost;
        s.scale.set(scale, scale, 1);

        // Wrap
        if (s.position.y > 18) s.position.y = -18;
        if (s.position.y < -18) s.position.y = 18;
        if (s.position.x > 24) s.position.x = -24;
        if (s.position.x < -24) s.position.x = 24;
        if (s.position.z > 10) s.position.z = -10;
        if (s.position.z < -10) s.position.z = 10;
      });

      // Update connection lines
      let connCount = 0;
      for (let i = 0; i < particles.length && connCount < MAX_CONNECTIONS; i++) {
        for (let j = i + 1; j < particles.length && connCount < MAX_CONNECTIONS; j++) {
          const a = particles[i].position;
          const b = particles[j].position;
          const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < LINE_DIST) {
            const alpha = (1 - d / LINE_DIST) * 0.9;
            const base = connCount * 6;
            linePositions[base]     = a.x; linePositions[base + 1] = a.y; linePositions[base + 2] = a.z;
            linePositions[base + 3] = b.x; linePositions[base + 4] = b.y; linePositions[base + 5] = b.z;
            lineColors[base]     = col.r * alpha; lineColors[base + 1] = col.g * alpha; lineColors[base + 2] = col.b * alpha;
            lineColors[base + 3] = col.r * alpha; lineColors[base + 4] = col.g * alpha; lineColors[base + 5] = col.b * alpha;
            connCount++;
          }
        }
      }
      lineMat.material.opacity = mode === "analytics" ? 0.3 : mode === "goals" ? 0.16 : 0.22;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;
      lineGeo.setDrawRange(0, connCount * 2);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      renderer.dispose();
      glowTex.dispose();
      Object.values(symbolTextures).forEach((t) => t.dispose());
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Live-update refs (no scene rebuild)
  useEffect(() => {
    stateRef.current.health = balanceHealth;
  }, [balanceHealth]);

  useEffect(() => {
    stateRef.current.totalIncome = totalIncome;
    stateRef.current.totalExpense = totalExpense;
    stateRef.current.balance = balance;
    stateRef.current.hasUnpaidLoans = hasUnpaidLoans;
    stateRef.current.paybackReady = paybackReady;
    stateRef.current.sceneMode = sceneMode;
  }, [totalIncome, totalExpense, balance, hasUnpaidLoans, paybackReady, sceneMode]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
