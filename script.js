import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import { TrackballControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.122.0/examples/jsm/renderers/CSS3DRenderer.js';
import { video2ascii } from "./video2ascii.js";
import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";

let camera, controls, scene, renderer, box;
let CSSrenderer, CSSscene;
let walls = [];
let effect;
//ffmpeg -i input.webp -vcodec png output.png

const padding = 0.9;
const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp(marks, "g");

let dist = window.innerHeight;

let wallwidth = window.innerWidth;
let wallheight = window.innerHeight;
let boxScale = new THREE.Vector3(window.innerWidth / 2, window.innerHeight * 2, window.innerWidth / 2);

const displayURLs = [];
const linkURLs = [];

let stats;
let charset = ".-_~:/?=&rvcsijtlf17xzunoeaypqhdbk0gwm4253689ABCDEFGHIJKLMNOPQRSTUVWXYZ#"
let asciiMap = [];

init();

function init() {

    getCSV();
    debug();

    const container = document.getElementById('container');

    let deg = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera = new THREE.PerspectiveCamera(deg, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0.0000000000000001, 0, 0)
    camera.lookAt(-1, 0, 0)
    //camera.position.set(300,750,800);
    //camera.lookAt(0,0,1)

    CSSscene = new THREE.Scene();
    CSSrenderer = new CSS3DRenderer();
    CSSrenderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(CSSrenderer.domElement);

    //controls = new TrackballControls( camera, CSSrenderer.domElement );
    controls = new OrbitControls(camera, CSSrenderer.domElement);
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI / 2;

    createWhiteCube();

    //let frame = document.createElement('img');
    //frame.className = 'frame2'
    //frame.src = "./material/frame.png";
    //frame.width = window.innerWidth / 2 * 1.1;
    //frame.height = window.innerHeight / 2;

    // const object = new CSS3DObject( effect.domElement );
    // object.rotation.y = Math.PI/2;
    // object.position.set( -window.innerWidth/2,0,0);
    // CSSscene.add(object);

    window.addEventListener('resize', onWindowResize, false);

    //effect.asciifyImage();

}

function onWindowResize() {

    effect.setSize(window.innerWidth / 2, window.innerHeight / 2);
    CSSrenderer.setSize(window.innerWidth, window.innerHeight);

    camera.fov = Math.atan(window.innerHeight / window.innerWidth) * 2 * 180 / Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    for (let i = 0; i < walls.length; i++) {
        walls[i].style.width = window.innerWidth * padding + 'px';
        walls[i].style.height = window.innerHeight * 1.5 + 'px';
    }

    for (let obj in CSSscene.children) {
        CSSscene.children[obj].position.normalize().multiplyScalar(window.innerWidth / 2)
    }

    box.scale.set(boxScale.x, boxScale.y, boxScale.z);
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    stats.begin();

    effect.asciifyImage();
    controls.update();
    CSSrenderer.render(CSSscene, camera);
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);

}

function getCSV() {
    var req = new XMLHttpRequest();
    req.open("get", "./online_exhibition_list.csv", true);
    req.send(null);
    req.onload = function () {
        window.addEventListener('load', loadURLs(req.responseText));
    }
}

function createWhiteCube() {

    renderer = new THREE.WebGLRenderer({
        depth:false,
        stencil:false,
    });
    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-1"

    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    console.log(window.innerWidth)
    let geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    let material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    box = new THREE.Mesh(geometry, material);
    box.scale.set(boxScale.x, boxScale.y, boxScale.z);
    //box.scale.set(window.innerWidth*10, window.innerHeight*10, window.innerWidth*10);
    scene.add(box);

    // lights
    let mainLight = new THREE.PointLight(0xcccccc, 2, 1600);
    mainLight.position.y = 60;
    scene.add(mainLight);

    document.body.appendChild(renderer.domElement);

}

function loadURLs(csvstr) {

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

    let urls = csvstr.split("\n");
    let asciinum = 0;
    let capture, artwork, caption, frame, span;

    for (let i = 0; i < urls.length; ++i) {

        let col = urls[i].split(",");
        let displayURL = col[0];
        let linkURL = col[1];

        displayURLs[i] = displayURL;
        linkURLs[i] = linkURL;

        asciinum += col[0].length

        capture = document.createElement('img');
        capture.className = 'capture'
        capture.src = "./img/" + displayURL.replace(regExp, '') + ".png";

        // frame = document.createElement('img');
        // frame.className = 'frame'
        // frame.src = "./material/frame.png";

        //artwork = document.createElement('div');
        //artwork.className = 'artwork'
        //artwork.appendChild(frame)
        //artwork.appendChild(capture)

        caption = document.createElement('div');
        caption.className = 'caption'
        caption.id = 'caption' + i;

        for (let j = 0; j < displayURL.length; j++) {

            span = document.createElement('span');
            span.className = 'captionChar';
            span.innerText = displayURL[j];
            caption.appendChild(span);

            let index = charset.indexOf(displayURL[j]);
            let obj = {
                url: linkURL,
                span: span,
                tint:false,
                pretint:false,
            }
            asciiMap[index].push(obj)
            if (index == -1) {
                console.log("not found ", obj);
            }
        }
        let work = document.createElement('div');
        work.className = 'work'
        //walls[i].style.contentVisibility = "auto"

        work.appendChild(capture)
        work.appendChild(caption)
        walls[i % 3].appendChild(work);

    }
    for (let i = charset.length; i > 0; i--) {
        let num = asciiMap[i - 1].length;
        if (num == 0) {
            charset = charset.replace(charset[i - 1], "");
        }
    }

    asciiMap = asciiMap.filter(el => el.length > 0)

    console.log("using ascii sum", asciinum)
    urls = [];

    const w = window.innerWidth / 2

    const object1 = new CSS3DObject(walls[0]);
    object1.rotation.y = -Math.PI / 2;
    object1.position.set(w, 0, 0);
    CSSscene.add(object1);

    const object2 = new CSS3DObject(walls[1]);
    object2.position.set(0, 0, -w);
    CSSscene.add(object2);

    const object3 = new CSS3DObject(walls[2]);
    object3.rotation.y = Math.PI;
    object3.position.set(0, 0, w);
    CSSscene.add(object3);

    effect = new video2ascii(charset, asciiMap, { color: true, invert: true });
    effect.setSize(window.innerWidth / 2, window.innerHeight / 2);

    let div = document.createElement('div')
    //div.appendChild(frame)
    div.appendChild(effect.domElement);
    const object = new CSS3DObject(div);
    object.rotation.y = Math.PI / 2;
    object.position.set(-window.innerWidth / 2, 0, 0);
    CSSscene.add(object);

    animate();

}

function debug() {

    stats = new Stats();
    document.body.appendChild(stats.dom);

    // let str = "its all here."
    // str = toAngou(str)
    // str = toChar(str)
    // console.log(str)

}

function toAngou(str) {    // 暗号化
    let key = 1;    // ずらす数
    let str2 = "";
    str = escape(str);    // コード化
    for (let nn = 0; nn < str.length; ++nn) {
        let cd = str.charAt(nn).charCodeAt() + key;    // コードをずらす
        if (cd >= 0x7f)
            cd = cd - 0x5f;
        str2 = str2 + String.fromCharCode(cd);
    }
    return str2;
}

function toChar(str) {    // 復号化
    let key = 1;
    let str2 = "";
    for (let nn = 0; nn < str.length; ++nn) {
        let cd = str.charAt(nn).charCodeAt();    // コードをずらす
        if (cd <= 0x1f)
            cd = cd + 0x5f;
        str2 = str2 + String.fromCharCode(cd);
    }
    str2 = unescape(str2);    // コード化
    return str2;
}
