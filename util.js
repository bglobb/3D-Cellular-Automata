let loadProgram = (vsSource, fsSource) => {
  let vs = gl.createShader(gl.VERTEX_SHADER);
  let fs = gl.createShader(gl.FRAGMENT_SHADER);
  let prgm = gl.createProgram();
  gl.shaderSource(vs, vsSource);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(prgm, vs);
  gl.attachShader(prgm, fs);
  gl.linkProgram(prgm);
  gl.useProgram(prgm);
  return prgm;
}

let addVertices = (vertices, index, int=false, buffer, size=2, type=gl.FLOAT, stride=12, offset=0, bufferType=gl.ARRAY_BUFFER, draw=gl.STATIC_DRAW) => {
  gl.bindBuffer(bufferType, buffer);
  if (int) {
    gl.vertexAttribIPointer(
      index,
      size,
      type,
      stride,  // size
      offset  // offset
    );
  } else {
    gl.vertexAttribPointer(
      index,
      size,
      type,
      false,
      stride,  // size
      offset  // offset
    );
  }
  gl.bufferData(bufferType, vertices, draw);
  gl.enableVertexAttribArray(index);
}

let imgTex = (img) => {
  let tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}

let tex = (data, width, height) => {
  let tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}

let resize = () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

let inverse = (mat3) => {
  let minors = [[], [], []];
  let cofactors = [[], [], []];
  let adjugate = [[], [], []];
  let count = [0, 1, 2];
  for (i of count) {
    for (j of count) {
      let vals = [];
      for (k of count.filter(n => n!==i)) {
        for (l of count.filter(n => n!==j)) {
          vals.push(mat3[k][l]);
        }
      }
      minors[i][j] = vals[0]*vals[3]-vals[1]*vals[2];
      cofactors[i][j] = minors[i][j]*(i+j&1?-1:1);
      adjugate[j][i] = cofactors[i][j];
    }
  }
  return adjugate.map(arr => arr.map(n => n/(mat3[0][0]*minors[0][0]-mat3[0][1]*minors[0][1]+mat3[0][2]*minors[0][2])));
}

let transpose = (mat3) => {
  return [
    [mat3[0][0], mat3[1][0], mat3[2][0]],
    [mat3[0][1], mat3[1][1], mat3[2][1]],
    [mat3[0][2], mat3[1][2], mat3[2][2]]
  ];
}

class Camera {
  constructor(pos=[(-Math.max(world.size[1], world.size[2])-world.size[0])/2, 0, 0], axes=[[0, -1, 0], [0, 0, -1], [1, 0, 0]], dir=[[-Math.PI/2, 0], [0, -Math.PI/2], [0, 0]], f=1, rotSpeed=.02, speed=.5) {
    this.pos = pos;
    this.axes = axes;
    this.dir = dir;
    this.f = f;
    this.rotSpeed = rotSpeed;
    this.speed = speed;
    this.speedFactor = 1;
    this.keysDown = new Uint8Array(1000);
    this.mouseDown = 0;
    document.addEventListener('keydown', (e) => {
      this.keysDown[e.which] = 1;
    });
    document.addEventListener('keyup', (e) => {
      this.keysDown[e.which] = 0;
    });
    document.addEventListener('mousemove', (e) => {
      camera.rotate(0.1*e.movementX*this.mouseDown, -0.1*e.movementY*this.mouseDown);
    }, false);
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.info-box')) {
        document.body.requestFullscreen();
        this.mouseDown = 1;
      }
    });
    document.addEventListener('mouseup', (e) => {
      this.mouseDown = 0;
    });
  }

  shift(forw, right) {
    let f = 1;
    if (forw!==0&&right!==0) {
      f=1/Math.sqrt(2);
    }
    this.pos = this.add(this.pos, this.add(this.mult(forw, this.axes[2]), this.mult(right, this.axes[0])).map(n => f*this.speed*this.speedFactor*n));
  }

  add(vec1, vec2) {
    let out = [];
    for (let i = 0; i < vec1.length; i++) {
      out.push(vec1[i]+vec2[i]);
    }
    return out;
  }

  mult(scal, vec) {
    return vec.map(n => scal*n);
  }

  rotate(ds, dt) {
    this.dir[0][0] -= ds*this.rotSpeed*this.speedFactor;
    this.dir[2][0] -= ds*this.rotSpeed*this.speedFactor;
    this.dir[1][0] -= ds*this.rotSpeed*this.speedFactor;
    let cosv0 = Math.cos(this.dir[0][1]);
    let cosv2 = Math.cos(this.dir[2][1]);
    let cosv1 = Math.cos(this.dir[1][1]);
    this.axes[0] = [cosv0*Math.cos(this.dir[0][0]), cosv0*Math.sin(this.dir[0][0]), Math.sin(this.dir[0][1])];
    this.axes[2] = [cosv2*Math.cos(this.dir[2][0]), cosv2*Math.sin(this.dir[2][0]), Math.sin(this.dir[2][1])];
    this.axes[1] = [cosv1*Math.cos(this.dir[1][0]), cosv1*Math.sin(this.dir[1][0]), Math.sin(this.dir[1][1])];
    this.dir[1][1] = Math.min(0, Math.max(-Math.PI, this.dir[1][1]+dt*this.rotSpeed*this.speedFactor));
    this.dir[2][1] = Math.min(Math.PI/2, Math.max(-Math.PI/2, this.dir[2][1]+dt*this.rotSpeed*this.speedFactor));
    cosv1 = Math.cos(this.dir[1][1]);
    cosv2 = Math.cos(this.dir[2][1]);
    this.axes[1] = [cosv1*Math.cos(this.dir[1][0]), cosv1*Math.sin(this.dir[1][0]), Math.sin(this.dir[1][1])];
    this.axes[2] = [cosv2*Math.cos(this.dir[2][0]), cosv2*Math.sin(this.dir[2][0]), Math.sin(this.dir[2][1])];
  }

  update(mat, cam, f, forw, force=0) {
    this.shift(this.keysDown[87]-this.keysDown[83], this.keysDown[68]-this.keysDown[65]);
    if (this.mouseDown||force) {
      gl.uniformMatrix3fv(mat, false, transpose(inverse(this.axes)).flat(1));
      gl.uniform3fv(cam, this.pos);
      gl.uniform1f(f, this.f);
      gl.uniform3fv(forw, this.axes[2]);
    }
  }
}

class World {
  constructor(size=[50, 50, 50], rule={s: [2, 3], b: [3]}, p=.01, genRule=null) {
    this.size = size;
    this.rule = rule;
    this.p = p;
    this.genRule = genRule;

    this.fps = 60;
    this.paused = 0;
    this.simSpeed = 1;
    this.xSect = [0, 1000000]; // [0, 1000000] is all, [0, 1000001] is perimeter
    this.antialias = true;

    this.reset();
  }

  updSize(val) {
    this.size = val;
    this.reset();
  }

  updP(val) {
    this.p = val;
    this.reset();
  }

  updRule(val) {
    this.rule = val;
    this.reset();
  }

  updSimSpeed(n) {
    if (n===-1 && this.simSpeed>1) {
      this.simSpeed = Math.round(this.simSpeed/2);
    } else if (n===1 && this.simSpeed<256) {
      this.simSpeed = Math.round(this.simSpeed*2);
    }
    elements.simSpeed.innerText = this.simSpeed;
  }

  reset() {
    this.tSize = (() => {
      let c = this.size[0]*this.size[1]*this.size[2];
      for (let i = Math.round(Math.sqrt(c)); i > 0; i--) {
        let n = c/i;
        if (Number.isInteger(n)) {
          return [i, n];
          break;
        }
      }
    })();

    this.aliveCond = this.deadCond = '';
    for (let i = 0; i<this.rule.s.length; i++) {
      this.aliveCond += '||sum=='+this.rule.s[i];
    }
    for (let i = 0; i<this.rule.b.length; i++) {
      this.deadCond += '||sum=='+this.rule.b[i];
    }
    this.aliveCond = this.aliveCond.slice(2);
    this.deadCond = this.deadCond.slice(2);

    this.arrOut = new Uint8Array(this.tSize[0]*this.tSize[1]*4);

    this.data = [];
    for (let i = 0; i < this.tSize[0]*this.tSize[1]; i++) {
      this.data.push(Math.random()<this.p?255:0, 0, 0, 0);
    }
    this.data = new Uint8Array(this.data);

    elements.radios.forEach((e, i) => {
      let next = e.nextElementSibling;
      if (i>1) {
        next.max = this.size[i-2]-1;
        next.value = Math.min(next.value, next.max);
        next.nextElementSibling.innerText = ('000'+next.value).slice(-4);
        next.oninput = () => {
          if (e.checked) {
            this.xSect = [i-2, Math.min(1*next.value, next.max)];
            updXSectVert();
          } else {
            e.click();
          }
          next.nextElementSibling.innerText = ('000'+next.value).slice(-4);
        };
      }
      e.oninput = () => {
        this.xSect = [Math.max(i-2, 0), [1000000, 1000001, 1*next.value][Math.min(i, 2)]];
        if (i>1) {
          updXSectVert();
        }
      };
    });
  }
}
