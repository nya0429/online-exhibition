import * as THREE from "https://unpkg.com/three@0.123.0/build/three.module.js";
import { OrbitControls } from "./js/OrbitControls.js";
import { video2ascii } from "./js/video2ascii.js";
import { BasisTextureLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/BasisTextureLoader.js';
import Stats from "https://unpkg.com/three@0.123.0/examples/jsm/libs/stats.module.js";

let renderer, scene;
let camera,zoomCamera, rotateCamera;
let rotateControls, zoomControls;
let cube, pickplane,mainLight;
let effect;

const DataURL = "./online_exhibition_list.csv"
const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp(marks, "g");

const displayURLs = [];
const linkURLs = [];

let stats;
let charset = ".-_:~/TrJ?1=v7LuctxiYjlszofInyZC2FeV34aEAwUkHXbhp96G5#SPOqQdgK8mD0R&BMNW"
let asciiMap = [];
let asciiTexture;
let asciiMesh;
let textMesh;
let captureMesh;

const textBoxWidth = 80;
const textPerRow = 20;
const textWidth = textBoxWidth / textPerRow;
const textHeight = textWidth * 2;
const textLineHeight = textWidth * 2;
const captureWidth = 60;
const areaWidth = 120;
const areaHeight = 120;

const mobileSize = Math.max(window.innerHeight, window.innerWidth);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

let cubeWidth = window.innerWidth;
let cubeHeight = window.innerHeight;
let cubeHalfWidth = cubeWidth / 2;
let cubeHalfHeight = cubeHeight / 2;

const title = document.getElementById('title');

let isMobile = false;
let isEnableDeviceOrientation = false;
const isSupportDeviceOrientation = Boolean(window.DeviceOrientationEvent);

async function setDeviceOrientation() {

    async function getDeviceOrientation() {
        console.log("getDeviceOrientation start")
        rotateControls = new DeviceOrientationControls(rotateCamera);
        await rotateControls.connect()
            .then((value) => {
                console.log(rotateControls)
                isEnableDeviceOrientation = Boolean(rotateControls.deviceOrientation.returnValue);
                isEnableDeviceOrientation = true;
                initZoomControls();
            }, (value) => {
                initZoomControls();
                initRotateControls();
            })
        title.innerText = " It's all here. "
        console.log("getDeviceOrientation end")
    }

    const awaitForClick = (target) => {
        return new Promise(resolve => {
            target.addEventListener("click", resolve, { once: true });
        });
    };

    await awaitForClick(renderer.domElement).then(getDeviceOrientation)
    console.log("setDeviceOrientation end")
}

init()
function init() {

    isMobile = isSmartPhone();

    renderer = new THREE.WebGLRenderer({
        depth: false,
        stencil: false,
        antialias: true,
    });

    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-2"
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const deg = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 0.1, 3000);
    //camera.rotateX(Math.PI / 2)
    rotateCamera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 0.1, 3000);
    zoomCamera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 0.1, 3000);
    scene = new THREE.Scene();
        // lights
    mainLight = new THREE.PointLight(0xcccccc, 2, window.innerWidth, 1);
    scene.add(mainLight);

    if (isMobile && isSupportDeviceOrientation) {
        title.innerText = 'touch to allow'
        Promise.all([setDeviceOrientation(), loadData()])
            .then(() => {
                initMobile();
                animate();
            })
    } else {
        initZoomControls();
        initRotateControls();
        loadData();
    }

    stats = new Stats();
    document.body.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mousedown', comeback, true);

}

function initRotateControls() {

    rotateCamera.position.set(0.0, 0, 0.01);

    rotateControls = new OrbitControls(rotateCamera, renderer.domElement);
    rotateControls.enablePan = false;
    rotateControls.enableZoom = false;
    rotateControls.enableDamping = true;
    rotateControls.dampingFactor = 0.05;
    rotateControls.minPolarAngle = Math.PI / 3;
    rotateControls.maxPolarAngle = Math.PI - rotateControls.minPolarAngle;

}

function initZoomControls() {

    zoomCamera.position.set(0, 0, cubeHalfWidth);
    zoomControls = new OrbitControls(zoomCamera, renderer.domElement);
    zoomControls.enablePan = false;
    zoomControls.enableRotate = false;
    zoomControls.maxDistance = cubeHalfWidth;
    zoomControls.enableDamping = true;
    zoomControls.dampingFactor = 0.1;
    zoomControls.addEventListener('mousedown', onMouseDown, true);
}

function initMobile() {

    mainLight.distance = cubeWidth;
    asciiMesh = effect.setSize(cubeHalfWidth, cubeHalfHeight);
    scene.add(asciiMesh)
    cube.scale.set(cubeWidth, cubeHeight, cubeWidth);
    resizeAsciis(cubeWidth, cubeHeight);

}

function onWindowResize() {

    camera.fov = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    zoomCamera.fov = camera.fov;
    zoomCamera.aspect = camera.aspect;
    zoomCamera.updateProjectionMatrix();

    rotateCamera.fov = camera.fov;
    rotateCamera.aspect = camera.aspect;
    rotateCamera.updateProjectionMatrix();

    if (!isMobile) {

        cubeWidth = window.innerWidth;
        cubeHeight = window.innerHeight;
        cubeHalfWidth = cubeWidth / 2;
        cubeHalfHeight = cubeHeight / 2;

        scene.remove(asciiMesh)
        asciiMesh = effect.setSize(cubeHalfWidth, cubeHalfHeight);
        scene.add(asciiMesh)

        cube.scale.set(cubeWidth, cubeHeight, cubeWidth);
        pickplane.scale.set(cubeHalfWidth, cubeHalfHeight);
        pickplane.position.set(0, 0, -cubeHalfWidth);

        resizeAsciis(cubeWidth, cubeHeight);
        zoomControls.maxDistance = cubeHalfWidth;
        mainLight.distance = cubeWidth;

    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log("finish onResize")

}

function onMouseMove(event) {

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

}
function comeback(event) {
    zoomControls.enabled = true;
    rotateControls.enabled = true;
}
function onMouseDown(event) {

    zoomControls.enabled = true;
    rotateControls.enabled = true;

    if(!asciiMesh.visivle){
        return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersection = raycaster.intersectObject(asciiMesh);
    if (intersection.length > 0) {

        zoomControls.enabled = false;
        if (!isEnableDeviceOrientation) {
            rotateControls.enabled = false;
        }

        const instanceId = intersection[0].instanceId;
        const urlID = asciiMesh.geometry.attributes.asciiInstanceURL.getX(instanceId);
        const charID = asciiMesh.geometry.attributes.asciiInstanceUV.getX(instanceId);
        console.log(charID)
        window.open(linkURLs[urlID], '_blank');
        console.log(charset[charID], linkURLs[urlID])
    }

}

function animate() {

    stats.begin();

    effect.asciifyImage(textMesh);

    if (!isMobile) {
        raycaster.setFromCamera(mouse, camera);
        const intersection = raycaster.intersectObject(pickplane);
        renderer.domElement.style.cursor = intersection.length > 0 ? "pointer" : "default";
    }

    rotateControls.update();
    zoomControls.update();
    zoomCamera.getWorldPosition(camera.position)
    camera.position.z -= cubeHalfWidth

    if (isEnableDeviceOrientation) {
        rotateCamera.getWorldQuaternion(scene.quaternion)
        scene.quaternion.invert();
    } else {
        rotateCamera.getWorldQuaternion(scene.quaternion)
        scene.quaternion.invert();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    stats.end();
}

function loadCSV() {

    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", DataURL);
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(new Error(xhr.statusText));
            }
        };
        xhr.onerror = () => {
            reject(new Error(xhr.statusText));
        };
        xhr.send();
    });
}

async function loadData() {

    async function load(csvstr) {

        for (let i = 0; i < charset.length; i++) {
            asciiMap[i] = [];
        }

        let urls = csvstr.split("\n");
        let asciinum = 0;
        let captureTextureID = [];
        let captureURL = [];
        let captureURL2 = [];

        let textAlpha = [];

        for (let i = 0; i < urls.length; i++) {

            let col = urls[i].split(",");
            let displayURL = col[0];
            let linkURL = col[1];

            displayURLs[i] = displayURL;
            linkURLs[i] = linkURL;

            captureTextureID.push(i);
            captureURL.push("./img/" + displayURL.replace(regExp, '') + ".png");
            captureURL2.push("./basis/" + displayURL.replace(regExp, '') + ".basis");

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

        // for (let i = charset.length; i > 0; i--) {
        //     let num = asciiMap[i - 1].length;
        //     if (num == 0) {
        //         charset = charset.replace(charset[i - 1], "");
        //     }
        // }
        // asciiMap = asciiMap.filter(el => el.length > 0)

        async function createEffect() {
            effect = new video2ascii(charset, asciiMap, asciiTexture,{
                color: true, invert: true,
                resolution: isMobile ? 0.08 : 0.12
            })
        }

        let textTextureID = [];
        let displayURL;
        for (let i = 0; i < displayURLs.length; i++) {
            displayURL = displayURLs[i];
            for (let j = 0; j < displayURL.length; j++) {
                textTextureID.push(charset.indexOf(displayURL[j]))
            }
        }

        const func = async function () {
            //await createAsciiTexture();
            
            const texture = await loadAsciiTexture("./basis/asciiatlas512.basis");
            await Promise.all([
                createText(textTextureID, textAlpha),
                createEffect(),
                //effect.createAsciiMaterial(texture)
            ]);
        }

        const loader = new BasisTextureLoader();
        loader.setTranscoderPath('https://unpkg.com/three@0.123.0/examples/js/libs/basis/');
        loader.detectSupport(renderer);
        function loadTexture(path){
            return new Promise((resolve, reject) => {
                loader.load(path, function (texture) {
                    texture.encoding = THREE.sRGBEncoding;
                    resolve(texture);
                }, undefined, function (error) {
                    console.log(error);
                    reject(new Error(error));
                });
            });
        }

        async function createCapture(){
           console.log("font_mobile");
           const tex = await loadTexture("./basis/asciiatlas512.basis");
           await createCaptures(captureTextureID)
           captureMesh.material.map = tex;
           captureMesh.material.needsUpdate = true;
        }

        await Promise.all([
            createWhiteCube(),
            createCapture(),
            func()]);

        if(!isMobile){
            onWindowResize();
            animate();
        }else if(!isSupportDeviceOrientation){
            initMobile();
            animate();
        }

    };

    await loadCSV().then((csvstr) => {
        load(csvstr)
    })
}

async function createWhiteCube() {
    const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const geometry2 = new THREE.PlaneBufferGeometry(1, 1);
    const material2 = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    pickplane = new THREE.Mesh(geometry2, material2);
    scene.add(pickplane);
    //console.log("finish create whitecube");
}

async function createCaptures(textureID) {

    let plane = new THREE.PlaneBufferGeometry(captureWidth, captureWidth * 3 / 4);

    plane.translate(0, captureWidth/2, 0)
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

    let material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
    });

    let commonChunk = `
    attribute float textureID;
    #include <common>
    `
    let uvChunk = `
    #ifdef USE_UV
    vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    vUv.x = (mod(textureID, 4.0)+vUv.x)/4.0;
    vUv.y = (floor(textureID/4.0)+1.0-vUv.y)/`+ Math.ceil(textureID.length/4) + `.0;
    //vUv.x = vUv.x/4.0;
    //vUv.y = (1.0-vUv.y)/`+ Math.ceil(textureID.length/4) + `.0;

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
    console.log("finish create captureMesh");

}

async function createText(textureID, alpha) {

    let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
    let geometry = new THREE.InstancedBufferGeometry();
    THREE.BufferGeometry.prototype.copy.call(geometry, plane);

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
    console.log("finish create Text")

}

function loadAsciiTexture(path){

    const loader = new BasisTextureLoader();
    loader.setTranscoderPath('https://unpkg.com/three@0.123.0/examples/js/libs/basis/');
    loader.detectSupport(renderer);

    return new Promise((resolve, reject) => {
        loader.load(path, function (texture) {
            texture.encoding = THREE.sRGBEncoding;
            asciiTexture = texture;
            resolve(texture);
        }, undefined, function (error) {
            reject(new Error(error));
        });
    });
}

function resizeAsciis(w, h) {

    const captureSum = displayURLs.length;
    const numPerWall = Math.ceil(captureSum / 3);
    const wallWidth = w*0.92;
    const wallHeight = h*0.92;
    const halfW = wallWidth / 2;
    const halfH = wallHeight / 2;
    const depth = w/2;

    //
    const tmpWallHeight = wallHeight * areaWidth / areaHeight;
    let edge = Math.floor(Math.sqrt(tmpWallHeight * wallWidth / numPerWall));
    let numPerWidth = Math.floor(wallWidth / edge);
    let numPerHeight = Math.floor(tmpWallHeight / edge);
    let tmpnum = numPerWidth * numPerHeight;

    while (tmpnum < numPerWall) {
        edge--;
        numPerWidth = Math.floor(wallWidth / edge);
        numPerHeight = Math.floor(tmpWallHeight / edge);
        tmpnum = numPerWidth * numPerHeight;
    }

    const spaceW = wallWidth / numPerWidth;
    const spaceH = wallHeight / numPerHeight;
    const paddingX = spaceW / 2;
    const paddingY = spaceH / 2;

    let matrix = new THREE.Matrix4();
    let matrix2 = new THREE.Matrix4();

    let translateMtx = new THREE.Matrix4();
    let rotateMtx = new THREE.Matrix4();
    let scaleMtx = new THREE.Matrix4().makeScale(edge / areaWidth, edge / areaWidth, 1);

    let wall, index, y;
    let counter = 0;

    for (let i = 0; i < displayURLs.length; i++) {
        matrix = matrix.identity();
        wall = i % 3;
        index = Math.floor(i / 3);
        y = Math.floor(index / numPerWidth);

        rotateMtx.makeRotationY(Math.PI / 2 * (wall + 1));
        translateMtx.makeTranslation((index % numPerWidth) * spaceW - halfW + paddingX, halfH - paddingY - y * spaceH, -depth);
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

function isSmartPhone() {
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        cubeWidth = mobileSize * 2;
        cubeHeight = mobileSize * 2;
        cubeHalfWidth = mobileSize;
        cubeHalfHeight = mobileSize;
        return true;
    } else {
        return false;
    }
}

var DeviceOrientationControls = function (object) {

    var scope = this;
    var changeEvent = { type: "change" };
    var EPS = 0.000001;

    this.object = object;
    this.object.rotation.reorder('YXZ');

    this.enabled = false;

    this.deviceOrientation = {};
    this.screenOrientation = 0;

    this.alphaOffset = 0; // radians

    var onDeviceOrientationChangeEvent = function (event) {

        scope.deviceOrientation = event;

    };

    var onScreenOrientationChangeEvent = function () {

        scope.screenOrientation = window.orientation || 0;

    };

    // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

    var setObjectQuaternion = function () {

        var zee = new THREE.Vector3(0, 0, 1);

        var euler = new THREE.Euler();

        var q0 = new THREE.Quaternion();

        var q1 = new THREE.Quaternion(- Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

        return function (quaternion, alpha, beta, gamma, orient) {

            euler.set(beta, alpha, - gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us

            quaternion.setFromEuler(euler); // orient the device

            quaternion.multiply(q1); // camera looks out the back of the device, not the top

            quaternion.multiply(q0.setFromAxisAngle(zee, - orient)); // adjust for screen orientation

        };

    }();

    this.connect = function () {

        return new Promise((resolve, reject) => {

            onScreenOrientationChangeEvent(); // run once on load

            // iOS 13+

            if (window.DeviceOrientationEvent !== undefined && typeof window.DeviceOrientationEvent.requestPermission === 'function') {

                window.DeviceOrientationEvent.requestPermission().then(function (response) {

                    if (response == 'granted') {

                        window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
                        window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
                        resolve(this);

                    }

                }).catch(function (error) {

                    console.error('THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:', error);
                    reject(this);

                });

            } else {

                window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
                window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
                resolve(this);

            }

            scope.enabled = true;

        });
    }

    this.disconnect = function () {

        window.removeEventListener('orientationchange', onScreenOrientationChangeEvent, false);
        window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);

        scope.enabled = false;

    };

    this.update = (function () {

        var lastQuaternion = new THREE.Quaternion();

        return function () {

            if (scope.enabled === false) return;

            var device = scope.deviceOrientation;

            if (device) {

                var alpha = device.alpha ? THREE.MathUtils.degToRad(device.alpha) + scope.alphaOffset : 0; // Z

                var beta = device.beta ? THREE.MathUtils.degToRad(device.beta) : 0; // X'

                var gamma = device.gamma ? THREE.MathUtils.degToRad(device.gamma) : 0; // Y''

                var orient = scope.screenOrientation ? THREE.MathUtils.degToRad(scope.screenOrientation) : 0; // O

                setObjectQuaternion(scope.object.quaternion, alpha, beta, gamma, orient);

                if (8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

                    lastQuaternion.copy(scope.object.quaternion);
                    scope.dispatchEvent(changeEvent);

                }

            }

        };


    })();

    this.dispose = function () {

        scope.disconnect();

    };

    //this.connect();

};

DeviceOrientationControls.prototype = Object.create(THREE.EventDispatcher.prototype);
DeviceOrientationControls.prototype.constructor = DeviceOrientationControls;

export { DeviceOrientationControls };