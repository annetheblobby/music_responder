




// inspired by work done by Aaron Iker

$(document).ready(function () {

    document.body.addEventListener('click', init);
    var doc = document.body;
    doc.muted = true;
    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.


    function init() {

        document.body.innerHTML = document.body.innerHTML.replace("Click to meet blob", "Hello, I'm blob. I love listening to people's stories or just how their day was, so please talk to me. I also love music and shake my blobby body to whatever song plays :) I may get too excited and cause a reverb but you can turn your computer sound down if you don't want to hear me.");

        if (navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = function(constraints) {

                // First get ahold of the legacy getUserMedia, if present
                var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

                // Some browsers just don't implement it - return a rejected promise with an error
                // to keep a consistent interface
                if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                }

                // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
                return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
                });
            }
        }

        // Instantiate blob attributes
        let speedSlider = 13,
        spikesSlider = 0.6,
        processingSlider = 1;

        //retrieving canvas information 
        let $canvas = $('#blob canvas'),
            canvas = $canvas[0],
            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                context: canvas.getContext('webgl2'),
                antialias: true,
                alpha: true
            }),
            // define a new simplex noise - a noise gradient generator 
            simplex = new SimplexNoise();

        renderer.setSize($canvas.width(), $canvas.height());
        renderer.setPixelRatio(window.devicePixelRatio || 1);

        // set up scene and camera 
        let scene = new THREE.Scene();
        let camera = new THREE.PerspectiveCamera(40, $canvas.width() / $canvas.height(), 1, 1000);

        camera.position.z = 5;

        // size of blob
        let geometry = new THREE.SphereGeometry(1, 228, 228);
        geometry.applyMatrix(new THREE.Matrix4().makeScale(0.3, 0.3, 0.3));

        // 
        let material = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            shininess: 1,
            // wireframe: true
        });

        // Lighting 

        let lightTop = new THREE.DirectionalLight(0xfcb045, 0.8);
        lightTop.position.set(0, 500, 200);
        //lightTop.castShadow = true;
        scene.add(lightTop);

        let lightMid = new THREE.DirectionalLight(0xfd1d1d, 0.8);
        lightMid.position.set(0, 0, 300);
        //lightMid.castShadow = true;
        scene.add(lightMid);

        let lightBottom = new THREE.DirectionalLight(0x1642a8, 0.8);
        lightBottom.position.set(0, -500, 400);
        //lightBottom.castShadow = true;
        scene.add(lightBottom);

        let ambientLight = new THREE.AmbientLight(0x444444);
        scene.add(ambientLight);

        let sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);


        // update function
        let update = () => {
            let time = performance.now() * 0.00001 * speedSlider * Math.pow(processingSlider, 3),
                spikes = spikesSlider * processingSlider;
        
            for (let i = 0; i < sphere.geometry.vertices.length; i++) {
                let p = sphere.geometry.vertices[i];
                // use gradient to make the waves of the blob 
                p.normalize().multiplyScalar(1 + 0.3 * simplex.noise3D(p.x * spikes, p.y * spikes, p.z * spikes + time));
            }
            sphere.geometry.computeVertexNormals();
            sphere.geometry.normalsNeedUpdate = true;
            sphere.geometry.verticesNeedUpdate = true;
        };

        function animate() {
            update();
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);



        // set up forked web audio context, for multiple browsers
        // window. is needed otherwise Safari explodes
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        var analyser = audioCtx.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;

        var distortion = audioCtx.createWaveShaper();
        var gainNode = audioCtx.createGain();
        var biquadFilter = audioCtx.createBiquadFilter();
        var convolver = audioCtx.createConvolver();
        var drawVisual;

        if (navigator.mediaDevices.getUserMedia) {
            console.log('getUserMedia supported.');
            var constraints = {audio: true}
            navigator.mediaDevices.getUserMedia (constraints)
            .then(
                function(stream) {
                    source = audioCtx.createMediaStreamSource(stream);
                    source.connect(distortion);
                    distortion.connect(biquadFilter);
                    biquadFilter.connect(gainNode);
                    convolver.connect(gainNode);
                    gainNode.connect(analyser);
                    analyser.connect(audioCtx.destination);
                    visualize();
                    
                    // voiceChange();
            })
            .catch( function(err) { console.log('The following gUM error occured: ' + err);})
        } else {
            console.log('getUserMedia not supported on your browser!');
        }



        // visualizing using stream of media
        function visualize() {

            analyser.fftSize = 2048;
            var bufferLength = analyser.fftSize;
            console.log(bufferLength);
            var dataArray = new Uint8Array(bufferLength);

            var draw = function() {
                

                drawVisual = requestAnimationFrame(draw);

                analyser.getByteTimeDomainData(dataArray);

                for(var i = 0; i < bufferLength; i++) {

                    var v = dataArray[i] / 128.0;

                    if (v < 0.97){
                        speedSlider= v*3;
                    }
                    
                    if (v > 1){
                        // v += v/2;
                        // speedSlider= v*5;
                        sphere.scale.z= v*2, sphere.scale.y= v*2, sphere.scale.x= v*2;
                    }

                    processingSlider = v;
                    spikesSlider = v * 0.75;
                    // speedSlider= v * 10;
                    sphere.scale.z = v;
                    sphere.scale.x = v;
                    sphere.scale.y = v;
                    
                }

            };

            draw();
        }

    }
});
