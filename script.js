//import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import * as THREE from "./node_modules/three/build/three.module.js";

import { TrackballControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import { DeviceOrientationControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/DeviceOrientationControls.js";

import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.122.0/examples/jsm/renderers/CSS3DRenderer.js';
import { video2ascii } from "./video2ascii.js";
import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";

let camera, sceneControls, cameraControls, cube;
let orbitCamera,sceneControlCamera;
let renderer, scene;
let effect;

const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp(marks, "g");

const displayURLs = [];
const linkURLs = [];

const fontsize = 256;

let stats;
let charset = ".-_:~/TrJ?1=v7LuctxiYjlszofInyZC2FeV34aEAwUkHXbhp96G5#SPOqQdgK8mD0R&BMNW"
let asciiMap = [];
let asciiTexture;
let asciiMesh;
let textMesh;
let captureMesh;

let isMobile = false;
const mobileWidth = 1920;
const mobileHeight = 1080;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);


let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let windowHalfWidth = windowWidth/2;
let windowHalfHeight = windowHeight/2;

let lightHelper,shadowCameraHelper,spotLight;


let deg;
init()

function init() {

    deg = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 1, 10000);
    //camera.position.set(0,0,500);

    renderer = new THREE.WebGLRenderer({
        depth: false,
        stencil: false,
        antialias: true,
    });
    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-1"
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    console.log(typeof (DeviceOrientationEvent))
    if (typeof(DeviceOrientationEvent) === undefined) {

    } else {
        if (DeviceOrientationEvent in window) {

            isMobile = true;
            sceneControls = new DeviceOrientationControls(camera);

        } 
    }
    if(!isMobile) {

        sceneControlCamera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 0.1, 3000);
        sceneControlCamera.position.set(0.0, 0, 0.01);

        sceneControls = new OrbitControls(sceneControlCamera,renderer.domElement);
        sceneControls.enablePan = false;
        sceneControls.enableZoom = false;
        sceneControls.enableDamping = true;
        sceneControls.dampingFactor = 0.05;
        sceneControls.minPolarAngle = Math.PI / 4;
        sceneControls.maxPolarAngle = Math.PI - sceneControls.minPolarAngle;

        orbitCamera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 0.1, 3000);
        orbitCamera.position.set(0, 0, windowHalfWidth);

        //cameraControls = new OrbitControls(camera,renderer.domElement);
        cameraControls = new OrbitControls(orbitCamera,renderer.domElement);
        cameraControls.enablePan = false;
        cameraControls.enableRotate = false;
        cameraControls.maxDistance = windowHalfWidth;
        cameraControls.enableDamping = true;
        cameraControls.dampingFactor = 0.1;

    }
    console.log("isMovile", isMobile)

    loadCSV();

    stats = new Stats();
    document.body.appendChild(stats.dom);

    scene = new THREE.Scene();

    // lights
    let mainLight = new THREE.PointLight(0xcccccc, 2, window.innerWidth,2);
    scene.add(mainLight);
    //mainLight.position.x = windowHalfWidth*0.9;
    //mainLight.position.y = 60;
    const ambient = new THREE.AmbientLight( 0xffffff, 0.1 );
	scene.add( ambient );


    spotLight = new THREE.SpotLight( 0xffffff, 1 );
    spotLight.position.set( window.innerWidth/2, 40, 35 );
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;

    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 512;
    spotLight.shadow.mapSize.height = 512;
    spotLight.shadow.camera.near = 10;
    spotLight.shadow.camera.far = 2000;
    spotLight.shadow.focus = 1;
    //scene.add( spotLight );

    lightHelper = new THREE.SpotLightHelper( spotLight );
    //scene.add( lightHelper );

    shadowCameraHelper = new THREE.CameraHelper( spotLight.shadow.camera );
    //scene.add( shadowCameraHelper );

    let a = new THREE.AxesHelper(100);
    scene.add(a)

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    //document.addEventListener('click', onMouseDown, false);

}

function initMobile(){

    asciiMesh = effect.setSize(mobileWidth/2, mobileHeight/2);
    scene.add(asciiMesh)
    cube.scale.set(mobileWidth, mobileHeight, mobileWidth);
    resizeAsciis(mobileWidth,mobileHeight);

}

function onWindowResize() {

    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    windowHalfWidth = windowWidth/2;
    windowHalfHeight = windowHeight/2;

    camera.fov = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    scene.remove(asciiMesh)
    
    if(!isMobile){

        asciiMesh = effect.setSize(windowHalfWidth, windowHalfHeight);
        scene.add(asciiMesh)
        cube.scale.set(window.innerWidth, window.innerHeight, window.innerWidth);
        resizeAsciis(window.innerWidth,window.innerHeight);

    }

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onMouseMove(event) {

    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

}

function onMouseDown() {

    raycaster.setFromCamera(mouse, camera);
    const intersection = raycaster.intersectObject(asciiMesh);
    if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;
        const urlID = asciiMesh.geometry.attributes.asciiInstanceURL.getX(instanceId);
        const charID = asciiMesh.geometry.attributes.asciiInstanceUV.getX(instanceId);
        console.log(charID)
        window.open(linkURLs[urlID], '_blank');
        console.log(charset[charID],linkURLs[urlID])
    }

}

const Quaternion = new THREE.Quaternion();
const Mtx = new THREE.Matrix4();

function animate() {

    stats.begin();

    lightHelper.update();
    shadowCameraHelper.update();

    raycaster.setFromCamera(mouse, camera);
    const intersection = raycaster.intersectObject(asciiMesh);
    effect.asciifyImage(textMesh);
    if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;
        renderer.domElement.style.cursor = "pointer"
        //const urlID = asciiMesh.geometry.attributes.asciiInstanceURL.getX(instanceId);
        //title.innerText = displayURLs[urlID];
        //console.log(instanceId);
        //textMesh.setColorAt( instanceId, color.setRGB(255,0,0) );
        //textMesh.instanceColor.needsUpdate = true;
    } else {
        renderer.domElement.style.cursor = "default"
    }
    cameraControls.update();
    if (!isMobile) {
        sceneControls.update();
        orbitCamera.getWorldPosition(camera.position)
        camera.position.z -= windowHalfWidth
        sceneControlCamera.getWorldQuaternion(scene.quaternion)
        scene.quaternion.invert();
    }
    renderer.render(scene, camera);

    requestAnimationFrame(animate);

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
    let captureTextureID = [];
    let captureURL = [];
    let textAlpha = [];

    for (let i = 0; i < urls.length; i++) {

        let col = urls[i].split(",");
        let displayURL = col[0];
        let linkURL = col[1];

        displayURLs[i] = displayURL;
        linkURLs[i] = linkURL;

        captureTextureID.push(i);
        captureURL.push("./img/" + displayURL.replace(regExp, '') + ".png");

        for (let j = 0; j < displayURL.length; j++) {

            let index = charset.indexOf(displayURL[j]);

            textAlpha.push(1);

            let obj = {
                url: linkURL,
                urlIndex: i,
                id: asciinum + j,
            }

            asciiMap[index].push(obj)
            if (index == -1) {
                console.log("ascii not found", obj);
            }
        }

        asciinum += col[0].length
    }

    console.log(asciinum);


    for (let i = charset.length; i > 0; i--) {
        let num = asciiMap[i - 1].length;
        if (num == 0) {
            charset = charset.replace(charset[i - 1], "");
        }
    }

    asciiMap = asciiMap.filter(el => el.length > 0)

    effect = new video2ascii(charset, asciiMap, { color: true, invert: true });

    let textTextureID = [];
    let displayURL;
    for(let i = 0; i < displayURLs.length; i++){
        displayURL = displayURLs[i];
        for(let j = 0; j <displayURL.length;j++){
            textTextureID.push(charset.indexOf(displayURL[j]))
        }
    }

    createWhiteCube();
    createText(textTextureID, textAlpha);
    createCaptures(captureTextureID);
    if(isMobile){
        initMobile();
    }else{
        onWindowResize();
    }
    animate();

    createCaptureTexture(captureURL, (canvas) => {
        let texture = new THREE.CanvasTexture(canvas);
        captureMesh.material.map = texture;
        captureMesh.material.needsUpdate = true;
    })

}

function createText(textureID, alpha) {

    let textWidth = 5;
    let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    createAsciiTexture();//実行タイミングここでいいのか？
    let material = new THREE.MeshBasicMaterial({
        map: asciiTexture,
        side: THREE.DoubleSide,
        transparent: true,
        //color: 0x000000,
    });

    let commonChunk = `
    attribute float textureID;
    attribute float alpha;
	varying float vAlpha;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (textureID+vUv.x)/`+ charset.length + `.0;
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

    vAlpha = alpha;
    `
    let color_pars_fragment = `
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
            .replace('#include <color_pars_vertex>', color_pars_vertex)
            .replace('#include <color_vertex>', color_vertex)

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_pars_fragment>', color_pars_fragment)
            .replace('#include <color_fragment>', color_fragment)
    };

    geometry.setAttribute('textureID', new THREE.InstancedBufferAttribute(new Float32Array(textureID), 1));
    geometry.setAttribute('alpha', new THREE.InstancedBufferAttribute(new Float32Array(alpha), 1));

    textMesh = new THREE.InstancedMesh(geometry, material, textureID.length);

    let black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < textMesh.count; i++) {
        textMesh.setColorAt(i, black);
    }
    textMesh.instanceColor.needsUpdate = true;

    scene.add(textMesh);

}

function createCaptureTexture(captureURL, callback) {

    let canvas = document.createElement('canvas');
    canvas.width = 256 * captureURL.length;
    canvas.height = 192;
    let ctx = canvas.getContext('2d');

    let i = 0;
    let img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, 256, 192, i * 256, 0, 256, 192);
        i++;
        if (i < captureURL.length) {
            img.src = captureURL[i];
        } else {
            callback(canvas);
        }
    }
    img.src = captureURL[0];
}

function createCaptures(textureID) {

    let plane = new THREE.PlaneBufferGeometry(60, 60 * 3 / 4);

    plane.translate(0, 30, 0)
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    let material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        depthWrite:false,
        depthTest:false,
    });

    let commonChunk = `
    attribute float textureID;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (textureID+vUv.x)/`+ textureID.length + `.0;
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

    geometry.setAttribute('textureID', new THREE.InstancedBufferAttribute(new Uint8Array(textureID), 1));
    captureMesh = new THREE.InstancedMesh(geometry, material, textureID.length);
    scene.add(captureMesh);

}

function createWhiteCube() {

    let geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    let material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide});
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

}

function createAsciiTexture() {

    const oCanvas = document.createElement('canvas');
    const oCtx = oCanvas.getContext('2d');
    oCtx.font = fontsize+"px 'Roboto Mono', monospace";
    const textMetrics = oCtx.measureText(charset);
    const actualWidth = Math.abs(textMetrics.actualBoundingBoxRight)+Math.abs(textMetrics.actualBoundingBoxLeft);
    const actualHeight = Math.abs(textMetrics.actualBoundingBoxAscent) + Math.abs(textMetrics.actualBoundingBoxDescent);

    console.log(charset.length)
    oCanvas.width = actualWidth;
    oCanvas.height = actualHeight;

    //console.log(textMetrics)
    //console.log(oCanvas.width,oCanvas.height)
    //oCtx.fillStyle = "blue";
    //oCtx.fillRect(0, 0, oCanvas.width, oCanvas.height);

    oCtx.font = fontsize+"px 'Roboto Mono', monospace";
    oCtx.fillStyle = "rgb(255, 255, 255)";
    oCtx.textBaseline = "bottom";
    //oCtx.textAlign = "left";
    oCtx.fillText(charset, 0, oCanvas.height, oCanvas.width);
    asciiTexture = new THREE.CanvasTexture(oCanvas);
    asciiTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    asciiTexture.minFilter = THREE.NearestMipmapLinearFilter;
    effect.init(asciiTexture);
    //document.body.appendChild(oCanvas)

}

function resizeAsciis(w,h) {

    const captureSum = displayURLs.length;
    const numPerWall = Math.ceil(captureSum / 3);
    const wallWidth = w;
    const wallHeight = h;
    const halfW = wallWidth / 2;
    const halfH = wallHeight / 2;

    const tmpWallHeight = wallHeight*2/3;
    let edge = Math.floor(Math.sqrt(tmpWallHeight*wallWidth/numPerWall));
    let numPerWidth = Math.floor(wallWidth/edge);
    let numPerHeight = Math.floor(tmpWallHeight/edge);
    let tmpnum = numPerWidth * numPerHeight;
    
    while(tmpnum < numPerWall){
        edge--;
        numPerWidth = Math.floor(wallWidth/edge);
        numPerHeight = Math.floor(tmpWallHeight/edge);
        tmpnum = numPerWidth * numPerHeight;
    }

    const spaceW = wallWidth/numPerWidth;
    const spaceH = wallHeight/numPerHeight;
    const paddingX = spaceW/2;
    const paddingY = spaceH/2;

    const textBoxWidth = 80;
    const textPerRow = 16;
    const textWidth = textBoxWidth / textPerRow;
    const textHeight = textWidth * 2;
    const textLineHeight = textWidth * 2;

    let matrix = new THREE.Matrix4();
    let matrix2 = new THREE.Matrix4();

    let translateMtx = new THREE.Matrix4();
    let rotateMtx = new THREE.Matrix4();
    let scaleMtx = new THREE.Matrix4().makeScale(edge/100,edge/100,1);

    let wall, index, y;
    let counter = 0;

    for (let i = 0; i < displayURLs.length; i++) {
        matrix = matrix.identity();
        wall = i % 3;
        index = Math.floor(i / 3);        
        y = Math.floor(index / numPerWidth);

        rotateMtx.makeRotationY(Math.PI / 2 * (wall+1));
        translateMtx.makeTranslation((index % numPerWidth) * spaceW - halfW + paddingX, halfH - paddingY - y * spaceH, -halfW);
        matrix.multiply(rotateMtx);
        matrix.multiply(translateMtx);
        matrix.multiply(scaleMtx);
        captureMesh.setMatrixAt(i, matrix);

        for (let j = 0; j < displayURLs[i].length; j++) {
            matrix2 = matrix2.identity();
            let x = (j % textPerRow) * textWidth - textBoxWidth / 2 + textWidth / 2;
            let y = -(Math.floor(j / textPerRow) * textHeight + textLineHeight);
            matrix2.multiply(matrix);
            matrix2.multiply(translateMtx.makeTranslation(x, y, 0));
            textMesh.setMatrixAt(counter, matrix2);
            counter++;
        }
        
    }

    captureMesh.instanceMatrix.needsUpdate = true;
    textMesh.instanceMatrix.needsUpdate = true;

}
