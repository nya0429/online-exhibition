import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";

let video2ascii = function (_charset, _asciiMap, _asciiTexture, options) {

    const charset = _charset;
    const asciiMap = _asciiMap;
    const asciiTexture = _asciiTexture;

    const video = document.getElementById("video");
    const videoTexture = new THREE.VideoTexture(video);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
    });
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);

    const webGLCtx = renderer.getContext();
    let oImgData = [];

    let asciiMesh;
    let asciiGeometry = new THREE.InstancedBufferGeometry();
    let asciiInstanceUV = new THREE.InstancedBufferAttribute();
    let asciiInstanceURL = new THREE.InstancedBufferAttribute();
    let asciiMaterial;

    if (!options) options = {};
    let fResolution = !options['resolution'] ? 0.15 : options['resolution']; // Higher for more details
    let iScale = !options['scale'] ? 1 : options['scale'];
    let bColor = !options['color'] ? false : options['color']; // nice but slows down rendering!
    let bInvert = !options['invert'] ? false : options['invert']; // black is white, white is black

    let width, height;
    let iWidth = 0;
    let iHeight = 0;
    let iPixel = 0;

    createVideoScene();
    _createAsciiMaterial();

    this.createAsciiMaterial = async function (asciiTexture) {

        let material = new THREE.MeshBasicMaterial({
            map: asciiTexture,
            side: THREE.DoubleSide,
            transparent: true,
            //color: 0x000000,
        });

        let commonChunk = `
        attribute float asciiInstanceUV;
        #include <common>
        `
        let uvChunk = `
        #ifdef USE_UV
        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        //vUv.x = (asciiInstanceUV+vUv.x)/`+ charset.length + `.0;
        vUv.x = (mod(asciiInstanceUV,12.0)+vUv.x)/12.0;
        vUv.y = (floor(asciiInstanceUV/12.0)+1.0-vUv.y)/6.0;

        #endif
        `
        let color_pars_vertex = `
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        varying vec3 vColor;
        #endif
        `
        let color_vertex = `
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        vColor = vec3( 1.0 );
        #endif
        #ifdef USE_COLOR
        vColor.xyz *= color.xyz;
        #endif
        #ifdef USE_INSTANCING_COLOR
        vColor.xyz *= instanceColor.xyz;
        #endif
        `
        let color_pars_fragment = `
        #ifdef USE_COLOR
        varying vec3 vColor;
        #endif
        `
        let color_fragment = `
        #ifdef USE_COLOR
        diffuseColor.rgb *= vColor;
        #endif
        `

        material.onBeforeCompile = function (shader) {

            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', commonChunk)
                .replace('#include <uv_vertex>', uvChunk)
                .replace('#include <color_pars_vertex>', color_pars_vertex)
                .replace('#include <color_vertex>', color_vertex)

            shader.fragmentShader = shader.fragmentShader
                .replace('#include <color_pars_fragment>', color_pars_fragment)
                .replace('#include <color_fragment>', color_fragment)
        };

        return;

        geometry.setAttribute('textureID', new THREE.InstancedBufferAttribute(new Float32Array(textureID), 1));
        geometry.setAttribute('alpha', new THREE.InstancedBufferAttribute(new Float32Array(alpha), 1));

        textMesh = new THREE.InstancedMesh(geometry, material, textureID.length);

        const vs = `
        #include <common>
        varying vec2 vUv;
	    uniform mat3 uvTransform;
        attribute float asciiInstanceUV;

        #include <color_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        
        void main() {
        
            vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
            vUv.x = (asciiInstanceUV+vUv.x)/`+ charset.length + `.0;

            #include <color_vertex>                
            #include <begin_vertex>
            #include <project_vertex>
            #include <logdepthbuf_vertex>
            #include <worldpos_vertex>        
        }
        `;

        const fs = `
        uniform vec3 diffuse;
        uniform float opacity;
                
        #include <common>
        #include <dithering_pars_fragment>
        #include <color_pars_fragment>
    	varying vec2 vUv;
        uniform sampler2D map;
        uniform sampler2D ascii;
        #include <logdepthbuf_pars_fragment>
        
        void main() {
                
            vec4 diffuseColor = vec4( diffuse, opacity );
        
            #include <logdepthbuf_fragment>
            vec4 texelColor = texture2D( ascii, vUv );
            //texelColor = mapTexelToLinear( texelColor );
            //diffuseColor *= texelColor;
            //diffuseColor.a = 1.0;
            #include <color_fragment>
        
            ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
            reflectedLight.indirectDiffuse += vec3( 1.0 );
            reflectedLight.indirectDiffuse *= diffuseColor.rgb;
        
            vec3 outgoingLight = reflectedLight.indirectDiffuse;
                
            gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        
            #include <encodings_fragment>
            #include <premultiplied_alpha_fragment>
            #include <dithering_fragment>
        
        }
        `;

        let uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.basic.uniforms)
        uniforms.map.value = videoTexture;
        //videoTexture.needsUpdate = true;

        uniforms['ascii'] = { value: asciiTexture }
        asciiTexture.needsUpdate = true;

        console.log(uniforms)
        asciiMaterial = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            vertexShader: vs,
            fragmentShader: fs,
            uniforms: uniforms,
        });

        console.log("finish createAsciiMaterial")

    }

    function createVideoScene() {
        const vs = `
        precision mediump float;

        attribute vec3 position;
        attribute vec2 uv;
        
        varying vec2 vUv;

        void main()	{
    
            vUv = uv;
            gl_Position = vec4( position, 1.0 );
    
        }`;
        const fs = `
        precision mediump float;

        uniform sampler2D map;
        uniform float charsetLength;
        uniform bool inv;

        varying vec2 vUv;
    
        void main()	{
            vec4 color = texture2D(map, vUv);
            float fBrightness = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;
            fBrightness = inv ? fBrightness:1.0-fBrightness;
            gl_FragColor = vec4(color.rgb,fBrightness);
        }`;
        const geometry = new THREE.PlaneBufferGeometry(2, 2);
        let uniforms = {
            map: { value: videoTexture },
            inv: { value: bInvert },
            charsetLength: { value: charset.length - 1 },
        };
        const material = new THREE.RawShaderMaterial({

            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs,

        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        console.log("finish createVideoScene")
    }

    function _createAsciiMaterial() {

        asciiMaterial = new THREE.MeshBasicMaterial({
            map: asciiTexture,
            side: THREE.DoubleSide,
            transparent: true,
        });

        let commonChunk = `
        attribute float asciiInstanceUV;
        #include <common>
        `
        let uvChunk = `
        #ifdef USE_UV
        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        vUv.x = (mod(asciiInstanceUV,12.0)+vUv.x)/12.0;
        vUv.y = (floor(asciiInstanceUV/12.0)+1.0-vUv.y)/6.0;
        #endif
        `
        let color_fragment = `
        #ifdef USE_COLOR
        diffuseColor.rgb *= vColor * diffuseColor.a;
        diffuseColor.a += 0.9;
        #endif
        `

        asciiMaterial.onBeforeCompile = function (shader) {

            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', commonChunk)
                .replace('#include <uv_vertex>', uvChunk)

            shader.fragmentShader = shader.fragmentShader
                .replace('#include <color_fragment>', color_fragment)
        };

    }

    async function start() {

        const constraints = {
            audio: false,
            video: {
                facingMode: "user",
                width: width,
                height: height,
            },
        };

        if (window.stream) {
            window.stream.getTracks().forEach(track => {
                track.stop();
            });
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return gotStream(stream);
        } catch (error) {
            return handleError(error);
        }

    }

    function gotStream(stream) {

        window.stream = stream; // make stream available to console
        video.srcObject = stream;
        video.play();
        asciiMesh.visible = true;

        //videoTexture.needsUpdate = true;
    }

    function handleError(error) {
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    }

    function setAsciiSize() {

        iWidth = Math.round(width * fResolution);
        iHeight = Math.round(height * fResolution / 2);
        iPixel = iWidth * iHeight;

        oImgData = new Uint8Array(4 * iPixel);

        renderer.setSize(iWidth, iHeight);

        let textWidth = width / iWidth;
        let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
        plane.translate(textWidth / 2, textWidth, 0);
        THREE.BufferGeometry.prototype.copy.call(asciiGeometry, plane);

        asciiInstanceUV = new THREE.InstancedBufferAttribute(new Float32Array(iWidth * iHeight), 1);
        asciiInstanceURL = new THREE.InstancedBufferAttribute(new Uint8Array(iWidth * iHeight), 1);

        asciiGeometry.setAttribute('asciiInstanceUV', asciiInstanceUV);
        asciiGeometry.setAttribute('asciiInstanceURL', asciiInstanceURL);

        asciiMesh = new THREE.InstancedMesh(asciiGeometry, asciiMaterial, iWidth * iHeight)
        asciiMesh.visible = false;

        let mat4 = new THREE.Matrix4();
        let i;
        let halfW = width / 2;
        let halfH = height / 2;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                i = y * iWidth + x;
                mat4.makeTranslation(x * textWidth - halfW, y * textWidth * 2 - halfH, -width)
                asciiMesh.setMatrixAt(i, mat4);
            }
        }

        asciiMesh.instanceMatrix.needsUpdate = true;
        return asciiMesh;

    }

    this.setSize = function (w, h) {
        width = Math.round(w);
        height = Math.round(h);
        let m = setAsciiSize();
        start();
        return m;
    };

    this.startVideo = start();

    this.asciifyImage = (textMesh) => {

        if (textMesh == null) {
            return;
        }

        if (!asciiMesh.visible) {
            return;
        }

        renderer.render(scene, camera);
        webGLCtx.readPixels(0, 0, webGLCtx.drawingBufferWidth, webGLCtx.drawingBufferHeight, webGLCtx.RGBA, webGLCtx.UNSIGNED_BYTE, oImgData);
        let tmpMap = JSON.parse(JSON.stringify(asciiMap));

        let threeColor = new THREE.Color(0, 0, 0);
        for (let i = 0; i < textMesh.count; i++) {
            textMesh.setColorAt(i, threeColor);
            textMesh.geometry.attributes.alpha.setX(i, 1);
        }

        let i, iOffset, iCharIdx;
        let tmplist, find, rand;
        let charlength = charset.length - 1;
        let tmp = charlength / 255;

        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                i = y * iWidth + x;
                iOffset = i * 4;
                iCharIdx = Math.floor(oImgData[iOffset + 3] * tmp);
                tmplist = tmpMap[iCharIdx];
                find = true;

                while (tmplist.length == 0) {
                    iCharIdx--;
                    if (iCharIdx < 0) {
                        find = false;
                        iCharIdx = 0;
                        tmplist = asciiMap[iCharIdx];
                        break;
                    }
                    tmplist = tmpMap[iCharIdx];
                }

                rand = Math.floor(Math.random() * tmplist.length);
                threeColor.setRGB(oImgData[iOffset] / 255, oImgData[iOffset + 1] / 255, oImgData[iOffset + 2] / 255)
                textMesh.setColorAt(tmplist[rand].id, threeColor)
                textMesh.geometry.attributes.alpha.setX(tmplist[rand].id, 0.1);
                asciiInstanceUV.setX(i, iCharIdx)
                //console.log(iCharIdx);
                asciiInstanceURL.setX(i, tmplist[rand].urlIndex)
                asciiMesh.setColorAt(i, threeColor)

                if (find) {
                    tmplist.splice(rand, 1);
                }
            }
        }

        textMesh.geometry.attributes.alpha.needsUpdate = true;
        asciiMesh.geometry.attributes.asciiInstanceUV.needsUpdate = true;
        asciiMesh.geometry.attributes.asciiInstanceURL.needsUpdate = true;
        asciiMesh.instanceColor.needsUpdate = true;

    }
    console.log("finish video2ascii create")
}

export { video2ascii };
