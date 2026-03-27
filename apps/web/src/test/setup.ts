// ---------------------------------------------------------------------------
// Global test setup — WebGL, Canvas, and browser API mocks for Three.js
// ---------------------------------------------------------------------------

import { vi } from 'vitest';

// --- Stub WebGL2 context ---
const glStub = {
  getExtension: () => null,
  getParameter: () => '',
  getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: () => true,
  createProgram: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getProgramInfoLog: () => '',
  getShaderInfoLog: () => '',
  deleteShader: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  enable: () => {},
  disable: () => {},
  depthFunc: () => {},
  blendFunc: () => {},
  blendEquation: () => {},
  frontFace: () => {},
  cullFace: () => {},
  activeTexture: () => {},
  bindTexture: () => {},
  createTexture: () => ({}),
  texImage2D: () => {},
  texParameteri: () => {},
  createFramebuffer: () => ({}),
  bindFramebuffer: () => {},
  framebufferTexture2D: () => {},
  createRenderbuffer: () => ({}),
  bindRenderbuffer: () => {},
  renderbufferStorage: () => {},
  framebufferRenderbuffer: () => {},
  checkFramebufferStatus: () => 36053,
  viewport: () => {},
  scissor: () => {},
  clear: () => {},
  clearColor: () => {},
  clearDepth: () => {},
  clearStencil: () => {},
  colorMask: () => {},
  depthMask: () => {},
  stencilMask: () => {},
  drawArrays: () => {},
  drawElements: () => {},
  useProgram: () => {},
  getUniformLocation: () => ({}),
  getAttribLocation: () => 0,
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  uniform1i: () => {},
  uniform1f: () => {},
  uniform2f: () => {},
  uniform3f: () => {},
  uniform4f: () => {},
  uniformMatrix4fv: () => {},
  pixelStorei: () => {},
  generateMipmap: () => {},
  deleteTexture: () => {},
  deleteBuffer: () => {},
  deleteFramebuffer: () => {},
  deleteRenderbuffer: () => {},
  deleteProgram: () => {},
  canvas: { width: 1024, height: 768 },
  drawingBufferWidth: 1024,
  drawingBufferHeight: 768,
  drawingBufferColorSpace: 'srgb',
  isContextLost: () => false,
};

// Override getContext to return our WebGL stub
const origGetContext = HTMLCanvasElement.prototype.getContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextType: string, ...args: any[]) {
  if (contextType === 'webgl2' || contextType === 'webgl') {
    return glStub as unknown as RenderingContext;
  }
  return origGetContext.apply(this, [contextType, ...args] as unknown as Parameters<typeof origGetContext>);
} as typeof origGetContext;

// --- window.matchMedia stub ---
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// --- ResizeObserver stub ---
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
