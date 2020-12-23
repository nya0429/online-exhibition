import * as THREE from "https://unpkg.com/three@0.123.0/build/three.module.js";
import { OrbitControls } from "./js/OrbitControls.js";
import { video2ascii } from "./js/video2ascii.js";
import { BasisTextureLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/BasisTextureLoader.js';

let renderer, scene;
let camera, zoomCamera, rotateCamera;
let rotateControls, zoomControls;
let cube, pickplane, mainLight;
let effect;

const DataURL = "./online_exhibition_list.csv"
const displayURLs = [];
const linkURLs = [];
const charset = ".-_:~/TrJ?1=v7LuctxiYjlszofInyZC2FeV34aEAwUkHXbhp96G5#SPOqQdgK8mD0R&BMNW"
let asciiMap = [];
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

const mobileSize = Math.max(document.documentElement.clientHeight, document.documentElement.clientWidth);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

let cubeWidth = document.documentElement.clientWidth;
let cubeHeight = document.documentElement.clientHeight;
let cubeHalfWidth = cubeWidth / 2;
let cubeHalfHeight = cubeHeight / 2;

const title = document.getElementById('title');

let isMobile = false;

window.addEventListener('load', init);

function init() {

    isMobile = isSmartPhone();
    setBaseSize();

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
    renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    const deg = Math.atan(document.documentElement.clientHeight / document.documentElement.clientWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 3000);
    //camera.rotateX(Math.PI / 2)
    rotateCamera = new THREE.PerspectiveCamera(deg, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 3000);
    zoomCamera = new THREE.PerspectiveCamera(deg, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 3000);
    scene = new THREE.Scene();
    // lights
    mainLight = new THREE.PointLight(0xcccccc, 2, document.documentElement.clientWidth, 1);
    scene.add(mainLight);

    loadData().then(animate);

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
    //console.log("finish initRotateControls")

}

async function initZoomControls() {

    renderer.domElement.addEventListener('touchstart', onTouchStart, true);
    renderer.domElement.addEventListener('mousedown', onMouseDown, true);

    zoomCamera.position.set(0, 0, cubeHalfWidth);
    zoomControls = new OrbitControls(zoomCamera, renderer.domElement);
    zoomControls.enablePan = false;
    zoomControls.enableRotate = false;
    zoomControls.maxDistance = isMobile ? mobileSize : cubeHalfWidth;
    zoomControls.enableDamping = true;
    zoomControls.dampingFactor = 0.1;
    //console.log("finish initZoomControls")

}

function onWindowResize() {

    setBaseSize();
    setCameraViewport();
    if (!isMobile) {
        effect.setSize(cubeHalfWidth, cubeHalfHeight).then(effect.startVideo());
        scene.remove(asciiMesh)
        asciiMesh.geometry.dispose();
        asciiMesh = effect.setAsciiMesh();
        scene.add(asciiMesh)
        zoomControls.maxDistance = cubeHalfWidth;
        setObjectTransform();
    }

    renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);

}

function onMouseMove(event) {

    mouse.x = (event.clientX / document.documentElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / document.documentElement.clientHeight) * 2 + 1;

}

function onTouchStart(event) {

    //console.log("onTouchStart")
    mouse.x = (event.touches[0].clientX / document.documentElement.clientWidth) * 2 - 1;
    mouse.y = - (event.touches[0].clientY / document.documentElement.clientHeight) * 2 + 1;
    onMouseDown(event);

}

function onMouseDown(event) {

    raycaster.setFromCamera(mouse, camera);
    const intersection = raycaster.intersectObject(asciiMesh);
    if (intersection.length > 0) {

        const instanceId = intersection[0].instanceId;
        const urlID = asciiMesh.geometry.attributes.asciiInstanceURL.getX(instanceId);
        //const charID = asciiMesh.geometry.attributes.asciiInstanceUV.getX(instanceId);
        //console.log(charID)
        //console.log(charset[charID], linkURLs[urlID])

        let w = window.open(linkURLs[urlID], '_blank');
        console.log(w);

    }
}

function animate() {

    effect.asciifyImage(textMesh);

    if (!isMobile) {
        raycaster.setFromCamera(mouse, camera);
        const intersection = raycaster.intersectObject(pickplane);
        renderer.domElement.style.cursor = intersection.length > 0 ? "pointer" : "default";
    }

    rotateControls.update();
    zoomControls.update();
    zoomCamera.getWorldPosition(camera.position)
    camera.position.z -= zoomControls.maxDistance;
    rotateCamera.getWorldQuaternion(scene.quaternion)
    scene.quaternion.invert();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);

}

async function loadData() {

    let asciinum = 0;
    let captureTextureID = [];
    let textTextureID = [];
    let textAlpha = [];

    async function setArray() {

        function loadCSV() {
            return new Promise((resolve, reject) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", DataURL);
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve(xhr.response);
                    }
                    // } else {
                    //     reject(new Error(xhr.statusText));
                    // }
                };
                xhr.onerror = () => {
                    reject(new Error(xhr.statusText));
                };
                xhr.send();
            });
        }

        let csvstr = await loadCSV();

        for (let i = 0; i < charset.length; i++) {
            asciiMap[i] = [];
        }

        let urls = csvstr.split("\n");

        for (let i = 0; i < urls.length; i++) {

            let col = urls[i].split(",");
            let displayURL = col[0];
            let linkURL = col[1];

            displayURLs[i] = displayURL;
            linkURLs[i] = linkURL;

            captureTextureID.push(i);

            for (let j = 0; j < displayURL.length; j++) {

                const index = charset.indexOf(displayURL[j]);
                textTextureID.push(index);
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

        effect = new video2ascii(charset, asciiMap, {
            color: true, invert: true,
            resolution: isMobile ? 0.08 : 0.12
        })
        effect.setSize(cubeHalfWidth, cubeHalfHeight)

        return;
    }

    function loadBasisUTexture(path) {
        const loader = new BasisTextureLoader();
        loader.setTranscoderPath('https://unpkg.com/three@0.123.0/examples/js/libs/basis/');
        loader.detectSupport(renderer);
        return new Promise((resolve, reject) => {
            console.log("start load texture", path)
            loader.load(path, function (texture) {
                texture.encoding = THREE.sRGBEncoding;
                console.log("finish load texture", path)
                resolve(texture);
            }, undefined, function (error) {
                reject(new Error(error));
            });
        });
    }

    async function createText(textureID, alpha) {

        let plane = new THREE.PlaneBufferGeometry(textWidth, textWidth * 2);
        let geometry = new THREE.InstancedBufferGeometry();
        THREE.BufferGeometry.prototype.copy.call(geometry, plane);

        let material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            map: new THREE.Texture(),
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
        vUv.x = (mod(textureID,12.0)+vUv.x)/12.0;
        vUv.y = (floor(textureID/12.0)+1.0-vUv.y)/6.0;
    
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

        return;

    }

    async function createCaptureMesh(textureID) {

        let plane = new THREE.PlaneBufferGeometry(captureWidth, captureWidth * 3 / 4);

        plane.translate(0, captureWidth / 2, 0)
        let geometry = new THREE.InstancedBufferGeometry();
        THREE.BufferGeometry.prototype.copy.call(geometry, plane);

        let material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            map: new THREE.Texture(),
        });

        let commonChunk = `
        attribute float textureID;
        #include <common>
        `
        let uvChunk = `
        #ifdef USE_UV
        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        vUv.x = (mod(textureID, 16.0)+vUv.x);
        vUv.y = (floor(textureID/16.0)+1.0-vUv.y);
        vUv = vUv/16.0;
        #endif
        `

        material.onBeforeCompile = function (shader) {
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', commonChunk)
                .replace('#include <uv_vertex>', uvChunk)
        };

        geometry.setAttribute('textureID', new THREE.InstancedBufferAttribute(new Uint8Array(textureID), 1));
        captureMesh = new THREE.InstancedMesh(geometry, material, textureID.length);
        scene.add(captureMesh);

        return;
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

        return
    }

    async function createMesh() {

        await setArray();

        async function getDeviceOrientation() {

            if (!isMobile) {
                initZoomControls();
                initRotateControls();
                return
            }
        
            if(!Boolean(window.DeviceOrientationEvent)){
                initZoomControls();
                initRotateControls();
                return
            }
        
            rotateControls = new DeviceOrientationControls(rotateCamera);
            await rotateControls.connect()
                    .then((value) => {
                        console.log("isEnableDeviceOrientation")
                        initZoomControls();
                        console.log("getDeviceOrientation fullfilled end")
                    }, (value) => {
                        initZoomControls();
                        initRotateControls();
                        console.log("getDeviceOrientation reject end")
                    })
            return;
        
        }

        await Promise.all([
            effect.startVideo().then(getDeviceOrientation()),
            createText(textTextureID, textAlpha),
            createCaptureMesh(captureTextureID)
        ])

        return;

    }

    let asciiAtlas;
    let texture;
    await Promise.all([
        createMesh(),
        createWhiteCube(),
        loadBasisUTexture("./basis/asciiAtlas1024.basis"),
        loadBasisUTexture("./basis/texture.basis"),

    ]).then((value) => {

        asciiAtlas = value[2];
        textMesh.material.map = asciiAtlas;
        effect.setAsciiTexture(asciiAtlas)
        texture = value[3];
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        captureMesh.material.map = texture;

    })

    console.log("create all")
    setCameraViewport();
    setObjectTransform();
    asciiMesh = effect.setAsciiMesh();
    scene.add(asciiMesh)

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);

    console.log("finish load CSV")
    return

}

function setBaseSize() {

    if (isMobile) {
        return;
    }

    cubeWidth = document.documentElement.clientWidth;
    cubeHeight = document.documentElement.clientHeight;
    cubeHalfWidth = cubeWidth / 2;
    cubeHalfHeight = cubeHeight / 2;

}

function setCameraViewport() {

    camera.fov = Math.atan(document.documentElement.clientHeight / document.documentElement.clientWidth) * 2 * 180 / Math.PI;
    camera.aspect = document.documentElement.clientWidth / document.documentElement.clientHeight;
    camera.updateProjectionMatrix();

    zoomCamera.fov = camera.fov;
    zoomCamera.aspect = camera.aspect;
    zoomCamera.updateProjectionMatrix();

    rotateCamera.fov = camera.fov;
    rotateCamera.aspect = camera.aspect;
    rotateCamera.updateProjectionMatrix();

}

function setObjectTransform() {

    mainLight.distance = cubeWidth;
    cube.scale.set(cubeWidth, cubeHeight, cubeWidth);
    pickplane.scale.set(cubeHalfWidth, cubeHalfHeight);
    pickplane.position.set(0, 0, -cubeHalfWidth);
    arrangeObjects(cubeWidth, cubeHeight);

}

function arrangeObjects(w, h) {

    const captureSum = displayURLs.length;
    const numPerWall = Math.ceil(captureSum / 3);
    const wallWidth = w * 0.92;
    const wallHeight = h * 0.92;
    const halfW = wallWidth / 2;
    const halfH = wallHeight / 2;
    const depth = w / 2;

    const tmpWallHeight = wallHeight * areaWidth / areaHeight;
    let edge = Math.sqrt(tmpWallHeight * wallWidth / numPerWall);
    let numPerWidth = Math.floor(wallWidth / edge);
    let numPerHeight = Math.floor(tmpWallHeight / edge);
    let tmpnum = numPerWidth * numPerHeight;

    while (tmpnum < numPerWall) {
        edge = edge - 0.1;
        numPerWidth = Math.floor(wallWidth / edge);
        if(numPerWidth*numPerHeight>=numPerWall){
            break;
        }
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

    let index;
    let counter = 0;

    for (let i = 0; i < displayURLs.length; i++) {
        matrix = matrix.identity();
        index = Math.floor(i / 3);

        rotateMtx.makeRotationY(Math.PI / 2 * (i % 3 + 1));
        translateMtx.makeTranslation(
            (index % numPerWidth) * spaceW - halfW + paddingX, 
            halfH - paddingY - Math.floor(index / numPerWidth) * spaceH,
             -depth);
        matrix.multiply(rotateMtx);
        matrix.multiply(translateMtx);
        matrix.multiply(scaleMtx);
        captureMesh.setMatrixAt(i, matrix);

        for (let j = 0; j < displayURLs[i].length; j++) {
            matrix2 = matrix2.identity();
            matrix2.multiply(matrix);
            matrix2.multiply(translateMtx.makeTranslation(
                (j % textPerRow) * textWidth - textBoxWidth / 2 + textWidth / 2, 
                -(Math.floor(j / textPerRow) * textHeight + textLineHeight),
                 0));
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