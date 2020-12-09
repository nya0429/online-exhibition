import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import { TrackballControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.122.0/examples/jsm/renderers/CSS3DRenderer.js';
import { video2ascii } from "./video2ascii.js";

let camera, controls, scene, renderer,box;
let CSSrenderer,CSSscene;
let divs = [];
let CSS3Dobject = [];

let cameraWidth = 1280;
let cameraHeight = 720;

let effect;

const padding = 0.9;
const marks = '[\\/:*?"<>|]+';
const regExp = new RegExp( marks, "g" );

let dist = window.innerHeight;

let wallwidth = window.innerWidth;
let wallheight = window.innerHeight;
let boxScale = new THREE.Vector3(window.innerWidth/2,window.innerHeight*2,window.innerWidth/2);

getCSV();

function getCSV(){
    var req = new XMLHttpRequest();
    req.open("get", "./online_exhibition_list.csv", true);
    req.send(null);
    req.onload = function(){
        window.addEventListener('load', init(req.responseText));
    }
}
 
function init(csvstr) {

    let str = "its all here."
    str = toAngou(str)
    str = toChar(str)
    console.log(str)

    const container = document.getElementById( 'container' ); 

    let deg = Math.atan(window.innerHeight/window.innerWidth)*2 * 180/Math.PI;

    camera = new THREE.PerspectiveCamera( deg, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set(0.0000000000000001,0,0)
    camera.lookAt(-1,0,0)
    //camera.position.set(300,750,800);
    //camera.lookAt(0,0,1)

    CSSscene = new THREE.Scene();
    CSSrenderer = new CSS3DRenderer();
    CSSrenderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( CSSrenderer.domElement );

    let urls = csvstr.split("\n");
    let orgurls = [];
    let asciinum = 0;
    for (let i = 0; i < urls.length; ++i) {
        let col = urls[i].split(",");
        orgurls[i] = col[0]
        urls[i] = col[1]
        asciinum += col[0].length
    }
    console.log("using ascii num",asciinum)

    createWalls(urls,orgurls);

    effect = new video2ascii(urls,orgurls,{color:true,invert: true});
    effect.setSize(window.innerWidth/2,window.innerHeight/2);

    let frame = document.createElement('img');
    frame.className = 'frame2'
    frame.src = "./material/frame.png";
    frame.width = window.innerWidth/2*1.1;
    frame.height = window.innerHeight/2;

    // const object = new CSS3DObject( effect.domElement );
    // object.rotation.y = Math.PI/2;
    // object.position.set( -window.innerWidth/2,0,0);
    // CSSscene.add(object);

    let div = document.createElement('div')
    //div.appendChild(frame)
    div.appendChild(effect.domElement);
    const object = new CSS3DObject( div );
    object.rotation.y = Math.PI/2;
    object.position.set( -window.innerWidth/2,0,0);
    CSSscene.add(object);
   
    //controls = new TrackballControls( camera, CSSrenderer.domElement );

    controls = new OrbitControls( camera, CSSrenderer.domElement );
    //controls.maxPolarAngle = Math.PI / 2;
    //controls.minPolarAngle = Math.PI / 2;

    createWhiteCube();
    
    window.addEventListener( 'resize', onWindowResize, false );

    //effect.asciifyImage();

    animate();

}

function onWindowResize() {

    effect.setSize(window.innerWidth/2,window.innerHeight/2);
    CSSrenderer.setSize( window.innerWidth, window.innerHeight );

    camera.fov = Math.atan(window.innerHeight/window.innerWidth)* 2 * 180/Math.PI;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    for(let i = 0; i<divs.length; i++){
        divs[i].style.width = window.innerWidth* padding+'px';
        divs[i].style.height = window.innerHeight* 1.5+'px';
    }

    for(let obj in CSSscene.children){
        CSSscene.children[obj].position.normalize().multiplyScalar(window.innerWidth/2)
    }

    box.scale.set(boxScale.x,boxScale.y,boxScale.z);
    renderer.setSize(window.innerWidth,window.innerHeight);

}

function animate() {

    requestAnimationFrame( animate );

    effect.asciifyImage();
    controls.update();
    CSSrenderer.render( CSSscene, camera );
    renderer.render( scene, camera );

}

function toAngou(str){    // 暗号化
    let key = 1;    // ずらす数
    let str2 = "";
    str = escape(str);    // コード化
    for(let nn = 0; nn < str.length; ++nn){
        let cd = str.charAt(nn).charCodeAt() + key;    // コードをずらす
        if(cd >= 0x7f)
            cd = cd - 0x5f;
        str2 = str2 + String.fromCharCode(cd);
    }
    return str2;
}

function toChar(str){    // 復号化
    let key = 1;
    let str2 = "";
    for(let nn = 0; nn < str.length; ++nn){
        let cd = str.charAt(nn).charCodeAt();    // コードをずらす
        if(cd <= 0x1f)
            cd = cd + 0x5f;
        str2 = str2 + String.fromCharCode(cd);
    }
    str2 = unescape(str2);    // コード化
    return str2;
}

function createWhiteCube(){

    renderer = new THREE.WebGLRenderer();
    renderer.domElement.id = "background"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.left = "0px"
    renderer.domElement.style.top = "0px"
    renderer.domElement.style.zIndex = "-1"

    renderer.setSize(window.innerWidth,window.innerHeight);
    scene = new THREE.Scene();
    console.log(window.innerWidth)
    let geometry = new THREE.BoxBufferGeometry( 1,1,1);
    let material = new THREE.MeshPhongMaterial( { color: 0xffffff ,side:THREE.DoubleSide} );
    box = new THREE.Mesh(geometry,material);
    box.scale.set(boxScale.x,boxScale.y,boxScale.z);
    //box.scale.set(window.innerWidth*10, window.innerHeight*10, window.innerWidth*10);
    scene.add(box);
   
    // lights
    let mainLight = new THREE.PointLight( 0xcccccc, 2, 1600 );
    mainLight.position.y = 60;
    scene.add( mainLight );

    document.body.appendChild( renderer.domElement );

}

function createWalls(urls,orgurls){

    for(let i = 0; i<3; i++){
        divs[i] = document.createElement('div');
        divs[i].className = 'wall';
        divs[i].style.width = window.innerWidth * padding+'px';
        divs[i].style.height = window.innerHeight * 1.5+'px';
    }

    for(let j = 0; j<3; j++){
    for(let i = 0; i<urls.length; i++){
        
        let capture = document.createElement( 'img' );
        capture.className = 'capture'
        // console.log(urls[i].replace(regExp,''));
        capture.src = "./img/" + orgurls[i].replace(regExp,'') + ".png";

        let frame = document.createElement('img');
        frame.className = 'frame'
        frame.src = "./material/frame.png";

        let artwork = document.createElement('div');
        artwork.className = 'artwork'
        //artwork.appendChild(frame)
        artwork.appendChild(capture)

        let caption = document.createElement( 'div' );
        caption.className = 'caption'
        caption.textContent = orgurls[i];

        let work = document.createElement( 'div' );
        work.className = 'work'
        work.appendChild(artwork)
        work.appendChild(caption)
        divs[i%3].appendChild( work );
        
    }
}

    const w = window.innerWidth/2

    const object1 = new CSS3DObject( divs[0] );
    object1.rotation.y = -Math.PI/2;
    object1.position.set( w,0,0 );
    CSSscene.add(object1);

    const object2 = new CSS3DObject( divs[1] );
    object2.position.set( 0,0,-w );
    CSSscene.add(object2);

    const object3 = new CSS3DObject( divs[2] );
    object3.rotation.y = Math.PI;
    object3.position.set( 0,0,w );
    CSSscene.add(object3);

}
