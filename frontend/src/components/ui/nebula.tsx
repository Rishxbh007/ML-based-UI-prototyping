import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Nebula — a domain-warped fBm "deep space" shader.
 *
 * Ported from a supplied 21st.dev component that rendered the effect with
 * @react-three/fiber + three. Morph's toolchain can't add npm packages, so
 * this is reimplemented on a plain WebGL canvas: NO dependencies, same public
 * props (`className`, `speed`, `color1/2/3`), and the SAME fragment shader
 * (fBm + domain warping + vignette) verbatim. It drops in as a self-contained,
 * pointer-events-none background layer.
 *
 * Notes:
 *  - A single fullscreen triangle carries `vUv` in [0,1]; the original three.js
 *    vertexShader (projection/modelView + `uv`) is replaced by a trivial
 *    clip-space vertex shader — the fragment shader only ever reads `vUv`.
 *  - Renders at ~30fps (the nebula drifts slowly, so this is imperceptible and
 *    cheap); honours prefers-reduced-motion by painting a single static frame.
 */
type NebulaProps = {
  className?: string;
  speed?: number;
  color1?: string; // highlights / fracture
  color2?: string; // nebula main
  color3?: string; // deep space
};

const VERT = `attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `precision highp float;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uSpeed;

varying vec2 vUv;

float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(in vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

#define OCTAVES 6
float fbm(in vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 st = vUv * 3.0;
  float time = uTime * uSpeed;

  vec2 q = vec2(0.0);
  q.x = fbm(st + 0.00 * time);
  q.y = fbm(st + vec2(1.0));

  vec2 r = vec2(0.0);
  r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * time);
  r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time);

  float f = fbm(st + r);

  vec3 color = mix(uColor3, uColor2, clamp((f * f) * 4.0, 0.0, 1.0));
  color = mix(color, uColor1, clamp(length(q), 0.0, 1.0));
  color = mix(color, vec3(1.0), clamp(length(r.x), 0.0, 1.0));

  float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5));
  color *= vignette;

  gl_FragColor = vec4((f * f * f + 0.6 * f * f + 0.5 * f) * color, 1.0);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function buildShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

export default function Nebula({
  className,
  speed = 2.0,
  color1 = "#f0abfc", // fuchsia highlight
  color2 = "#7c3aed", // violet nebula
  color3 = "#0d0620", // deep space violet
}: NebulaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ speed, color1, color2, color3 });
  propsRef.current = { speed, color1, color2, color3 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      powerPreference: "high-performance",
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = buildShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = buildShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One oversized triangle covering the whole clip space.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uSpeed = gl.getUniformLocation(program, "uSpeed");
    const uC1 = gl.getUniformLocation(program, "uColor1");
    const uC2 = gl.getUniformLocation(program, "uColor2");
    const uC3 = gl.getUniformLocation(program, "uColor3");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let last = -1;
    let raf = 0;

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      if (!reduce && t - last < 1 / 30) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;
      const p = propsRef.current;
      const c1 = hexToRgb(p.color1);
      const c2 = hexToRgb(p.color2);
      const c3 = hexToRgb(p.color3);
      gl.uniform1f(uTime, reduce ? 0 : t);
      gl.uniform1f(uSpeed, p.speed);
      gl.uniform3f(uC1, c1[0], c1[1], c1[2]);
      gl.uniform3f(uC2, c2[0], c2[1], c2[2]);
      gl.uniform3f(uC3, c3[0], c3[1], c3[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduce) return; // single static frame
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
      aria-hidden
    />
  );
}
