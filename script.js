//import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import * as THREE from "./node_modules/three/build/three.module.js";

import { TrackballControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.122.0/examples/jsm/renderers/CSS3DRenderer.js';
import { video2ascii } from "./video2ascii.js";
import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";
import { JSZip } from './node_modules/three/examples/jsm/libs/jszip.module.min.js';
import { WEBGL } from './node_modules/three/examples/jsm/WebGL.js';

let camera, controls, scene, renderer, box;
let CSSrenderer, CSSscene;
let walls = [];
let effect;

const padding = 0.9;
const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp(marks, "g");

let boxScale = new THREE.Vector3(window.innerWidth, window.innerHeight * 2, window.innerWidth);

const displayURLs = [];
const linkURLs = [];

let stats;
let charset = ".-_~:/?=&rvcsijtlf17xzunoeaypqhdbk0gwm4253689ABCDEFGHIJKLMNOPQRSTUVWXYZ"
//#
let asciiMap = [];
let asciiTexture;
let asciiPositionAttribute;
let asciiMesh;

let captureMesh;
let capturePositionAttribute;

init()

function init() {

    getCSV();

    stats = new Stats();
    document.body.appendChild(stats.dom);

    const container = document.getElementById('container');

    let deg = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 1, 10000);
    //camera.position.set(0.0001, 0, 0)
    camera.lookAt(0, 0, 0)
    camera.position.set(10, 10, 10);
    //camera.lookAt(0,0,1)

    CSSscene = new THREE.Scene();
    CSSrenderer = new CSS3DRenderer();
    CSSrenderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(CSSrenderer.domElement);

    effect = new video2ascii(charset, asciiMap, { color: true, invert: true });
    effect.setSize(window.innerWidth / 2, window.innerHeight / 2);

    let div = document.createElement('div')
    div.appendChild(effect.domElement);
    const object = new CSS3DObject(div);
    object.rotation.y = Math.PI / 2;
    object.position.set(-window.innerWidth / 2, 0, 0);
    CSSscene.add(object);

    controls = new TrackballControls(camera, CSSrenderer.domElement);
    //controls = new OrbitControls(camera, CSSrenderer.domElement);
    //controls.maxPolarAngle = Math.PI / 2;
    //controls.minPolarAngle = Math.PI / 2;

    window.addEventListener('resize', onWindowResize, false);
    //effect.asciifyImage();

}

function onWindowResize() {

    //CSSrenderer.setSize(window.innerWidth, window.innerHeight);

    camera.fov = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // for (let i = 0; i < walls.length; i++) {
    //     walls[i].style.width = window.innerWidth * padding + 'px';
    //     walls[i].style.height = window.innerHeight * 1.5 + 'px';
    // }

    // for (let obj in CSSscene.children) {
    //     CSSscene.children[obj].position.normalize().multiplyScalar(window.innerWidth / 2)
    // }
    boxScale.set(window.innerWidth, window.innerHeight * 2, window.innerWidth);
    box.scale.set(boxScale.x, boxScale.y, boxScale.z);
    resizeAsciis();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);

    //console.log(tmpTexture);
    stats.begin();
    update();
    effect.asciifyImage(asciiMesh);
    asciiMesh.instanceColor.needsUpdate = true;
    controls.update();
    CSSrenderer.render(CSSscene, camera);
    renderer.render(scene, camera);
    stats.end();
}

function getCSV() {
    let req = new XMLHttpRequest();
    req.open("get", "./online_exhibition_list.csv", true);
    req.send(null);
    req.onload = function () {
        window.addEventListener('load', loadURLs(req.responseText));
    }
}

function loadURLs(csvstr) {

    renderer = new THREE.WebGLRenderer({
        depth: false,
        stencil: false,
    });
    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-1"
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    scene = new THREE.Scene();

    let box = new THREE.Mesh(
        new THREE.BoxBufferGeometry(10, 10, 10),
        new THREE.MeshNormalMaterial()
    )
    //scene.add(box)
    //console.log(box);

    // lights
    let mainLight = new THREE.PointLight(0xcccccc, 2, 1600);
    mainLight.position.y = 60;
    scene.add(mainLight);

    document.body.appendChild(renderer.domElement);

    for (let i = 0; i < charset.length; i++) {
        asciiMap[i] = [];
    }

    for (let i = 0; i < 3; i++) {
        walls[i] = document.createElement('div');
        walls[i].className = 'wall';
        walls[i].style.width = window.innerWidth * padding + 'px';
        walls[i].style.height = window.innerHeight * 1.5 + 'px';
        walls[i].style.contentVisibility = "auto"
    }

    let instanceUV = [];
    let instancePos = [];
    let captureInstanceUV = [];
    let captureInstancePos = [];
    let captureInstanceTexture = [];
    let captureInstanceURL = [];
    let urls = csvstr.split("\n");
    let asciinum = 0;
    let capture, artwork, caption, frame, span;
    let loader = new THREE.DataTextureLoader();
    //let loader = new THREE.TextureLoader();

    let tex;

    for (let i = 0; i < urls.length; ++i) {

        let col = urls[i].split(",");
        let displayURL = col[0];
        let linkURL = col[1];

        displayURLs[i] = displayURL;
        linkURLs[i] = linkURL;

        capture = document.createElement('img');
        capture.className = 'capture'
        capture.src = "./img/" + displayURL.replace(regExp, '') + ".png";

        caption = document.createElement('div');
        caption.className = 'caption'
        caption.id = 'caption' + i;

        captureInstanceUV.push(i);
        captureInstancePos.push(0);
        captureInstancePos.push(i * 3);
        captureInstancePos.push(0);

        // tex = loader.load("./img/" + displayURL.replace(regExp, '') + ".png",function(texture){
        //     console.log(texture.image.src)
        // });
        //tex = loader.load("./img/" + displayURL.replace(regExp, '') + ".png");
        //https://discourse.threejs.org/t/datatexture-to-uint8array/3713
        //captureInstanceTexture.push(tex.image.data);

        let str = "./img/" + displayURL.replace(regExp, '') + ".png"
        captureInstanceURL.push(str);

        for (let j = 0; j < displayURL.length; j++) {

            span = document.createElement('span');
            span.className = 'captionChar';
            span.innerText = displayURL[j];
            caption.appendChild(span);

            let index = charset.indexOf(displayURL[j]);
            instanceUV.push(index);
            instancePos.push(j);
            instancePos.push(i * 3);
            instancePos.push(0);

            let obj = {
                url: linkURL,
                span: span,
                tint: false,
                pretint: false,
                id: asciinum + j,
            }
            asciiMap[index].push(obj)
            if (index == -1) {
                console.log("not found ", obj);
            }
        }

        asciinum += col[0].length

        let work = document.createElement('div');
        work.className = 'work'

        work.appendChild(capture)
        work.appendChild(caption)
        walls[i % 3].appendChild(work);

    }

    console.log(asciinum);
    // for (let i = charset.length; i > 0; i--) {
    //     let num = asciiMap[i - 1].length;
    //     if (num == 0) {
    //         charset = charset.replace(charset[i - 1], "");
    //     }
    // }

    // asciiMap = asciiMap.filter(el => el.length > 0)

    createAsciis(instanceUV, instancePos);
    createCaptures(captureInstanceUV, captureInstancePos, captureInstanceURL);
    createWhiteCube();

    scene.add(new THREE.GridHelper(1000, 100))

    onWindowResize();
    animate();
}

function createAsciis(instanceUV, instancePos) {

    let textWidth = 5;
    let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    createCanvasTexture();
    let material = new THREE.MeshBasicMaterial({
        // color: 0xFF00FF,
        map: asciiTexture,
        side: THREE.DoubleSide,
        transparent: true,
    });

    let commonChunk = `
    attribute vec3 instancePos;
    attribute float instanceUV;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (instanceUV+vUv.x)/`+ charset.length + `.0;
    #endif
    `
    let beginVertexChunk = `
    vec3 transformed = vec3( position );
    transformed = instancePos+transformed;
    `
    material.onBeforeCompile = function (shader) {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', commonChunk)
            .replace('#include <uv_vertex>', uvChunk)
        //.replace('#include <begin_vertex>', beginVertexChunk)
    };

    asciiPositionAttribute = new THREE.InstancedBufferAttribute(new Float32Array(instancePos), 3);
    geometry.setAttribute('instancePos', asciiPositionAttribute);
    geometry.setAttribute('instanceUV', new THREE.InstancedBufferAttribute(new Float32Array(instanceUV), 1));

    console.log(instanceUV.length)

    //asciiMesh = new THREE.Mesh(geometry,material,instanceUV.length);
    asciiMesh = new THREE.InstancedMesh(geometry, material, instanceUV.length);

    let dummy = new THREE.Object3D();
    for (let i = 0; i < asciiPositionAttribute.count; i++) {
        let x = asciiPositionAttribute.getX(i)
        let y = asciiPositionAttribute.getY(i)
        let z = asciiPositionAttribute.getZ(i)

        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        asciiMesh.setMatrixAt(i, dummy.matrix);
    }
    asciiMesh.instanceMatrix.needsUpdate = true;

    scene.add(asciiMesh);

}

function myImageToUint8Array(image,context,resolve){
    context.width = image.width;
    context.height = image.height;
    context.drawImage(image, 0, 0);
    context.canvas.toBlob(blob => blob.arrayBuffer()
      .then(buffer => resolve(new Uint8Array(buffer)))
    )
}

function createCaptures(instanceUV, instancePos, captureInstanceURL) {

    console.log("create Capture")
    //https://blog.katsubemakito.net/html5/canvas-image

    let canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 192;
    let ctx = canvas.getContext('2d');

    let resolve = (buffer) =>{
        console.log("resolve",buffer)
    }

    let img = new Image();
    img.onload = ()=>{
        myImageToUint8Array(img,ctx,resolve)
    }
    img.src = captureInstanceURL[0];

    //img.onLoad();
    // Draw Image
    console.log(ctx)
    document.body.appendChild(canvas)

    let textures = [];
    let texture;
    let loader = new THREE.TextureLoader();
    for(let i = 0; i<captureInstanceURL.length; i++){
        texture = loader.load(captureInstanceURL[i])
        textures.push(texture);
    }

    let plane = new THREE.PlaneBufferGeometry(100, 150);
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    let material = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        side: THREE.DoubleSide,
        //map:instanceTexture[0]
    });

    let commonChunk = `
    attribute vec3 instancePos;
    attribute float instanceUV;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (instanceUV+vUv.x)/`+ charset.length + `.0;
    #endif
    `
    let beginVertexChunk = `
    vec3 transformed = vec3( position );
    transformed = instancePos+transformed;
    `
    // material.onBeforeCompile = function (shader) {
    //     shader.vertexShader = shader.vertexShader
    //         .replace('#include <common>', commonChunk)
    //         .replace('#include <begin_vertex>', beginVertexChunk);
    // };

    capturePositionAttribute = new THREE.InstancedBufferAttribute(new Float32Array(instancePos), 3);
    geometry.setAttribute('instancePos', capturePositionAttribute);
    geometry.setAttribute('instanceUV', new THREE.InstancedBufferAttribute(new Float32Array(instanceUV), 1));

    //captureMesh = new THREE.Mesh(geometry,material);
    captureMesh = new THREE.InstancedMesh(geometry, material, instanceUV.length);
    scene.add(captureMesh);

}

function update() {

    let black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < asciiMesh.count; i++) {
        asciiMesh.setColorAt(i, black);
    }

}

function resizeAsciis() {

    let total = displayURLs.length;
    let wallPerNum = Math.ceil(total / 3);
    let wallWidth = window.innerWidth;
    //console.log(total,wallPerNum)
    //console.log(window.innerWidth,window.innerHeight)
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

    // let artsize = Math.floor(Math.sqrt(area));
    // let widthNum = Math.floor(w/artsize)
    // //let artsizew = Math.floor(artsizeh*4/3);
    // let width =  window.innerWidth/widthNum;

    let list;
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

function createWhiteCube() {

    let geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    let material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide, });
    box = new THREE.Mesh(geometry, material);
    //scene.add(box);

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
    //document.body.appendChild(oCanvas)
    asciiTexture = new THREE.CanvasTexture(oCanvas);

}
