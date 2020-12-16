import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import { TrackballControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.122.0/examples/jsm/renderers/CSS3DRenderer.js';
import { video2ascii } from "./video2ascii.js";
import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";

let camera, controls, box;
let renderer,scene;
let CSSrenderer, CSSscene;
let effect;
let effectCSS;

const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp(marks, "g");

const displayURLs = [];
const linkURLs = [];

let stats;
let charset = ".-_~:/?=&rvcsijtlf17xzunoeaypqhdbk0gwm4253689ABCDEFGHIJKLMNOPQRSTUVWXYZ"
//#
let asciiMap = [];
let asciiTexture;
let asciiMesh;
let captureMesh;

let Device = "other";

init()

function setDeviceInfo(){

    console.log(navigator.userAgent)

    let ua = navigator.userAgent;
    if(ua.indexOf('iPhone')+1 || ua.indexOf('Mobile')+1 || ua.indexOf('iPad')+1 || ua.indexOf('Android')+1){
        console.log("smartphone device")
    }

}

function init() {

    //setDeviceInfo();
    loadCSV();

    stats = new Stats();
    document.body.appendChild(stats.dom);

    renderer = new THREE.WebGLRenderer({
        depth: false,
        stencil: false,
        antialias : true,
    });
    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-1"
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    // lights
    let mainLight = new THREE.PointLight(0xcccccc, 2, 1600);
    mainLight.position.y = 60;

    scene.add(mainLight);

    const container = document.getElementById('container');

    let deg = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0.0001, 0, 0)
    camera.lookAt(1, 0, 0)
    camera.updateProjectionMatrix();

    //camera.position.set(10, 10, 10);
    //camera.lookAt(0,0,1)

    CSSscene = new THREE.Scene();
    CSSrenderer = new CSS3DRenderer();
    CSSrenderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(CSSrenderer.domElement);

    effect = new video2ascii(charset, asciiMap, { color: true, invert: true ,resolution:0.12});
    effect.setSize(window.innerWidth / 2, window.innerHeight / 2);

    effectCSS = new CSS3DObject(effect.domElement);
    effectCSS.rotation.y = Math.PI / 2;
    effectCSS.position.set(-window.innerWidth / 2, 0, 0);
    CSSscene.add(effectCSS);

    //controls = new TrackballControls(camera, CSSrenderer.domElement);
    controls = new OrbitControls(camera, CSSrenderer.domElement);
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI / 2;

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    camera.fov = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    effect.setSize(window.innerWidth / 2, window.innerHeight / 2);

    effectCSS.position.set(-window.innerWidth / 2, 0, 0);
    box.scale.set(window.innerWidth, window.innerHeight * 2, window.innerWidth);
    resizeAsciis();

    CSSrenderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);

    stats.begin();
    effect.asciifyImage(asciiMesh);
    //controls.update();
    CSSrenderer.render(CSSscene, camera);
    renderer.render(scene, camera);
    stats.end();
}

function loadCSV() {
    let req = new XMLHttpRequest();
    req.open("get", "./online_exhibition_list.csv", true);
    req.send(null);
    req.onload = function () {
        window.addEventListener('load', loadURLs(req.responseText));
    }
}

function loadURLs(csvstr) {

    for (let i = 0; i < charset.length; i++) {
        asciiMap[i] = [];
    }

    let urls = csvstr.split("\n");
    let asciinum = 0;
    let capture, artwork, caption, frame, span,url;

    let asciiInstanceUV = [];
    let captureInstanceUV = [];
    let captureInstanceURL = [];
    let asciiInstanceAlpha = [];


    for (let i = 0; i < urls.length; ++i) {

        let col = urls[i].split(",");
        let displayURL = col[0];
        let linkURL = col[1];

        displayURLs[i] = displayURL;
        linkURLs[i] = linkURL;

        captureInstanceUV.push(i);
        captureInstanceURL.push("./img/" + displayURL.replace(regExp, '') + ".png");

        for (let j = 0; j < displayURL.length; j++) {

            let index = charset.indexOf(displayURL[j]);

            asciiInstanceUV.push(index);
            asciiInstanceAlpha.push(1);

            let obj = {
                url: linkURL,
                id: asciinum + j,
            }

            asciiMap[index].push(obj)
            if (index == -1) {
                console.log("not found ", obj);
            }
        }

        asciinum += col[0].length
    }

    console.log(asciinum);

    // for (let i = charset.length; i > 0; i--) {
    //     let num = asciiMap[i - 1].length;
    //     if (num == 0) {
    //         charset = charset.replace(charset[i - 1], "");
    //     }
    // }

    // asciiMap = asciiMap.filter(el => el.length > 0)

    createWhiteCube();
    createAsciis(asciiInstanceUV,asciiInstanceAlpha);
    createCaptures(captureInstanceUV);
    onWindowResize();
    animate();    

    createCaptureTexture(captureInstanceURL,(canvas)=>{
        //document.body.appendChild(canvas)
        let texture = new THREE.CanvasTexture(canvas);
        captureMesh.material.map = texture;
        captureMesh.material.needsUpdate = true;

    })

}

function createAsciis(asciiInstanceUV,asciiInstanceAlpha) {

    let textWidth = 5;
    let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    createCanvasTexture();//実行タイミングここでいいのか？
    let material = new THREE.MeshBasicMaterial({
        map: asciiTexture,
        side: THREE.DoubleSide,
        transparent: true,
        color: 0x000000,
    });

    let commonChunk = `
    attribute float asciiInstanceUV;
    attribute float asciiInstanceAlpha;
	varying float vAlpha;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (asciiInstanceUV+vUv.x)/`+ charset.length + `.0;
    #endif
    `
    let color_pars_vertex = `
    #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
    varying vec3 vColor;
    #endif
    `
    let color_vertex =`
    #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
    #endif
    #ifdef USE_COLOR
	vColor.xyz *= color.xyz;
    #endif
    #ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
    #endif

    //vAlpha = 0.0;
    vAlpha = asciiInstanceAlpha;

    `
    let color_pars_fragment =`
    #ifdef USE_COLOR
    varying vec3 vColor;
    #endif
    varying float vAlpha;
    `
    let color_fragment = `
    #ifdef USE_COLOR
    diffuseColor.rgb *= vColor;
    #endif
    diffuseColor.a *= vAlpha;
    `

    material.onBeforeCompile = function (shader) {
        
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', commonChunk)
            .replace('#include <uv_vertex>', uvChunk)
            .replace('#include <color_pars_vertex>',color_pars_vertex)
            .replace('#include <color_vertex>',color_vertex)

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_pars_fragment>',color_pars_fragment)
            .replace('#include <color_fragment>',color_fragment)
    };

    geometry.setAttribute('asciiInstanceUV', new THREE.InstancedBufferAttribute(new Float32Array(asciiInstanceUV), 1));
    geometry.setAttribute('asciiInstanceAlpha', new THREE.InstancedBufferAttribute(new Float32Array(asciiInstanceAlpha), 1));

    asciiMesh = new THREE.InstancedMesh(geometry, material, asciiInstanceUV.length);

    let black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < asciiMesh.count; i++) {
        asciiMesh.setColorAt(i, black);
    }
    asciiMesh.instanceColor.needsUpdate = true;

    scene.add(asciiMesh);

}

function createCaptureTexture(captureInstanceURL,callback){

    let canvas = document.createElement('canvas');
    canvas.width = 256 * captureInstanceURL.length;
    canvas.height = 192;
    let ctx = canvas.getContext('2d');

    let i = 0;
    let img = new Image();
    img.onload = () => {
        console.log("img loaded "+i+" / "+captureInstanceURL.length)
        ctx.drawImage(img, 0, 0, 256, 192, i * 256, 0, 256, 192);
        i++;
        if (i < captureInstanceURL.length){
            img.src = captureInstanceURL[i];
        }else{
            callback(canvas);
        }
    }
    img.src = captureInstanceURL[0];
}

function createCaptures(asciiInstanceUV) {

    let plane = new THREE.PlaneBufferGeometry(60, 60*3/4);
    plane.translate(0,30,0)
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    let material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        //map: texture,
    });

    let commonChunk = `
    attribute float asciiInstanceUV;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (asciiInstanceUV+vUv.x)/`+ asciiInstanceUV.length + `.0;
    #endif
    `
    let beginVertexChunk = `
    vec3 transformed = vec3( position );
    sampler2D t = textureArray[1];
    //transformed = instancePos+transformed;
    `
    material.onBeforeCompile = function (shader) {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', commonChunk)
            .replace('#include <uv_vertex>', uvChunk)
            //.replace('#include <begin_vertex>', beginVertexChunk);
    };

    geometry.setAttribute('asciiInstanceUV', new THREE.InstancedBufferAttribute(new Uint8Array(asciiInstanceUV), 1));
    captureMesh = new THREE.InstancedMesh(geometry, material, asciiInstanceUV.length);
    scene.add(captureMesh);

}

function createWhiteCube() {

    let geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    let material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, });
    box = new THREE.Mesh(geometry, material);
    scene.add(box);

}

function createCanvasTexture() {

    let oCanvas = document.createElement('canvas');
    let oCtx = oCanvas.getContext('2d');
    let fontsize = 256;
    oCanvas.height = fontsize;
    oCtx.font = "256px Roboto Mono";
    oCanvas.width = oCtx.measureText(charset).width;
    oCtx.font = "256px Roboto Mono";
    oCtx.fillStyle = "rgb(255, 255, 255)";
    oCtx.textBaseline = "top";
    oCtx.textAlign = "left";
    oCtx.fillText(charset, 0, 0, oCanvas.width);
    asciiTexture = new THREE.CanvasTexture(oCanvas);
    asciiTexture.minFilter = THREE.LinearMipmapNearestFilter;

}

function resizeAsciis() {

    let total = displayURLs.length;
    let wallPerNum = Math.ceil(total / 3);
    let wallWidth = window.innerWidth;
    let tmpW = wallWidth * 3 / 2;
    let tmpH = window.innerHeight;
    let area = tmpW * tmpH / wallPerNum;
    let edgeH = Math.floor(Math.sqrt(area));
    let perW = Math.floor(tmpW / edgeH);
    let perH = Math.floor(tmpH / edgeH);
    let edgeW = Math.floor(edgeH * 2 / 3);

    console.log(perW, perH, perW * perH);
    console.log(area, edgeH);
    console.log(edgeW);

    let padding = (wallWidth - edgeW * (perW - 1)) / 2;

    let halfW = window.innerWidth / 2;
    let halfH = window.innerHeight / 2;
    let wall, index, y;

    let textBoxWidth = 80;
    let textPerRow = 16;
    let textWidth = textBoxWidth / textPerRow;
    let textHeight = textWidth * 2;
    let textPadding = 10;

    let matrix = new THREE.Matrix4();
    let matrix2 = new THREE.Matrix4();

    let mat4 = new THREE.Matrix4();

    let wallTranslateMtx = new THREE.Matrix4();
    let wallRotateMtx = new THREE.Matrix4();

    let counter = 0;

    for (let i = 0; i < displayURLs.length; i++) {
        matrix = matrix.identity();
        wall = i % 3;
        index = Math.floor(i / 3);
        y = Math.floor(index / perW);

        wallRotateMtx.makeRotationY(-Math.PI / 2 * wall);
        wallTranslateMtx.makeTranslation((index % perW) * edgeW - halfW + padding, halfH - y * edgeH, -halfW);
        matrix.multiply(wallRotateMtx);
        matrix.multiply(wallTranslateMtx);
        captureMesh.setMatrixAt(i, matrix);
        for (let j = 0; j < displayURLs[i].length; j++) {

            matrix2 = matrix2.identity();
            //matrix2.multiply(mat4.makeRotationY((Math.PI)));

            let x = (j % textPerRow) * textWidth - textBoxWidth / 2 + textWidth / 2;
            let y = -(Math.floor(j / textPerRow) * textHeight + textPadding);
            matrix2.multiply(matrix);
            matrix2.multiply(mat4.makeTranslation(x, y, 0));

            asciiMesh.setMatrixAt(counter, matrix2);
            counter++;
        }
    }

    captureMesh.instanceMatrix.needsUpdate = true;
    asciiMesh.instanceMatrix.needsUpdate = true;
}
