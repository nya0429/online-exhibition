import * as THREE from "https://unpkg.com/three@0.122.0/build/three.module.js";

let video2ascii = function (URLs,orgURLs,options) {

    let count = 0;

    const video = document.getElementById("video");
    const oCanvas = document.createElement("canvas");
    const oCtx = oCanvas.getContext("2d");

    const domElement = document.createElement('div');
    domElement.style.cursor = 'default';
    domElement.style.backgroundColor = '#000';    
    this.domElement = domElement;
    
    const oAscii = document.createElement("table");
    domElement.appendChild(oAscii);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer( { antialias: true, alpha:true, premultipliedAlpha:false} );
    renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer = renderer;
    let oImg = renderer.domElement;

    const urls = URLs;
    const orgurls = orgURLs;
    console.log(urls.length,orgurls.length)

    let charset = ".-_~:rvcsijtlf17xzunoeaypqhdbk0gwm4253689"
    let asciimap = new Array(charset.length);
    let asciinum = [];
    let enableKeysNum = 0;

    if (!options) options = {};
    let bResolution = !options['resolution'] ? 0.15 : options['resolution']; // Higher for more details
    let iScale = !options['scale'] ? 1 : options['scale'];
    let bColor = !options['color'] ? false : options['color']; // nice but slows down rendering!
    let bInvert = !options['invert'] ? false : options['invert']; // black is white, white is black
    let strResolution = 'low';

    let width, height;//window.innerWidth/innerHeight
    let iWidth, iHeight;

    let constraints = {
        audio:false,
        video: {
            facingMode:"user",
            width: width,
            height: height,
        },
    };


    let fResolution = 0.5;
    let fLetterSpacing = 0;
    
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
    
    setChar()
    createScene();
    setResolution();

    this.setSize = function (w, h) {
        width = Math.round(w);
        height = Math.round(h);
        console.log(width,height)
        initAsciiSize();
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
            audio:false,
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

    function createScene(){

        let texture = new THREE.VideoTexture( video );
        const vs =`
        varying vec2 vUv;
    
        void main()	{
    
            vUv = uv;
    
            gl_Position = vec4( position, 1.0 );
    
        }`;
        const fs =`
        varying vec2 vUv;
        uniform sampler2D map;
        uniform float charsetLength;
        uniform bool inv;
        //uniform int[] uIntArray;
    
        void main()	{
            vec4 color = texture2D(map, vUv);
            float fBrightness = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;
            fBrightness = inv ? fBrightness:1.0-fBrightness;
            gl_FragColor = vec4(color.rgb,fBrightness);
        }`;
    
        const geometry = new THREE.PlaneBufferGeometry( 2, 2 );
        let uniforms = {
            map: { value : texture},
            inv:{value:bInvert},
            charsetLength:{value:charset.length-1},
            //uIntArray:{value:[1,2,3]},
        };
    
        const material = new THREE.ShaderMaterial( {
    
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs,
    
        } );
    
        let mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );

    }
    function setChar(){

        for(let i = 0; i<charset.length; i++){
            asciimap[i] = [];
        }

        for (let i = 0; i < orgurls.length; ++i) {
            let orgurl = orgurls[i];
            for (let j = 0; j < orgurl.length; j++) {
                //let char = orgurl.charAt(j);
                let index = charset.indexOf(orgurl[j]);
                if (index > -1) {
                    asciimap[index].push(i)
                }
            }
        }

        for(let i = charset.length; i>0; i--){
            let num = asciimap[i-1].length;
            if(num == 0){
                charset = charset.replace(charset[i-1],"");
            }else{
                enableKeysNum += num;
                asciinum.push(num);
            }
        }

        asciimap = asciimap.filter(el=>el.length>0)

    }
    function setResolution() {

        switch (strResolution) {

            case "low": fResolution = 0.25; break;
            case "medium": fResolution = 0.5; break;
            case "high": fResolution = 1; break;

        }

        if (bResolution) fResolution = bResolution;

        if (strResolution == "low") {

            switch (iScale) {

                case 1: fLetterSpacing = - 1; break;
                case 2:
                case 3: fLetterSpacing = - 2.1; break;
                case 4: fLetterSpacing = - 3.1; break;
                case 5: fLetterSpacing = - 4.15; break;

            }

        }

        if (strResolution == "medium") {

            switch (iScale) {

                case 1: fLetterSpacing = 0; break;
                case 2: fLetterSpacing = - 1; break;
                case 3: fLetterSpacing = - 1.04; break;
                case 4:
                case 5: fLetterSpacing = - 2.1; break;

            }

        }

        if (strResolution == "high") {

            switch (iScale) {

                case 1:
                case 2: fLetterSpacing = 0; break;
                case 3:
                case 4:
                case 5: fLetterSpacing = - 1; break;

            }

        }
    }

    let strFont = "courier new, monospace";

    let fFontSize = (2 / fResolution) * iScale;
    let fLineHeight = ( 2 / fResolution ) * iScale;
    console.log(fResolution)

    function initAsciiSize() {

        iWidth = Math.round(width * fResolution);
        iHeight = Math.round(height * fResolution/2);

        oCanvas.width = iWidth;
        oCanvas.height = iHeight;
        //oCanvas.style.display = "none";

        renderer.setSize(iWidth,iHeight);

		oAscii.cellSpacing = 0;
        oAscii.cellPadding = 0;

        let oStyle = oAscii.style;
        oStyle.width = Math.round(iWidth / fResolution * iScale) + "px";
        oStyle.height = Math.round(iHeight / fResolution * iScale) + "px";
        oStyle.whiteSpace = "pre";
        oStyle.margin = "0px";
        oStyle.padding = "0px";
        oStyle.fontFamily = strFont;
        oStyle.fontSize = fFontSize + "px";
        oStyle.lineHeight = fLineHeight + "px";
        oStyle.letterSpacing = fLetterSpacing + "px";
        oStyle.textAlign = "left";
        oStyle.textDecoration = "none";
        oStyle.borderCollapse = 'separate';
        oStyle.borderSpacing = '0px';

    }

    this.asciifyImage = () => {

        count++;
        if(count%15!=0){
            return;
        }

        renderer.render(scene,camera);
        oCtx.clearRect(0, 0, iWidth, iHeight);
        oCtx.drawImage(oImg, 0, 0, iWidth, iHeight);
        let oImgData = oCtx.getImageData(0, 0, iWidth, iHeight).data;
        let strChars = "";

        // let counter = (new Array(charset.length)).fill(0);

        // let check = asciinum.concat();
        // let alphaArray = oImgData.filter(
        //     function(el,i){
        //         return i%4 === 3
        //     })
        // alphaArray.map(
        //     function(el,i){
        //         let iCharIdx = Math.floor(el/255 * (charset.length-1));
        //         return iCharIdx
        //     }
        // )

        // let mapped = Array.from(alphaArray)
        // .map(function(el, i){
        //     let iCharIdx = Math.floor((bInvert ? 1-el/255 : el/255)*(charset.length-1));
        //     counter[iCharIdx]++;
        //     return ({"index":i,"value":iCharIdx,"link":0});
        // })
        // .sort(function(a,b){
        //     return a.value - b.value;
        // });

        // console.log(mapped)

        // let pos = 0;
        // let over = 0;
        // for(let i = 0; i<asciimap.length; i++){

        //     let count = counter[i]+over;
        //     let enable = asciimap[i].length;

        //     for(let j = 0; j<Math.min(count,enable); j++){
        //         mapped[pos].value =i;
        //         mapped[pos].link =j;
        //         pos++;
        //     }

        //     if(count>enable){
        //         over = count-enable;
        //     }else{
        //         over = 0;
        //     }

        //     pos = enable;
        // }
        
        // mapped.sort(function(a,b){
        //     return a.index - b.index;
        // })

        // let charidx = mapped.map(function(el){
        //     return el.value;
        // });
        // let linkidx = mapped.map(function(el){
        //     return el.link;
        // });

        //console.time('rendering');

        for (let y = 0; y < iHeight; y++) {
            if(y != 0){
                strChars += "<br/>";
            }
            for (let x = 0; x < iWidth; x++) {

                let iOffset = (y * iWidth + x) * 4;
                
                let iRed = oImgData[iOffset];
                let iGreen = oImgData[iOffset + 1];
                let iBlue = oImgData[iOffset + 2];
                let iAlpha = oImgData[iOffset + 3];

                let iCharIdx = Math.floor(iAlpha/255 * (charset.length-1));
                let strThisChar = charset[iCharIdx];

                if (strThisChar === undefined || strThisChar == " ")
                    strThisChar = "&nbsp;";

                //console.log(iCharIdx,linkidx[iOffset])
                //let url = urls[asciimap[iCharIdx][linkidx[iOffset]]]
                let url = urls[asciimap[iCharIdx][Math.floor(Math.random() * asciimap[iCharIdx].length)]]

                if (bColor) {

                    strThisChar = "<span style='"
                        + "color:rgb(" + iRed + "," + iGreen + "," + iBlue + ");"
                        + "'>" + strThisChar + "</span>";

                } 

                strThisChar = '<a href=' + url + ' target="_blank">' + strThisChar + '</a>'
                strChars += strThisChar;

            }            
        }

        oAscii.innerHTML = "<tr><td>" + strChars + "</td></tr>";
        //console.timeEnd('rendering');

    }

    start();
}

export { video2ascii };
