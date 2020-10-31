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

let addVertices = (vertices, program, name, bufferType=gl.ARRAY_BUFFER, vertexAttribPointerParams={size: 2, type: gl.FLOAT, stride: 2*Float32Array.BYTES_PER_ELEMENT, offset: 0}, draw=gl.STATIC_DRAW) => {
  let vbo = gl.createBuffer();
  let pal = gl.getAttribLocation(program, name);
  gl.bindBuffer(bufferType, vbo);
  gl.vertexAttribPointer(
    pal,
    vertexAttribPointerParams.size,
    vertexAttribPointerParams.type,
    false,
    vertexAttribPointerParams.stride,  // Size of individual vertex
    vertexAttribPointerParams.offset  // Offset
  );
  gl.bufferData(bufferType, vertices, draw);
  gl.enableVertexAttribArray(pal);
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
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}

let resize = (uniformLocationW, uniformLocationH, uniformLocationAspect) => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(uniformLocationW, canvas.width);
  gl.uniform1f(uniformLocationH, canvas.height);
  gl.uniform1f(uniformLocationAspect, canvas.width/canvas.height);
}
