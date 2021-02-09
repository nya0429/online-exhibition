import * as THREE from "https://unpkg.com/three@0.123.0/build/three.module.js";

let video2ascii = function (_charset, _asciiMap, options) {

    const charset = _charset;
    const asciiMap = _asciiMap;

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
    let asciiInstanceTextureID = new THREE.InstancedBufferAttribute();
    this.URLList = [];

    let asciiMaterial;

    if (!options) options = {};
    let fResolution = !options['resolution'] ? 0.15 : options['resolution']; // Higher for more details
    let bInvert = !options['invert'] ? false : options['invert']; // black is white, white is black

    let width;
    let height;
    let iWidth = 0;
    let iHeight = 0;

    createVideoScene();
    createAsciiMaterial();

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

    this.setAsciiTexture = (texture) => {

        asciiMaterial.map = texture;

    }

    function createAsciiMaterial() {

        asciiMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
        });

        let commonChunk = `
        attribute float asciiInstanceTextureID;
        #include <common>
        `
        let uvChunk = `
        #ifdef USE_UV
        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        vUv.x = (mod(asciiInstanceTextureID,12.0)+vUv.x)/12.0;
        vUv.y = (floor(asciiInstanceTextureID/12.0)+1.0-vUv.y)/6.0;
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

    this.startVideo = async function () {

        console.log("videostart", width, height);
        const supports = navigator.mediaDevices.getSupportedConstraints();
        if (!supports.width || !supports.height || !supports.facingMode) {
            // Treat like an error.
            console.log("webRTC not supported.")
        }

        const constraints = {
            audio: false,
            video: {
                facingMode: "user",
            },
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return gotStream(stream);
        } catch (error) {
            return handleError(error);
        }

    }

    function gotStream(stream) {

        const track = stream.getVideoTracks()[0];
        const constraints = track.getConstraints();

        console.log(track.getConstraints());
        console.log(track.getSettings());
        console.log(track.getCapabilities());

        constraints.aspectRatio = width/height;
        track.applyConstraints(constraints);

        window.stream = stream; // make stream available to console
        video.srcObject = stream;
        video.play();

    }

    function handleError(error) {
        gtag('event', 'webCamError', {
            'event_category': error.name,
            'event_label': error.message,
        });
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    }

    this.resizeVideo = function (){

        if (window.stream) {
            const track = window.stream.getTracks()[0];
            const constraints = track.getConstraints();
            constraints.aspectRatio = width/height;
            track.applyConstraints(constraints);
        }
        
    }

    this.setSize = function (w, h) {
        return new Promise(resolve => {
            console.log("set size", w, h);
            width = Math.round(w);
            height = Math.round(h);
            iWidth = Math.round(width * fResolution);
            iHeight = Math.round(height * fResolution / 2);
            oImgData = new Uint8Array(4 * iWidth * iHeight);
            renderer.setSize(iWidth, iHeight);
            resolve();
        })
    };

    this.setAsciiMesh = function () {

        const textWidth = width / iWidth;
        const plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
        plane.translate(textWidth / 2, textWidth, 0);
        THREE.BufferGeometry.prototype.copy.call(asciiGeometry, plane);

        asciiInstanceTextureID = new THREE.InstancedBufferAttribute(new Float32Array(iWidth * iHeight), 1);
        this.URLList = new Uint8Array(iWidth * iHeight);

        asciiGeometry.setAttribute('asciiInstanceTextureID', asciiInstanceTextureID);

        asciiMesh = new THREE.InstancedMesh(asciiGeometry, asciiMaterial, iWidth * iHeight)

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

    this.asciifyImage = (textMesh) => {

        if (textMesh == null) {
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
                asciiInstanceTextureID.setX(i, iCharIdx)
                this.URLList[i] = tmplist[rand].urlIndex;
                asciiMesh.setColorAt(i, threeColor)

                if (find) {
                    tmplist.splice(rand, 1);
                }
            }
        }

        textMesh.geometry.attributes.alpha.needsUpdate = true;
        asciiMesh.geometry.attributes.asciiInstanceTextureID.needsUpdate = true;
        asciiMesh.instanceColor.needsUpdate = true;

    }

    function resumeVideo() {
        //console.log("on focus")
        video.play();
    }

    window.addEventListener('focus', resumeVideo, true);

}

export { video2ascii };
