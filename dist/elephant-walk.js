/* A continuous textured mesh keeps the supplied artwork joined throughout each step. */
(() => {
  'use strict';
  const ride = document.querySelector('.journey-elephant');
  if (!ride) return;
  const iOSWebKit = (/iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && /WebKit/.test(navigator.userAgent);
  if (iOSWebKit) {
    ride.classList.remove('mesh-ready');
    ride.dataset.meshDisabled = 'ios';
    return;
  }
  const canvas = ride.querySelector('.elephant-mesh');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hips = [[1520,820],[1025,824],[1348,824],[916,824]];
  const feet = [[1580,1190],[1040,1190],[1320,1184],[785,1180]];
  const offsets = [0,.25,.5,.75];
  let gl, program, movesLocation, texture, ready = false;
  let frame = 0, last = 0, phase = 0, weight = 0, pageVisible = true;
  const permitted = () => ready && root.classList.contains('cinematic') && !ride.hidden &&
    !document.hidden && pageVisible && !reduced.matches && !root.classList.contains('low-power-render');
  const smooth = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); };
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
  }
  function fallback() {
    ready = false; stop(); ride.classList.remove('mesh-ready');
  }
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw Error('Elephant shader unavailable');
    return result;
  }
  function initialize() {
    try {
      gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:true});
      if (!gl) return;
      const vertex = shader(gl.VERTEX_SHADER, `
        attribute vec2 a_point;
        attribute vec4 a_weights;
        uniform vec3 u_moves[4];
        varying vec2 v_uv;
        vec2 moveLeg(vec2 point, vec2 hip, vec3 motion) {
          vec2 p = point - hip;
          float c = cos(motion.x), s = sin(motion.x);
          return hip + vec2(c*p.x-s*p.y, s*p.x+c*p.y+motion.y);
        }
        void main() {
          vec2 p = a_point;
          p += (moveLeg(a_point,vec2(1520.,820.),u_moves[0])-a_point)*a_weights.x;
          p += (moveLeg(a_point,vec2(1025.,824.),u_moves[1])-a_point)*a_weights.y;
          p += (moveLeg(a_point,vec2(1348.,824.),u_moves[2])-a_point)*a_weights.z;
          p += (moveLeg(a_point,vec2(916.,824.),u_moves[3])-a_point)*a_weights.w;
          gl_Position = vec4((p.x-315.)/1390.*2.-1.,1.-(p.y-170.)/1040.*2.,0.,1.);
          v_uv = a_point / vec2(2048.,1536.);
        }`);
      const fragment = shader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_art;
        void main() { gl_FragColor = texture2D(u_art,v_uv); }`);
      program = gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Elephant mesh unavailable');
      gl.useProgram(program);
      // Vertices are shared by adjacent triangles: no clipped pieces or open seams.
      const columns=104, rows=78, vertices=[], indices=[];
      for(let row=0;row<=rows;row++) for(let col=0;col<=columns;col++) {
        const x=col*2048/columns, y=row*1536/rows;
        const depth=smooth(850,1040,y);
        const t=Math.max(0,Math.min(1,(y-824)/366));
        const centers=[916+(785-916)*t,1025+(1040-1025)*t,1348+(1320-1348)*t,1520+(1580-1520)*t];
        const boundaries=[(centers[0]+centers[1])/2,(centers[1]+centers[2])/2,(centers[2]+centers[3])/2];
        const cuts=boundaries.map(b=>smooth(b-18,b+18,x));
        const trunkMask=smooth(700,710,x);
        const tailMask=1-smooth(1585,1605,x)*(1-smooth(980,1040,y));
        const amount=depth*trunkMask*tailMask;
        vertices.push(x,y,cuts[2]*amount,(cuts[0]-cuts[1])*amount,(cuts[1]-cuts[2])*amount,(1-cuts[0])*amount);
      }
      for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
        const a=row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
        indices.push(a,c,b,b,c,d);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const point=gl.getAttribLocation(program,'a_point'), weights=gl.getAttribLocation(program,'a_weights');
      gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(weights);gl.vertexAttribPointer(weights,4,gl.FLOAT,false,24,8);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      canvas.dataset.triangles=String(indices.length/3);
      movesLocation=gl.getUniformLocation(program,'u_moves[0]');
      texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.clearColor(0,0,0,0);
      const image=new Image();
      image.onload=()=>{
        if(gl.isContextLost()) return;
        gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        ready=true;resize();paint();ride.classList.add('mesh-ready');sync();
      };
      image.onerror=fallback;
      image.src='assets/story/elephant-ride/hathi-original.webp';
    } catch { fallback(); }
  }
  function resize() {
    if (!ready) return;
    const dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(canvas.clientWidth*dpr)),height=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);paint();
  }
  function paint() {
    if (!ready) return;
    const moves=[];
    for(let leg=0;leg<4;leg++) {
      const t=(phase+offsets[leg])%1,stance=.64;
      const swing=Math.max(0,(t-stance)/(1-stance)),eased=swing*swing*(3-2*swing);
      const angle=(t<stance?7-14*t/stance:-7+14*eased)*weight*Math.PI/180;
      const lift=t<stance?0:Math.sin(swing*Math.PI)*25*weight;
      const [x,y]=hips[leg],[footX,footY]=feet[leg];
      const ground=(footY-y)*(1-Math.cos(angle))-(footX-x)*Math.sin(angle);
      moves.push(angle,ground-lift,0);
    }
    gl.uniform3fv(movesLocation,moves);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES,104*78*6,gl.UNSIGNED_SHORT,0);
    // The upper artwork and saddle remain stable; only a tiny seat response is added.
    ride.style.setProperty('--saddle-rise',`${(Math.sin(phase*Math.PI*8)*.3*weight).toFixed(3)}px`);
    canvas.dataset.stride=phase.toFixed(4);
    canvas.dataset.walkWeight=weight.toFixed(4);
  }
  function tick(now) {
    frame=0;if(!permitted()){stop();return;}
    const dt=last?Math.min((now-last)/1000,.2):0;last=now;
    const target=ride.dataset.walking==='true'?1:0;
    weight+=(target-weight)*(1-Math.exp(-dt*12));
    if(!target&&weight<.001)weight=0;
    phase=(phase+dt*weight/2.3)%1;paint();
    if(target||weight)frame=requestAnimationFrame(tick);else last=0;
  }
  function sync() {
    if(!permitted()){
      stop();if(!root.classList.contains('cinematic')||reduced.matches){weight=0;paint();}return;
    }
    resize();
    if(!frame&&(ride.dataset.walking==='true'||weight))frame=requestAnimationFrame(tick);
  }
  const observer=new MutationObserver(sync);
  observer.observe(root,{attributes:true,attributeFilter:['class']});
  observer.observe(ride,{attributes:true,attributeFilter:['hidden','data-walking']});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas);
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{pageVisible=false;stop();});
  addEventListener('pageshow',()=>{pageVisible=true;sync();});
  reduced.addEventListener('change',sync);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
  canvas.addEventListener('webglcontextrestored',initialize);
  initialize();
})();
