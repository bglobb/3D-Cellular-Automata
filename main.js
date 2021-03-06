onload = () => {
  canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2', {antialias: !false});
  gl.enable(gl.DEPTH_TEST);

  elements = {
    ui: document.querySelector('.ui'),
    fps: document.querySelector('#fps'),
    spacing: document.querySelector("#spacing"),
    simSpeed: document.querySelector('#simSpeed'),
    iter: document.querySelector('#iter'),
    radios: Array.from(document.querySelectorAll('input[type=radio]')),
    base: document.querySelector('#base'),
    stick: document.querySelector('#stick'),
    info: document.querySelector('#info')
  }

  Array.from(document.forms).forEach(e => {e.onsubmit = x => false;});
  mobile = 0;

  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
      || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
        mobile = 1;
        elements.info.style.display = 'none';
  } else {
    elements.base.style.display = 'none';
  }

  world = /*Brave*/ new World;
  camera = new Camera;

  stop = 0;

  mobileShift = mobileAng = mobileRot = [0, 0];

  elements.ui.ontouchstart = (e) => {
    if (e.target === elements.ui) {
      document.body.requestFullscreen();
    }
  }

  elements.ui.ontouchmove = (e) => {
    if (e.target === elements.ui) {
      e.preventDefault();
      let temp = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
      camera.rotate(.3*(temp[0]-mobileAng[0]), .3*(mobileAng[1]-temp[1]));
      mobileAng = temp;
    }
  }

  elements.ui.ontouchstart = (e) => {
    if (e.target===elements.ui) {
      mobileAng = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    }
  }

  elements.base.ontouchmove = (e) => {
    e.preventDefault();
    let [x, y] = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    let maxDist = elements.base.offsetWidth/2;
    let dist = Math.sqrt((x-elements.stick.fixedPos[0])**2+(y-elements.stick.fixedPos[1])**2);
    let r = Math.min(1, maxDist/dist);
    elements.stick.style.left = elements.stick.fixedPos[0]+r*(x-elements.stick.fixedPos[0])+'px';
    elements.stick.style.top = elements.stick.fixedPos[1]+r*(y-elements.stick.fixedPos[1])+'px';

    mobileShift = [-2*r*(y-elements.stick.fixedPos[1])/maxDist, 2*r*(x-elements.stick.fixedPos[0])/maxDist];
  }

  elements.base.ontouchstart = (e) => {
    e.preventDefault();
    let pos = elements.stick.getBoundingClientRect();
    elements.stick.style.position = 'fixed';
    elements.stick.fixedPos = [pos.x+elements.stick.offsetWidth/2, pos.y+elements.stick.offsetHeight/2];
    let [x, y] = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    elements.stick.style.left = x+'px';
    elements.stick.style.top = y+'px';

    let maxDist = elements.base.offsetWidth/2;
    mobileShift = [-(y-elements.stick.fixedPos[1])/maxDist, (x-elements.stick.fixedPos[0])/maxDist];
  }

  elements.base.ontouchend = (e) => {
    e.preventDefault();
    elements.stick.style.position = 'relative';
    elements.stick.style.left = elements.stick.style.top = '50%';
    mobileShift = [0, 0];
  }

  textures = {
    draw: {
      vertices: tex(new Uint8Array([0, 211, 0, 0,
                                    10, 211, 0, 0,
                                    11, 211, 0, 0,
                                    11, 211, 0, 0,
                                    1, 211, 0, 0,
                                    0, 211, 0, 0,
                                    0, 121, 0, 0,
                                    1, 121, 0, 0,
                                    101, 121, 0, 0,
                                    101, 121, 0, 0,
                                    100, 121, 0, 0,
                                    0, 121, 0, 0,
                                    0, 112, 0, 0,
                                    110, 112, 0, 0,
                                    10, 112, 0, 0,
                                    0, 112, 0, 0,
                                    110, 112, 0, 0,
                                    100, 112, 0, 0]), 18, 1),
      data: null
    },
    compute: {
      data: null
    }
  };

  vertices = {
    draw: {
      all: null,
      surface: null,
      xSect: null
    },
    compute: new Float32Array([
      -1, -1,
      -1, 1,
      1, -1,
      1, 1
    ])
  };

  createPrograms();

  buffers = {
    draw: {
      all: null,
      surface: null,
      xSect: null
    },
    compute: gl.createBuffer()
  }

  fb = gl.createFramebuffer();

  setup();
};



let setup = (newBuffers=true) => {

  createPrograms();

  gl.useProgram(programs.draw);

  if (newBuffers) {
    updTex();
    updVert();
    updXSectVert();
    updBuffer();
  }

  if (newBuffers) {
    addVertices(vertices.draw.all, locations.draw.idx, true, buffers.draw.all, 1, gl.UNSIGNED_BYTE, 0, 0);
    addVertices(vertices.draw.surface, locations.draw.idx, true, buffers.draw.surface, 1, gl.UNSIGNED_INT, 0, 0);
  }
  gl.uniform3iv(locations.draw.wSize, world.size);
  gl.uniform2iv(locations.draw.tSize, world.tSize);
  gl.uniform1f(locations.draw.spacing, 1);

  gl.useProgram(programs.compute);
  if (newBuffers) {
    addVertices(vertices.compute, locations.compute.vert, false, buffers.compute, 2, gl.FLOAT, 8, 0);
  }
  gl.uniform3fv(locations.compute.wSize, world.size);
  gl.uniform2fv(locations.compute.tSize, world.tSize);

  t = performance.now();
  elements.iter.innerText = 1;
  requestAnimationFrame(loop);
  setTimeout(compute(), 1000/world.simSpeed);
}



let loop = () => {
  if (!stop) {
    draw();
    tn = performance.now();
    camera.fps = Math.round(1000/(tn-t));
    elements.fps.innerText = camera.fps;
    t = tn;
    camera.speedFactor = 60/camera.fps;
    requestAnimationFrame(loop);
  }
};



let draw = () => {
  resize();
  bindDrawAttribs();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.draw.vertices);
  gl.uniform1i(locations.draw.vertices, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.draw.data);
  gl.uniform1i(locations.draw.data, 1);

  camera.shift(mobileShift[0], mobileShift[1]);
  camera.update(locations.draw.matrix, locations.draw.camera, locations.draw.f, 1);
  gl.uniform1f(locations.draw.spacing, 1*elements.spacing.value);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (world.xSect[1]===1000000) {
    gl.drawArrays(gl.TRIANGLES, 0, vertices.draw.all.length);
  } else if (world.xSect[1]===1000001) {
    gl.drawArrays(gl.TRIANGLES, 0, vertices.draw.surface.length);
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, vertices.draw.xSect.length);
  }
}



let compute = (iter=2) => {
  return () => {
    if (!world.paused) {
      bindComputeAttribs();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.draw.data);
      gl.uniform1i(locations.compute.data, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures.compute.data, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteTexture(textures.draw.data);
      textures.draw.data = textures.compute.data;
      textures.compute.data = tex(world.arrOut, world.tSize[0], world.tSize[1]);

      elements.iter.innerText = iter;
    }
    if (!stop) {
      setTimeout(compute(iter+1), 1000/world.simSpeed);
    }
  };
}



let bindDrawAttribs = () => {
  gl.useProgram(programs.draw);
  let type = gl.UNSIGNED_INT;
  if (world.xSect[1]===1000000) {
    type = gl.UNSIGNED_BYTE;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.draw.all);
    gl.uniform1f(locations.draw.xSect, 0);
  } else if (world.xSect[1]===1000001) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.draw.surface);
    gl.uniform1f(locations.draw.xSect, 1);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.draw.xSect);
    gl.uniform1f(locations.draw.xSect, 1);
  }
  gl.vertexAttribIPointer(
    locations.draw.idx,
    1,  // size
    type,
    0,  // stride
    0  // offset
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}



let bindComputeAttribs = () => {
  gl.viewport(0, 0, world.tSize[0], world.tSize[1]);
  gl.useProgram(programs.compute);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.compute);
  gl.vertexAttribPointer(
    locations.compute.vert,
    2,
    gl.FLOAT,
    false,
    8,  // size
    0  // offset
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}



let updTex = () => {
  try {
    gl.deleteTexture(textures.draw.data);
    gl.deleteTexture(textures.compute.data)
  } catch (e) { }
  textures.draw.data = tex(world.data, world.tSize[0], world.tSize[1]);
  textures.compute.data = tex(world.arrOut, world.tSize[0], world.tSize[1]);
}



let updVert = () => {
  vertices.draw.all = new Uint8Array(18*world.size[0]*world.size[1]*world.size[2]);
  vertices.draw.surface = [];
  let temp = Array(18).fill(0);
  for (let z = 0; z < world.size[2]; z++) {
    for (let y = 0; y < world.size[1]; y++) {
      let idx0 = 18*(z*world.size[1]*world.size[0]+y*world.size[0]);
      let idx1 = idx0+18*(world.size[0]-1);
      vertices.draw.surface.push(...temp.map((n, i) => idx0+i), ...temp.map((n, i) => idx1+i));
    }
  }
  for (let z = 0; z < world.size[2]; z++) {
    for (let x = 1; x < world.size[0]-1; x++) {
      let idx0 = 18*(z*world.size[1]*world.size[0]+x);
      let idx1 = idx0+18*((world.size[1]-1)*world.size[0]);
      vertices.draw.surface.push(...temp.map((n, i) => idx0+i), ...temp.map((n, i) => idx1+i));
    }
  }
  for (let y = 1; y < world.size[1]-1; y++) {
    for (let x = 1; x < world.size[0]-1; x++) {
      let idx0 = 18*(y*world.size[0]+x);
      let idx1 = idx0+18*((world.size[2]-1)*world.size[1]*world.size[0]);
      vertices.draw.surface.push(...temp.map((n, i) => idx0+i), ...temp.map((n, i) => idx1+i));
    }
  }
  vertices.draw.surface = new Uint32Array(vertices.draw.surface);
}



let updXSectVert = () => {
  let temp = Array(18).fill(0);
  vertices.draw.xSect = [];
  if (world.xSect[1] < 1000000) {
    if (world.xSect[0]===0) {
      for (let z = 0; z < world.size[2]; z++) {
        for (let y = 0; y < world.size[1]; y++) {
          let idx = 18*(z*world.size[1]*world.size[0]+y*world.size[0]+world.xSect[1]);
          vertices.draw.xSect.push(...temp.map((n, i) => idx+i));
        }
      }
    } else if (world.xSect[0]===1) {
      for (let z = 0; z < world.size[2]; z++) {
        for (let x = 0; x < world.size[0]; x++) {
          let idx = 18*(z*world.size[1]*world.size[0]+world.xSect[1]*world.size[0]+x);
          vertices.draw.xSect.push(...temp.map((n, i) => idx+i));
        }
      }
    } else {
      for (let y = 0; y < world.size[1]; y++) {
        for (let x = 0; x < world.size[0]; x++) {
          let idx = 18*(world.xSect[1]*world.size[1]*world.size[0]+y*world.size[0]+x);
          vertices.draw.xSect.push(...temp.map((n, i) => idx+i));
        }
      }
    }
  }
  vertices.draw.xSect = new Uint32Array(vertices.draw.xSect);
  try {
    gl.deleteBuffer(buffers.draw.xSect);
  } catch (e) { }
  buffers.draw.xSect = gl.createBuffer();
  addVertices(vertices.draw.xSect, locations.draw.idx, true, buffers.draw.xSect, 1, gl.UNSIGNED_INT, 0, 0);
}



let updBuffer = () => {
  try {
    gl.deleteBuffer(buffers.draw.all);
    gl.deleteBuffer(buffers.draw.surface);
  } catch (e) { }
  buffers.draw.all = gl.createBuffer();
  buffers.draw.surface = gl.createBuffer();
}



let createPrograms = () => {
  try {
    gl.deleteProgram(programs.draw);
    gl.deleteProgram(programs.compute);
  } catch (e) { }
  shaders = {
    draw: {
      vertex: `#version 300 es
        precision highp float;

        in uint idx;

        out vec4 col;

        uniform sampler2D vertices;
        uniform sampler2D data;

        uniform ivec3 wSize;
        uniform ivec2 tSize;

        uniform vec2 coordMult;
        uniform mat3 matrix;
        uniform vec3 camera;
        uniform float f;

        uniform float spacing;
        uniform bool xSect;

        float alive(uint i) {
          uint temp = i/uint(18);
          uint d1 = uint(tSize.x);
          uint y = temp/d1;
          uint x = temp-y*d1;
          return texelFetch(data, ivec2(x, y), 0).r;
        }

        vec3 idxToCoor(uint i) {
          uint temp = i/uint(18);
          uint d1 = uint(wSize.x*wSize.y);
          uint z = temp/d1;
          temp -= z*d1;
          uint d2 = uint(wSize.x);
          uint y = temp/d2;
          uint x = temp-y*d2;
          return vec3(x, y, z);
        }

        vec2 idxToTex(uint i) {
          uint divisor = uint(18);
          return texelFetch(vertices, ivec2(int(i-divisor*(i/divisor)), 0), 0).rg*255.;
        }

        vec3 texToPos(float r) {
          int temp = int(round(r));
          int x = temp/100;
          temp -= 100*x;
          int y = temp/10;
          int z = temp-10*y;
          return vec3(x, y, z);
        }

        vec3 texToNorm(float g) {
          return texToPos(g)-1.;
        }

        vec4 proj3Dto2D(vec3 vp) {
          vec3 new = vp*matrix;
          return vec4(vec2(new.x, -new.y)*coordMult, (new.z-f)-new.z, new.z);
        }

        void main() {
          uint id;
          if (xSect) {
            id = idx;
          } else {
            id = uint(gl_VertexID);
          }
          float alv = alive(id);
          if (alv > .01) {
            vec3 offset = idxToCoor(id);
            vec2 tex = idxToTex(id);
            vec3 v = texToPos(tex.r);
            vec3 n = texToNorm(tex.g);

            vec3 shade;

            int count = int(round(dot(v, vec3(1))));
            if (count==0||count==2) {
              shade = vec3(255, 215, 0)/255.;
            } else {
              shade = vec3(192)/255.;
            }

            v = v*alv+.5*(1.-alv);

            vec3 pos = spacing*(offset-vec3(wSize/2))+v-camera;
            if (dot(n, normalize(pos))<0.) {
              pos = pos+n*alv;
              n = -1.*n;
            }

            col = vec4(shade*(0.8*dot(n, normalize(pos))+0.2), 1);
            gl_Position = proj3Dto2D(pos);
          }
        }`,
      fragment: `#version 300 es
        precision lowp float;

        in vec4 col;

        out vec4 fragCol;

        void main() {
          fragCol = col;
        }`
    },
    compute: {
      vertex: `#version 300 es
        precision highp float;

        in vec2 vert;

        out vec2 texPos;

        void main() {
          texPos = .5*(vert+1.);
          gl_Position = vec4(vert, 0, 1);
        }`,
      fragment: `#version 300 es
        precision highp float;

        in vec2 texPos;

        out vec4 fragCol;

        uniform vec3 wSize;
        uniform vec2 tSize;
        uniform sampler2D data;

        float wToT(vec3 w) {  // world coordinates to texture
          if (wSize.x==1.&&w.x!=0.||wSize.y==1.&&w.y!=0.||wSize.z==1.&&w.z!=0.) {
            return 0.;
          }
          vec3 w2 = mod(w, wSize);
          float idx = w2.z*wSize.x*wSize.y+w2.y*wSize.x+w2.x;
          return texelFetch(data, ivec2(mod(idx, tSize.x), floor(idx/tSize.x)), 0).r;
        }

        vec3 tToW(vec2 t) {  // texture coordinates to 3D world coordinates
          float x = floor(t.x*tSize.x);
          float y = floor(t.y*tSize.y);
          float idx = y*tSize.x+x;
          return vec3(mod(idx, wSize.x), mod(floor(idx/wSize.x), wSize.y), floor(idx/(wSize.x*wSize.y)));
        }

        void main() {
          vec3 thiss = tToW(texPos);
          int sum = 0;
          float state = wToT(thiss);
          for (int i = 0; i < 27; i++) {
            sum += int(i != 13 && wToT(thiss+vec3(i/9-1, mod(float(i/3), 3.0)-1., mod(float(i), 3.)-1.))>.98);
          }
          bool cond = state>.98&&(${world.surviveCond})||state<.99&&(${world.bornCond});
          if (cond) {
            fragCol = vec4(1, 0, 0, 1);
          } else {
            fragCol = vec4(state-.2, 0, 0, 1);
          }
        }`
    }
  };

  programs = {
    draw: loadProgram(shaders.draw.vertex, shaders.draw.fragment),
    compute: loadProgram(shaders.compute.vertex, shaders.compute.fragment)
  };

  locations = {
    draw: {
      aspect: gl.getUniformLocation(programs.draw, 'aspect'),
      vertices: gl.getUniformLocation(programs.draw, 'vertices'),
      data: gl.getUniformLocation(programs.draw, 'data'),
      wSize: gl.getUniformLocation(programs.draw, 'wSize'),
      tSize: gl.getUniformLocation(programs.draw, 'tSize'),
      coordMult: gl.getUniformLocation(programs.draw, 'coordMult'),
      matrix: gl.getUniformLocation(programs.draw, 'matrix'),
      camera: gl.getUniformLocation(programs.draw, 'camera'),
      f: gl.getUniformLocation(programs.draw, 'f'),
      spacing: gl.getUniformLocation(programs.draw, 'spacing'),
      xSect: gl.getUniformLocation(programs.draw, 'xSect'),

      idx: gl.getAttribLocation(programs.draw, 'idx')
    },
    compute: {
      data: gl.getUniformLocation(programs.compute, 'data'),
      wSize: gl.getUniformLocation(programs.compute, 'wSize'),
      tSize: gl.getUniformLocation(programs.compute, 'tSize'),

      vert: gl.getAttribLocation(programs.compute, 'vert')
    }
  };
}
