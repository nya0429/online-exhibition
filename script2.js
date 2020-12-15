//import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";
import * as THREE from "./node_modules/three/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js";
import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";
import { GUI } from './node_modules/three/examples/jsm/libs/dat.gui.module.js';

var camera, scene, renderer, stats, texture;

var mesh;

var dummy = new THREE.Object3D();

var amount = 8;
var count = Math.pow(amount, 3);

let charset = ".-_~:/?=&rvcsijtlf17xzunoeaypqhdbk0gwm4253689ABCDEFGHIJKLMNOPQRSTUVWXYZ#"

init();
animate();



function init() {


    renderer = new THREE.WebGLRenderer({ antialias: false }); // false improves the frame rate
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(0, 0, 20);

    createCanvasTexture();

    let geometry = new THREE.PlaneBufferGeometry(0.5, 1);
    var instanceColors = [];
    var instanceUV = [];

    //console.log(geometry);
    console.log(geometry.attributes.uv);

    for (var i = 0; i < count; i++) {

        instanceColors.push(Math.random());
        instanceColors.push(Math.random());
        instanceColors.push(Math.random());

        let num = Math.floor(Math.random() * 4);
        //console.log(num);
        instanceUV.push(num);

    }

    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(new Float32Array(instanceColors), 3));
    geometry.setAttribute('instanceUV', new THREE.InstancedBufferAttribute(new Float32Array(instanceUV), 1));

    geometry.computeVertexNormals();

    geometry.scale(0.5, 0.5, 0.5);

    console.log(geometry)

    //console.log( geometry );

    var material = new THREE.MeshBasicMaterial({
        color: 0xaaaaff,
        map: texture,
        side: THREE.DoubleSide,
    });

    var colorParsChunk = [
        'attribute vec3 instanceColor;',
        'varying vec3 vInstanceColor;',
        'attribute float instanceUV;',
        '#include <common>'
    ].join('\n');

    var instanceColorChunk = [
        '#include <begin_vertex>',
        '\tvInstanceColor = instanceColor;'
    ].join('\n');

    var fragmentParsChunk = [
        'varying vec3 vInstanceColor;',
        '#include <common>'
    ].join('\n');

    var colorChunk = [
        'vec4 diffuseColor = vec4( diffuse * vInstanceColor, opacity );'
    ].join('\n');

    var uvChunk = [
        '#ifdef USE_UV',
        'vUv = ( uvTransform * vec3( uv, 1 ) ).xy;',
        'vUv.x = (instanceUV+vUv.x)/'+charset.length+'.0;',
        '#endif'
        
    ].join('\n')

    // var mapChunk = `
    // #ifdef USE_MAP
    // //vec2 uv = vec2(vInstanceColor.x,vUv.y);
    // //vec2 uv = vec2((vUv.x+vTextureID)/4.0,vUv.y);
	// vec4 texelColor = texture2D( map, vUv );
	// texelColor = mapTexelToLinear( texelColor );
	// diffuseColor *= texelColor;
    // #endif
    // `
    material.onBeforeCompile = function (shader) {

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', colorParsChunk)
            .replace('#include <uv_vertex>', uvChunk)
            .replace('#include <begin_vertex>', instanceColorChunk);

        // shader.fragmentShader = shader.fragmentShader
        //      .replace('#include <common>', fragmentParsChunk)
        //      .replace('#include <map_fragment>', mapChunk)

        // //     .replace('vec4 diffuseColor = vec4( diffuse, opacity );', colorChunk);

        //console.log( shader.uniforms );
        //console.log(shader.vertexShader);
        //console.log( shader.fragmentShader );

    };

    mesh = new THREE.InstancedMesh(geometry, material, count);

    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // will be updated every frame

    scene.add(mesh);


    stats = new Stats();
    document.body.appendChild(stats.dom);

    //

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    requestAnimationFrame(animate);

    render();

    stats.update();

}

function render() {

    if (mesh) {

        var time = Date.now() * 0.001;

        mesh.rotation.x = Math.sin(time / 4);
        mesh.rotation.y = Math.sin(time / 2);

        var i = 0;
        var offset = (amount - 1) / 2;

        for (var x = 0; x < amount; x++) {

            for (var y = 0; y < amount; y++) {

                for (var z = 0; z < amount; z++) {

                    dummy.position.set(offset - x, offset - y, offset - z);
                    dummy.rotation.y = (Math.sin(x / 4 + time) + Math.sin(y / 4 + time) + Math.sin(z / 4 + time));
                    dummy.rotation.z = dummy.rotation.y * 2;

                    dummy.updateMatrix();

                    mesh.setMatrixAt(i++, dummy.matrix);

                }

            }

        }

        mesh.instanceMatrix.needsUpdate = true;

    }

    renderer.render(scene, camera);

}

function createCanvasTexture() {

    let oCanvas = document.createElement('canvas');
    let oCtx = oCanvas.getContext('2d');
    let fontsize = 48;
    oCanvas.height = fontsize;
    oCtx.font = "48px monospace";
    oCanvas.width = oCtx.measureText(charset).width;
    oCtx.font = "48px monospace";
    oCtx.fillStyle = "rgb(0, 0, 255)";
    oCtx.textBaseline = "top";
    oCtx.textAlign = "left";
    oCtx.fillText(charset, 0, 0,oCanvas.width);
    document.body.appendChild(oCanvas)
    texture = new THREE.CanvasTexture(oCanvas);

}
