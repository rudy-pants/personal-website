// WebGL plumbing: turns the shader into something that can be drawn on a canvas.
import { FRAGMENT } from "./shader.js";

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const UNIFORMS = ["R", "T", "H", "K", "C", "W", "G", "E", "A", "VH", "D1", "TOP", "F"];

export function createSky(canvas) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.bindAttribLocation(program, 0, "a");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {};
  for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
  return { canvas, gl, uniforms };
}

export function resizeSky(sky, width, height) {
  if (sky.canvas.width === width && sky.canvas.height === height) return false;
  sky.canvas.width = width;
  sky.canvas.height = height;
  sky.gl.viewport(0, 0, width, height);
  return true;
}

// `band` limits drawing to part of the canvas: { y, height } in canvas pixels from the bottom.
export function drawSky(sky, values, band) {
  const { gl, canvas, uniforms } = sky;
  gl.uniform2f(uniforms.R, canvas.width, canvas.height);
  for (const name of UNIFORMS) if (name !== "R") gl.uniform1f(uniforms[name], values[name]);
  if (band) {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, band.y, canvas.width, band.height);
  } else {
    gl.disable(gl.SCISSOR_TEST);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
