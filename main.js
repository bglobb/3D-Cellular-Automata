var height = 20;
var width = 20;
var depth = 20;
var percent_alive_at_gen0 = 0.01;
var number_of_neighbors_to_stay_alive = [2, 3]; // 2 or 3 neighbors to stay alive.
var number_of_neighbors_to_come_alive = [3];  // 3 neighbors to come alive.
var iterations_per_update = 32;  // An integer which determines the simulation speed. The lower the faster. Lowest is 1.







// To see the normal Conway's Game of Life, set depth to 1.

// Height*width*depth exceeding 50*50*50 will cause a memory error. For good GPUs, this is a bottleneck since they can easily handle 50*50*50 (and a lot more) if not for a memory error. For most phones, it isn't.





























var c, gl, draw_vs, draw_fs, compute_vs, compute_fs, w, h, draw_prgm, compute_prgm, draw_vertices, compute_vertices, t_vertices, draw_pal, compute_pal, draw_tal, compute_tal, cal, nal, draw_buffer, compute_buffer1, compute_buffer2, tex_in, tex_out, arr_in, arr_out, fb, tex_size, w_size, camera, down, paused, move, touched, alive_cond, dead_cond, mobile,swiping;



onload = function() {
  c = document.getElementById("canvas");
  gl = canvas.getContext("webgl")||canvas.getContext("experimental-webgl");
  gl.enable(gl.DEPTH_TEST);
  [w, h] = [innerWidth, innerHeight];
  paused = 0;
  mobile = 0;
  swiping = 0;
  w_size = [height, width, depth];
  generate_t_size();
  generate_occupied();
  generate_draw_vertices();
  c.width = w;
  c.height = h;
  camera = new Camera;

  alive_cond = dead_cond = "";
  for (var i = 0; i<number_of_neighbors_to_stay_alive.length; i++) {
    alive_cond += "||sum=="+number_of_neighbors_to_stay_alive[i];
  }
  for (var i = 0; i<number_of_neighbors_to_come_alive.length; i++) {
    dead_cond += "||sum=="+number_of_neighbors_to_come_alive[i];
  }
  alive_cond = alive_cond.slice(2);
  dead_cond = dead_cond.slice(2);

  draw_vs = `
    precision highp float;
    attribute vec3 vert_pos;
    attribute vec2 tex_idx;
    attribute vec3 normal;
    attribute vec3 col;
    uniform sampler2D data;
    varying vec3 frag_color;
    uniform mat3 u_matrix;
    uniform vec3 u_camera;
    uniform vec2 t_size;
    uniform float f;
    uniform float w_h;
    vec4 proj3Dto2D(vec3 vp) {
      vec3 new = vp*u_matrix;
      float p = f/(new.z+f);
      if (new.z > 0.) {
        return vec4(vec3(p, -p*w_h, .001)*new, 2);
      }
      return vec4(0);
    }
    void main() {
      if (texture2D(data, tex_idx).r == 1.0) {
        frag_color = col*dot(normal, u_matrix[2]);
        gl_Position = proj3Dto2D(vert_pos-u_camera);
      }
    }
  `;
  draw_fs = `
    precision mediump float;
    varying vec3 frag_color;
    void main() {
      gl_FragColor = vec4(frag_color*.7+vec3(.3), 1);
    }
  `;
  compute_vs = `
    precision mediump float;
    attribute vec2 vert_pos;
    attribute vec2 a_texcoord;
    varying vec2 v_texcoord;
    void main() {
      v_texcoord = a_texcoord;
      gl_Position = vec4(vert_pos, 0, 1);
    }
  `;
  compute_fs = `
    precision highp float;
    varying vec2 v_texcoord;
    uniform sampler2D data;
    uniform vec3 w_size;
    uniform vec2 t_size;
    int w_to_t(vec3 w) {  // world coordinates to texture coordinates
      float idx = w.z*w_size.x*w_size.y+w.y*w_size.x+w.x;
      if (w.x<0.0||w.y<0.0||w.z<0.0||w.x>=w_size.x||w.y>=w_size.y||w.z>=w_size.z) {
        return 0;
      }
      vec4 col = texture2D(data, vec2((mod(idx, t_size.x)+0.5)/t_size.x, (floor(idx/t_size.x)+0.5)/t_size.y));
      if (length(col.rgb)>0.0) {
        return 1;
      }
      return 0;
    }
    vec3 t_to_w(vec2 t) {  // texture coordinates to 3D world coordinates
      float x = floor(t.x*t_size.x);
      float y = floor(t.y*t_size.y);
      float idx = y*t_size.x+x;
      return vec3(mod(idx, w_size.x), mod(floor(idx/w_size.x), w_size.y), floor(idx/(w_size.x*w_size.y)));
    }
    void main() {
      vec3 thiss = t_to_w(vec2(v_texcoord.x, 1.0-v_texcoord.y));
      int sum = 0;
      int state = w_to_t(thiss);
      for (float i = 0.0; i < 27.0; i++) {
        if (i != 13.0) {
          sum += w_to_t(thiss+vec3(floor(i/9.0)-1.0, mod(floor(i/3.0), 3.0)-1.0, mod(i, 3.0)-1.0));
        }
      }
      bool cond = state==1&&(${alive_cond})||state==0&&(${dead_cond});
      if (cond) {
        gl_FragColor = vec4(1, 0, 0, 1);
      }
    }
  `
  draw_prgm = program(draw_vs, draw_fs);
  compute_prgm = program(compute_vs, compute_fs);
  send_to_program();



  draw_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, draw_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, draw_vertices, gl.STATIC_DRAW);
  draw_pal = gl.getAttribLocation(draw_prgm, 'vert_pos');
  gl.enableVertexAttribArray(draw_pal);

  draw_tal = gl.getAttribLocation(draw_prgm, 'tex_idx');
  gl.enableVertexAttribArray(draw_tal);

  nal = gl.getAttribLocation(draw_prgm, 'normal');
  gl.enableVertexAttribArray(nal);

  cal = gl.getAttribLocation(draw_prgm, 'col');
  gl.enableVertexAttribArray(cal);




  compute_vertices = new Float32Array([
    -1, -1,
    -1, 1,
    1, -1,
    1, 1
  ]);
  t_vertices = new Float32Array([
    0, 1,
    0, 0,
    1, 1,
    1, 0
  ]);



  fb = gl.createFramebuffer();
  gl.useProgram(compute_prgm);
  compute_buffer1 = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, compute_buffer1);
  gl.bufferData(gl.ARRAY_BUFFER, compute_vertices, gl.STATIC_DRAW);
  compute_pal = gl.getAttribLocation(compute_prgm, 'vert_pos');
  gl.enableVertexAttribArray(compute_pal);

  compute_buffer2 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, compute_buffer2);
  compute_tal = gl.getAttribLocation(compute_prgm, 'a_texcoord');
  gl.bufferData(gl.ARRAY_BUFFER, t_vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(compute_tal);






  arr_in = [];
  for (n of occupied.flat(2)) {
    arr_in.push(n, 0, 0, 255);
  }
  arr_in = new Uint8Array(arr_in);
  arr_out = new Uint8Array(tex_size[0]*tex_size[1]*4);
  tex_in = texture(arr_in, tex_size[0], tex_size[1]);
  tex_out = texture(arr_out, tex_size[0], tex_size[1]);
  down = new Array(1000).fill(0);

  document.getElementById("W").addEventListener("touchstart", function() {
    down[87] = 1;
  });
  document.getElementById("W").addEventListener("touchend", function() {
    down[87] = 0;
  });
  document.getElementById("A").addEventListener("touchstart", function() {
    down[65] = 1;
  });
  document.getElementById("A").addEventListener("touchend", function() {
    down[65] = 0;
  });
  document.getElementById("S").addEventListener("touchstart", function() {
    down[83] = 1;
  });
  document.getElementById("S").addEventListener("touchend", function() {
    down[83] = 0;
  });
  document.getElementById("D").addEventListener("touchstart", function() {
    down[68] = 1;
  });
  document.getElementById("D").addEventListener("touchend", function() {
    down[68] = 0;
  });

  document.addEventListener("touchend", function() {
    swiping = 0;
  });

  document.getElementById("space").addEventListener("touchstart", function() {
    paused = !paused;
  });

  document.addEventListener("touchstart", function() {
    mobile = 1;
  });

  document.addEventListener("touchmove", function(e) {
  try {
  var i;
  for (i = 0; i<e.touches.length; i++) {
    if (e.touches[i].clientY/window.innerHeight < 0.8) {
      break;
    }
  }
  if (!move||!swiping) {
    move = [e.touches[i].clientX, e.touches[i].clientY];
  }
  swiping = 1;
  [r1, r2] = [e.touches[i].clientX-move[0], move[1]-e.touches[i].clientY];
  camera.rotate(0.5*r1, 0.5*r2);
  move = [e.touches[i].clientX, e.touches[i].clientY];
  touched=1;
  } catch {}
  });


  document.addEventListener("keypress", function(e) {
    if (e.which === 32) {
      paused = !paused;
    }
  });
  document.addEventListener("keydown", function(e) {
       down[e.which] = 1;
     if (e.which===37||e.which===40) {
       iterations_per_update = Math.min(iterations_per_update*2, 128);
     } else if (e.which===38||e.which===39) {
       iterations_per_update = Math.max(iterations_per_update/2, 1);
     }
  });
  document.getElementById("up").addEventListener("touchstart", function() {
    iterations_per_update = Math.max(Math.floor(iterations_per_update/2), 1);
  });

  document.getElementById("down").addEventListener("touchstart", function() {
    iterations_per_update = Math.min(Math.floor(iterations_per_update*2), 128);
  });

  document.addEventListener("keyup", function(e) {
       down[e.which] = 0;
  });
  document.addEventListener("mousemove", function(e) {
      if (!mobile) {
        camera.rotate(0.1*e.movementX, -0.1*e.movementY);
      }
  }, false);
  c.requestPointerLock = c.requestPointerLock||c.mozRequestPointerLock;
  c.exitPointerLock = c.exitPointerLock||c.mozExitPointerLock;
  document.addEventListener("click", function() {
    try {
       canvas.requestPointerLock();
    } catch {}
  });
  frame = 1;
  requestAnimationFrame(loop);
}





function loop() {

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex_in);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex_out);


  bind_draw_attribs();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, draw_vertices.length/11);

  if (!paused&&(frame)%iterations_per_update === 0) {  // Updates world
    bind_compute_attribs();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex_out, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(tex_in);
    tex_in = tex_out;
    tex_out = texture(arr_out, tex_size[0], tex_size[1]);
  }


  camera.shift(down[87]-down[83], down[68]-down[65]);
  send_to_program();

  frame++;
  requestAnimationFrame(loop);
}





function program(vs_source, fs_source) {
  var vs = gl.createShader(gl.VERTEX_SHADER);
  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  var prgm = gl.createProgram();
  gl.shaderSource(vs, vs_source);
  gl.shaderSource(fs, fs_source);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(prgm, vs);
  gl.attachShader(prgm, fs);
  gl.linkProgram(prgm);
  return prgm;
}


function bind_draw_attribs() {
  gl.viewport(0, 0, w, h);
  gl.useProgram(draw_prgm);
  gl.bindBuffer(gl.ARRAY_BUFFER, draw_buffer);
  gl.vertexAttribPointer(
    draw_pal,
    3,  // Size
    gl.FLOAT,
    false,
    11*Float32Array.BYTES_PER_ELEMENT,  // stride
    0  // Offset
  );

  gl.vertexAttribPointer(
    draw_tal,
    2,  // Size
    gl.FLOAT,
    false,
    11*Float32Array.BYTES_PER_ELEMENT,  // stride
    6*Float32Array.BYTES_PER_ELEMENT  // Offset
  );

  gl.vertexAttribPointer(
    nal,
    3,  // Size
    gl.FLOAT,
    false,
    11*Float32Array.BYTES_PER_ELEMENT,  // stride
    3*Float32Array.BYTES_PER_ELEMENT  // Offset
  );

  gl.vertexAttribPointer(
    cal,
    3,  // Size
    gl.FLOAT,
    false,
    11*Float32Array.BYTES_PER_ELEMENT,  // stride
    8*Float32Array.BYTES_PER_ELEMENT  // Offset
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function bind_compute_attribs() {
  gl.viewport(0, 0, tex_size[0], tex_size[1]);
  gl.useProgram(compute_prgm);
  gl.bindBuffer(gl.ARRAY_BUFFER, compute_buffer1);
  gl.vertexAttribPointer(
    compute_pal,
    2,
    gl.FLOAT,
    false,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, compute_buffer2);
  gl.vertexAttribPointer(
    compute_tal,
    2,
    gl.FLOAT,
    false,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


function texture(data, width, height) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  return tex;
}





function send_to_program() {
  gl.useProgram(draw_prgm);
  gl.uniform3f(gl.getUniformLocation(draw_prgm, "w_size"), w_size[2], w_size[1], w_size[0]);
  gl.uniform2fv(gl.getUniformLocation(draw_prgm, "t_size"), tex_size);
  gl.uniform3fv(gl.getUniformLocation(draw_prgm, "u_camera"), camera.pos);
  gl.uniformMatrix3fv(gl.getUniformLocation(draw_prgm, "u_matrix"), false, transpose(inverse(camera.axes)).flat(1));
  gl.uniform1f(gl.getUniformLocation(draw_prgm, "f"), camera.f);
  gl.uniform1f(gl.getUniformLocation(draw_prgm, "w_h"), w/h);
  gl.useProgram(compute_prgm);
  gl.uniform3f(gl.getUniformLocation(compute_prgm, "w_size"), w_size[2], w_size[1], w_size[0]);
  gl.uniform2fv(gl.getUniformLocation(compute_prgm, "t_size"), tex_size);
}





function generate_draw_vertices() {
  draw_vertices = [];
  var row = 0;
  var column = 0;
  var c, r;
  var red, green, blue;
  for (var z = 0; z < w_size[0]; z++) {
    z1 = z+1;
    blue = z/w_size[0];
    for (var y = 0; y < w_size[1]; y++) {
      y1 = y+1;
      green = y/w_size[1];
      for (var x = 0; x < w_size[2]; x++) {
        x1 = x+1;
        red = x/w_size[2];
        r = (row+0.5)/tex_size[1];
        c = (column+0.5)/tex_size[0];
        draw_vertices.push(x, y, z, 1, 0, 0, c, r, red, green, blue,
                           x, y, z1, 1, 0, 0, c, r, red, green, blue,
                           x, y1, z, 1, 0, 0, c, r, red, green, blue,
                           x, y1, z1, 1, 0, 0, c, r, red, green, blue,
                           x, y, z1, 1, 0, 0, c, r, red, green, blue,
                           x, y1, z, 1, 0, 0, c, r, red, green, blue,
                           x1, y, z, -1, 0, 0, c, r, red, green, blue,
                           x1, y, z1, -1, 0, 0, c, r, red, green, blue,
                           x1, y1, z, -1, 0, 0, c, r, red, green, blue,
                           x1, y1, z1, -1, 0, 0, c, r, red, green, blue,
                           x1, y, z1, -1, 0, 0, c, r, red, green, blue,
                           x1, y1, z, -1, 0, 0, c, r, red, green, blue,
                           x, y, z, 0, 1, 0, c, r, red, green, blue,
                           x, y, z1, 0, 1, 0, c, r, red, green, blue,
                           x1, y, z, 0, 1, 0, c, r, red, green, blue,
                           x1, y, z1, 0, 1, 0, c, r, red, green, blue,
                           x, y, z1, 0, 1, 0, c, r, red, green, blue,
                           x1, y, z, 0, 1, 0, c, r, red, green, blue,
                           x, y1, z, 0, -1, 0, c, r, red, green, blue,
                           x, y1, z1, 0, -1, 0, c, r, red, green, blue,
                           x1, y1, z, 0, -1, 0, c, r, red, green, blue,
                           x1, y1, z1, 0, -1, 0, c, r, red, green, blue,
                           x, y1, z1, 0, -1, 0, c, r, red, green, blue,
                           x1, y1, z, 0, -1, 0, c, r, red, green, blue,
                           x, y, z, 0, 0, 1, c, r, red, green, blue,
                           x, y1, z, 0, 0, 1, c, r, red, green, blue,
                           x1, y, z, 0, 0, 1, c, r, red, green, blue,
                           x1, y1, z, 0, 0, 1, c, r, red, green, blue,
                           x, y1, z, 0, 0, 1, c, r, red, green, blue,
                           x1, y, z, 0, 0, 1, c, r, red, green, blue,
                           x, y, z1, 0, 0, -1, c, r, red, green, blue,
                           x, y1, z1, 0, 0, -1, c, r, red, green, blue,
                           x1, y, z1, 0, 0, -1, c, r, red, green, blue,
                           x1, y1, z1, 0, 0, -1, c, r, red, green, blue,
                           x, y1, z1, 0, 0, -1, c, r, red, green, blue,
                           x1, y, z1, 0, 0, -1, c, r, red, green, blue);  // each row is vertex coordinate (vec3), negative normal vector (vec3), a texture id (vec2), and color (vec3)
        column = (column+1)%tex_size[0];
        row += !column;
      }
    }
  }
  draw_vertices = new Float32Array(draw_vertices);
}





function generate_t_size() {
  var c = w_size[0]*w_size[1]*w_size[2];
  for (var i = Math.round(Math.sqrt(c)); i > 0; i--) {
    var n = c/i;
    if (Number.isInteger(n)) {
      tex_size = [i, n];
      break;
    }
  }
}





function generate_occupied() {
  occupied = [];
  for (var z = 0; z < w_size[0]; z++) {
    occupied.push([]);
    for (var y = 0; y < w_size[1]; y++) {
      occupied[z].push([]);
      for (var x = 0; x < w_size[2]; x++) {
        occupied[z][y].push(Math.random()<percent_alive_at_gen0?255:0);
      }
    }
  }
}





function inverse(mat3) {
  var minors = [[], [], []];
  var cofactors = [[], [], []];
  var adjugate = [[], [], []];
  var count = [0, 1, 2];
  for (i of count) {
    for (j of count) {
      var vals = [];
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





function transpose(mat3) {
  return [
    [mat3[0][0], mat3[1][0], mat3[2][0]],
    [mat3[0][1], mat3[1][1], mat3[2][1]],
    [mat3[0][2], mat3[1][2], mat3[2][2]]
  ];
}





class Camera {
  constructor(pos=[-1.2*w_size[2]-10, 0.5*w_size[1], 0.5*w_size[0]], axes=[[0, -1, 0], [0, 0, -1], [1, 0, 0]], dir=[[-Math.PI/2, 0], [0, -Math.PI/2], [0, 0]], f=1.5, rot_speed=.02) {
    this.pos = pos;
    this.axes = axes;
    this.dir = dir;
    this.f = f;
    this.rot_speed = rot_speed;
  }
  shift(forw, right) {
    this.pos = this.add(this.pos, this.add(this.mult(forw, this.axes[2]), this.mult(right, this.axes[0])).map(n => 0.3*n));
  }
  add(vec1, vec2) {
    var out = [];
    for (var i = 0; i < vec1.length; i++) {
      out.push(vec1[i]+vec2[i]);
    }
    return out;
  }
  mult(scal, vec) {
    return vec.map(n => scal*n);
  }
  rotate(ds, dt) {
    this.dir[0][0] -= ds*this.rot_speed;
    this.dir[2][0] -= ds*this.rot_speed;
    this.dir[1][0] -= ds*this.rot_speed;
    var cosv0 = Math.cos(this.dir[0][1]);
    var cosv2 = Math.cos(this.dir[2][1]);
    var cosv1 = Math.cos(this.dir[1][1]);
    this.axes[0] = [cosv0*Math.cos(this.dir[0][0]), cosv0*Math.sin(this.dir[0][0]), Math.sin(this.dir[0][1])];
    this.axes[2] = [cosv2*Math.cos(this.dir[2][0]), cosv2*Math.sin(this.dir[2][0]), Math.sin(this.dir[2][1])];
    this.axes[1] = [cosv1*Math.cos(this.dir[1][0]), cosv1*Math.sin(this.dir[1][0]), Math.sin(this.dir[1][1])];
    this.dir[1][1] = Math.min(0, Math.max(-Math.PI, this.dir[1][1]+dt*this.rot_speed));
    this.dir[2][1] = Math.min(Math.PI/2, Math.max(-Math.PI/2, this.dir[2][1]+dt*this.rot_speed));
    cosv1 = Math.cos(this.dir[1][1]);
    cosv2 = Math.cos(this.dir[2][1]);
    this.axes[1] = [cosv1*Math.cos(this.dir[1][0]), cosv1*Math.sin(this.dir[1][0]), Math.sin(this.dir[1][1])];
    this.axes[2] = [cosv2*Math.cos(this.dir[2][0]), cosv2*Math.sin(this.dir[2][0]), Math.sin(this.dir[2][1])];
  }
}
