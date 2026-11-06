"use client";

import * as React from "react";

/**
 * MeshGradient: a live, animated mesh gradient background.
 *
 * Colour points drift slowly and blend into one another, the way MeshGradient's freeform mesh does. A brighter glow
 * follows the pointer when `interactive` is on, and `glass` lays fluted glass over it. Renders with WebGL and falls back to a CSS gradient without it.
 * Children are laid over the gradient.
 */
export interface MeshGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 2 to 8 colours, as hex. Each becomes one drifting point. */
  colors?: string[];
  /** Colour behind the points, as hex. */
  background?: string;
  /** Drift speed. 0 holds still. Motion also stops when the viewer prefers reduced motion. */
  speed?: number;
  /** How far each colour reaches before blending: lower is softer, higher is crisper. 1 to 6. */
  sharpness?: number;
  /** Film grain, 0 to 0.3. */
  grain?: number;
  /** A soft glow that follows the pointer. */
  interactive?: boolean;
  /** Fluted glass over the gradient, 0 (off) to 1: vertical ribs that bend the colour into streaks and slowly slide. */
  glass?: number;
  /** How many glass ribs run across the width. */
  ribs?: number;
}

const MAX_POINTS = 8;

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform int uN;uniform vec3 uCols[${MAX_POINTS}];uniform vec3 uBg;
uniform float uPow;uniform float uGrain;uniform vec3 uMouse;uniform float uGlass;uniform float uRibs;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 mesh(vec2 uv,float aspect){
  vec3 acc=uBg*0.25;float ws=0.25;
  for(int i=0;i<${MAX_POINTS};i++){
    if(i>=uN)break;
    float f=float(i);
    // Each point starts on a loose ring and wanders on its own slow orbit.
    vec2 home=vec2(0.5)+0.32*vec2(cos(f*2.4+0.6),sin(f*2.4+0.6));
    vec2 pt=home+0.16*vec2(sin(uTime*(0.35+0.07*f)+f*1.7),cos(uTime*(0.29+0.05*f)+f*2.3));
    vec2 d=(uv-pt)*vec2(aspect,1.);
    float w=1./pow(dot(d,d)+0.002,uPow*0.5);
    acc+=uCols[i]*w;ws+=w;
  }
  return acc/ws;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float aspect=uRes.x/uRes.y;float rib=0.;
  if(uGlass>0.){
    // Fluted glass: each rib shifts what is behind it sideways by its own offset, smearing colour into vertical streaks.
    float f=uRibs/aspect,px=(uv.x-0.5)*aspect;
    rib=fract(px*f+uTime*0.05);
    px+=(rib-0.5)*uGlass*2.2/f;
    uv=vec2(px/aspect+0.5,uv.y+sin(rib*3.14159265)*uGlass*0.02);
  }
  vec3 col=mesh(uv,aspect);
  // A thin highlight on one edge of every rib and a soft shade on the other read as glass.
  if(uGlass>0.)col=col*(1.-0.06*uGlass*(1.-rib))+0.1*uGlass*pow(rib,10.);
  if(uMouse.z>0.){
    vec2 d=(uv-uMouse.xy)*vec2(aspect,1.);
    float g=exp(-dot(d,d)*9.)*uMouse.z;
    col=mix(col,min(col*1.25+0.12,vec3(1.)),g);
  }
  col+=(hash(gl_FragCoord.xy+fract(uTime))-0.5)*uGrain;
  gl_FragColor=vec4(col,1.);
}`;

const toRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function MeshGradient({
  colors = ["#FF7A59", "#B57BFF", "#2D6BFF", "#FFA2D6", "#22D3EE"],
  background = "#F59BEA",
  speed = 1,
  sharpness = 3,
  grain = 0.06,
  interactive = true,
  glass = 0,
  ribs = 24,
  className,
  style,
  children,
  ...rest
}: MeshGradientProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = React.useState(false);
  // The latest props, read by the render loop without restarting it.
  const live = React.useRef({ colors, background, speed, sharpness, grain, interactive, glass, ribs });
  React.useLayoutEffect(() => {
    live.current = { colors, background, speed, sharpness, grain, interactive, glass, ribs };
  });

  React.useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) { setFallback(true); return; }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const U = { res: u("uRes"), time: u("uTime"), n: u("uN"), cols: u("uCols"), bg: u("uBg"), pow: u("uPow"), grain: u("uGrain"), mouse: u("uMouse"), glass: u("uGlass"), ribs: u("uRibs") };

    // Rendered at up to 1.5× device pixels: a mesh gradient has no fine detail to lose.
    const resize = () => {
      const r = wrap.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // The glow eases after the pointer and fades in and out as it enters and leaves.
    const target = { x: 0.5, y: 0.5, on: 0 }, glow = { x: 0.5, y: 0.5, on: 0 };
    const move = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      target.on = 1;
    };
    const leave = () => { target.on = 0; };
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", leave);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0, last = performance.now(), t = 0;
    const frame = (now: number) => {
      const p = live.current;
      t += ((now - last) / 1000) * (still.matches ? 0 : p.speed);
      last = now;
      glow.x += (target.x - glow.x) * 0.08;
      glow.y += (target.y - glow.y) * 0.08;
      glow.on += ((p.interactive ? target.on : 0) - glow.on) * 0.06;
      const cols = p.colors.slice(0, MAX_POINTS).map(toRgb), flat = new Float32Array(MAX_POINTS * 3);
      cols.forEach((c, i) => flat.set(c, i * 3));
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, t);
      gl.uniform1i(U.n, cols.length);
      gl.uniform3fv(U.cols, flat);
      gl.uniform3fv(U.bg, toRgb(p.background));
      gl.uniform1f(U.pow, Math.min(6, Math.max(1, p.sharpness)));
      gl.uniform1f(U.grain, Math.min(0.3, Math.max(0, p.grain)));
      gl.uniform3f(U.mouse, glow.x, glow.y, glow.on);
      gl.uniform1f(U.glass, Math.min(1, Math.max(0, p.glass)));
      gl.uniform1f(U.ribs, Math.max(2, p.ribs));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerleave", leave);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  const css = `radial-gradient(at 15% 25%, ${colors[0]} 0, transparent 55%), radial-gradient(at 85% 20%, ${colors[1] ?? colors[0]} 0, transparent 55%), radial-gradient(at 70% 85%, ${colors[2] ?? colors[0]} 0, transparent 55%), radial-gradient(at 20% 80%, ${colors[3] ?? colors[1] ?? colors[0]} 0, transparent 55%), ${background}`;

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", isolation: "isolate", background: fallback ? css : background, ...style }}
      {...rest}
    >
      {!fallback && (
        <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: -1, display: "block" }} />
      )}
      {children}
    </div>
  );
}

export default MeshGradient;
