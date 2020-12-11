import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";

let video2ascii = function (_charset, _asciiMap, options) {

    let count = 0;

    const video = document.getElementById("video");

    const oAscii = document.createElement('div');
    oAscii.style.cursor = 'default';
    oAscii.style.backgroundColor = '#000';
    this.domElement = oAscii;

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        premultipliedAlpha: false,
        depth:false,
        stencil:false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer = renderer;
    const webGLCtx = renderer.getContext();
    let oImgData = [];

    const charset = _charset;
    const asciiMap = _asciiMap;

    if (!options) options = {};
    let fResolution = !options['resolution'] ? 0.15 : options['resolution']; // Higher for more details
    let iScale = !options['scale'] ? 1 : options['scale'];
    let bColor = !options['color'] ? false : options['color']; // nice but slows down rendering!
    let bInvert = !options['invert'] ? false : options['invert']; // black is white, white is black

    let width, height;
    let iWidth = 0;
    let iHeight = 0;
    let iPixel = 0;

    let constraints = {
        audio: false,
        video: {
            facingMode: "user",
            width: width,
            height: height,
        },
    };


    //debug
    //oCanvas.style.position = "absolute"
    //oCanvas.style.left = "0px"
    //oCanvas.style.top = "0px"
    //oCanvas.style.zIndex = "3"
    //document.body.appendChild( oCanvas );

    //renderer.domElement.style.position = "absolute"
    //renderer.domElement.style.left = "200px"
    //renderer.domElement.style.top = "0px"
    //renderer.domElement.style.zIndex = "3"
    //document.body.appendChild( renderer.domElement );

    createScene();

    this.setSize = function (w, h) {
        width = Math.round(w);
        height = Math.round(h);
        console.log(width, height)
        setAsciiSize();
        start();

    };

    function start() {

        if (window.stream) {
            window.stream.getTracks().forEach(track => {
                track.stop();
            });
        }

        //let aspect = String(Math.round(width/height*100)/100);
        //console.log("aspect",aspect);
        constraints = {
            audio: false,
            video: {
                facingMode: "user",
                width: width,
                height: height,
                // aspectRatio: {exact: width/height},
                //aspectRatio: aspect,
            },
        };

        navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
    }
    function gotStream(stream) {
        window.stream = stream; // make stream available to console
        video.srcObject = stream;
    }
    function handleError(error) {
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    }

    function createScene() {

        let texture = new THREE.VideoTexture(video);
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
            map: { value: texture },
            inv: { value: bInvert },
            charsetLength: { value: charset.length - 1 },
        };

        const material = new THREE.RawShaderMaterial({

            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs,

        });

        let mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

    }

    let strFont = "'Roboto Mono', monospace";
    let fFontSize = (2 / fResolution) * iScale;
    initAsciiSize();

    let aNodeList = [];

    function initAsciiSize() {

        oAscii.cellSpacing = 0;
        oAscii.cellPadding = 0;

        let oStyle = oAscii.style;
        //oStyle.width = Math.round(iWidth / fResolution * iScale) + "px";
        //oStyle.height = Math.round(iHeight / fResolution * iScale) + "px";
        oStyle.whiteSpace = "pre";
        oStyle.margin = "0px";
        oStyle.padding = "0px";
        oStyle.fontFamily = strFont;
        oStyle.fontSize = fFontSize + "px";
        oStyle.lineHeight = 1;
        oStyle.textAlign = "left";
        oStyle.textDecoration = "none";
        oStyle.borderCollapse = 'separate';
        oStyle.borderSpacing = '0px';

    }

    const createAsciiElements=()=>{

        let preWidth = iWidth;
        let preHeight = iHeight;
        let prePixel = preWidth * preHeight;

        iWidth = Math.round(width * fResolution);
        iHeight = Math.round(height * fResolution / 2);
        iPixel = iWidth*iHeight;

        oImgData = new Uint8Array(4 * iPixel);

        renderer.setSize(iWidth, iHeight);

        console.log("Size", iWidth, iHeight,"preSize", preWidth, preHeight);
        console.log("pixel", iPixel,"prePixel", prePixel);

        let a,br;
        for (let i = prePixel; i < iPixel; i++) {
            a = document.createElement('a');
            a.target = "_blank"
            //a.id = "a" + i;
            oAscii.appendChild(a);
        }
        for (let i = preHeight+1; i < iHeight; i++) {
            br = document.createElement('br');
            oAscii.appendChild(br);
        }

        aNodeList = oAscii.getElementsByTagName('a');

    }

    const alignmentAsciiElements=()=>{
        //let aNodeList = oAscii.getElementsByTagName('a');
        let brNodeList = oAscii.getElementsByTagName('br');

        console.log("aListLength", aNodeList.length, "brListLength", brNodeList.length)

        for (let i = aNodeList.length - 1; i >= iPixel; i--) {
            aNodeList[i].remove();
        }
        for (let i = brNodeList.length - 1; i >= iHeight; i--) {
            brNodeList[i].remove();
        }

        for (let y = 1; y < iHeight; y++) {
            oAscii.insertBefore(brNodeList[y - 1], aNodeList[y * iWidth]);
        }
        brNodeList = [];
    }

    function setAsciiSize() {

        Promise.resolve(1) // まずPromiseの最初の呼び出し部分は引数渡すだけにする
            .then(createAsciiElements) // 次にthenで各非同期処理を呼び出す
            .then(alignmentAsciiElements)
            .catch(() => {console.log("onRejectted", v);});

    }

    let tmpMap = [];

    this.asciifyImage = () => {

        // count++;
        // if(count%100!=0){
        //     return;
        // }

        if(aNodeList.length == 0){
            return;
        }

        renderer.render(scene, camera);
        webGLCtx.readPixels(0, 0, webGLCtx.drawingBufferWidth, webGLCtx.drawingBufferHeight, webGLCtx.RGBA, webGLCtx.UNSIGNED_BYTE, oImgData);
        tmpMap = JSON.parse(JSON.stringify(asciiMap));

        let i,iOffset,iCharIdx,strThisChar;
        let tmplist,find,rand,color,span,atag;
        let charlength = charset.length - 1;
        let tmp = charlength/255;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                i = y * iWidth + x;
                iOffset = ((iHeight-y)*iWidth-x-1) * 4;
                iCharIdx = Math.floor(oImgData[iOffset + 3]*tmp);
                strThisChar = charset[iCharIdx];

                tmplist = tmpMap[iCharIdx];
                find = true;

                while (tmplist.length == 0) {
                    iCharIdx++;
                    if (iCharIdx >= tmpMap.length) {
                        find = false;
                        iCharIdx = charlength;
                        tmplist = asciiMap[iCharIdx];
                        break;
                    }
                    tmplist = tmpMap[iCharIdx];
                }

                rand = Math.floor(Math.random() * tmplist.length);
                color = "rgb("+oImgData[iOffset]+","+oImgData[iOffset+1]+","+oImgData[iOffset+2]+")";

                span = asciiMap[iCharIdx][rand].span;
                span.style.color = color;//重い
                span.style.fontWeight = "bold";
                span.tint = true;

                atag = aNodeList[i];
                atag.style.color = color;
                atag.href = tmplist[rand].url;
                atag.innerText = strThisChar;//重い

                if (find) {
                    tmplist.splice(rand,1);
                }
            }
        }
        tmpMap = [];
        resetSpanStyle();
    }

    function resetSpanStyle(){
        let map,obj;
        for(let i = 0; i<asciiMap.length; i++){
            map = asciiMap[i];
            for(let j = 0; j<map.length; j++){
                obj = map[j]
                if(obj.pretint && !obj.tint){
                    obj.span.removeAttribute('color')
                    obj.span.removeAttribute('font-weight')
                }
                obj.pretint = obj.tint;
                obj.tint = false;
            }
        }
    
    }

    start();
}

export { video2ascii };
