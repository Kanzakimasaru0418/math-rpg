// =====================================================
// post.js … 画面全体にかける「仕上げの効果」（ポストプロセス）
// =====================================================
//  ・ブルーム     … 明るいところが光ってにじむ
//  ・チルトシフト … 画面の上下をぼかして「ミニチュア（ジオラマ）」っぽく見せる
//                   ＝ HD-2D の見た目のいちばん大事なポイント
//  ・ビネット     … 画面のすみを少し暗くして、まん中に目がいくようにする
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';

// 色の仕上げ（あたたかい色味・ビネット・赤いフラッシュ）
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.32 },
    flash: { value: new THREE.Vector4(1, 1, 1, 0) }, // 画面を一瞬そめる色と強さ
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform vec4 flash;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // あたたかい色味＋少しあざやかに
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, 1.15) * vec3(1.04, 1.0, 0.94);
      // すみを暗く
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.35, 0.85, d) * vignette;
      // フラッシュ
      c.rgb = mix(c.rgb, flash.rgb, flash.a);
      gl_FragColor = c;
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const size = renderer.getSize(new THREE.Vector2());
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.5, 0.8);
  composer.addPass(bloom);

  const hTilt = new ShaderPass(HorizontalTiltShiftShader);
  const vTilt = new ShaderPass(VerticalTiltShiftShader);
  composer.addPass(hTilt);
  composer.addPass(vTilt);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  const fx = {
    composer,
    blur: 1.0,    // ぼかしの強さ
    focusY: 0.5,  // ピントが合う高さ（画面の下が0、上が1）
    setSize(w, h) {
      composer.setSize(w, h);
      bloom.setSize(w / 2, h / 2);
      this.apply(w, h);
    },
    apply(w = size.x, h = size.y) {
      hTilt.uniforms.h.value = (this.blur * 2.2) / w;
      vTilt.uniforms.v.value = (this.blur * 2.2) / h;
      hTilt.uniforms.r.value = vTilt.uniforms.r.value = this.focusY;
    },
    flash(color, strength) {
      grade.uniforms.flash.value.set(color.r, color.g, color.b, strength);
    },
  };
  fx.apply(size.x, size.y);
  return fx;
}
