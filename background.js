/**
 * Dark Geometric Texture Background
 * ===================================
 * Подключение:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
 *   <script src="background.js"></script>
 *
 * Скрипт автоматически создаёт canvas-элемент с z-index: -1,
 * который служит анимированным фоном для любой страницы.
 */
(function() {
    // ============================================================
    // AUTO-SETUP: создаём canvas и стили автоматически
    // ============================================================
    var canvas = document.createElement('canvas');
    canvas.id = 'geo-bg-canvas';
    canvas.style.cssText = 'display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    // Убедимся что body имеет прозрачный фон (чтобы canvas был виден)
    if (!document.body.style.background && !document.body.style.backgroundColor) {
        document.body.style.backgroundColor = 'transparent';
    }

    // Для pointer-events мы используем отдельный overlay, чтобы ловить мышь
    var interactionOverlay = document.createElement('div');
    interactionOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;';
    document.body.insertBefore(interactionOverlay, canvas.nextSibling);

    // ============================================================
    // SEEDED PRNG - deterministic, always same layout
    // ============================================================
    function mulberry32(seed) {
        return function() {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    var rng = mulberry32(77742);

    // ============================================================
    // CANVAS & RENDERER SETUP
    // ============================================================
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.FogExp2(0x020202, 0.00022);

    var frustumSize = 1100;
    var aspect = window.innerWidth / window.innerHeight;

    var camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        5000
    );
    camera.position.set(0, 2000, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, -1);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // ============================================================
    // LIGHTING SYSTEM
    // ============================================================
    var ambientLight = new THREE.AmbientLight(0x111111, 0.06);
    scene.add(ambientLight);

    var spotLight = new THREE.SpotLight(0xffeedd, 3.2);
    spotLight.position.set(400, 950, -350);
    spotLight.target.position.set(0, 0, 0);
    spotLight.angle = Math.PI / 3.0;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1.0;
    spotLight.distance = 4000;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 4096;
    spotLight.shadow.mapSize.height = 4096;
    spotLight.shadow.camera.near = 50;
    spotLight.shadow.camera.far = 3500;
    spotLight.shadow.bias = -0.0003;
    spotLight.shadow.normalBias = 0.02;
    spotLight.shadow.radius = 2;
    scene.add(spotLight);
    scene.add(spotLight.target);

    var redLight = new THREE.SpotLight(0xff1a1a, 2.4);
    redLight.position.set(-450, 850, 380);
    redLight.target.position.set(0, 0, 0);
    redLight.angle = Math.PI / 3.2;
    redLight.penumbra = 0.55;
    redLight.decay = 1.1;
    redLight.distance = 3800;
    redLight.castShadow = true;
    redLight.shadow.mapSize.width = 2048;
    redLight.shadow.mapSize.height = 2048;
    redLight.shadow.camera.near = 50;
    redLight.shadow.camera.far = 3500;
    redLight.shadow.bias = -0.0003;
    redLight.shadow.normalBias = 0.02;
    redLight.shadow.radius = 2;
    scene.add(redLight);
    scene.add(redLight.target);

    var blueLight = new THREE.SpotLight(0x0044ff, 1.8);
    blueLight.position.set(200, 900, 500);
    blueLight.target.position.set(0, 0, 0);
    blueLight.angle = Math.PI / 3.5;
    blueLight.penumbra = 0.6;
    blueLight.decay = 1.2;
    blueLight.distance = 3500;
    blueLight.castShadow = true;
    blueLight.shadow.mapSize.width = 1024;
    blueLight.shadow.mapSize.height = 1024;
    blueLight.shadow.camera.near = 50;
    blueLight.shadow.camera.far = 3500;
    blueLight.shadow.bias = -0.0003;
    blueLight.shadow.normalBias = 0.02;
    blueLight.shadow.radius = 2;
    scene.add(blueLight);
    scene.add(blueLight.target);

    var purpleLight = new THREE.PointLight(0x6600aa, 1.2, 3000, 1.5);
    purpleLight.position.set(-300, 600, -400);
    scene.add(purpleLight);

    var rimLight = new THREE.PointLight(0xff6600, 0.8, 2500, 1.8);
    rimLight.position.set(0, 100, 0);
    scene.add(rimLight);

    var spotOrigin = { x: 400, z: -350 };
    var redOrigin = { x: -450, z: 380 };
    var blueOrigin = { x: 200, z: 500 };
    var purpleOrigin = { x: -300, z: -400 };
    var swayRadius = 80;
    var swaySpeed = 0.1;

    // ============================================================
    // MOUSE TRACKING (через document, чтобы работало поверх контента)
    // ============================================================
    var mouseWorldX = 99999;
    var mouseWorldZ = 99999;
    var mouseOnCanvas = false;
    var mouseVelX = 0;
    var mouseVelZ = 0;
    var prevMouseWorldX = 99999;
    var prevMouseWorldZ = 99999;

    document.addEventListener('mousemove', function(e) {
        mouseOnCanvas = true;
        var ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        var ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
        prevMouseWorldX = mouseWorldX;
        prevMouseWorldZ = mouseWorldZ;
        mouseWorldX = ndcX * (frustumSize * aspect / 2);
        mouseWorldZ = -ndcY * (frustumSize / 2);
        mouseVelX = mouseWorldX - prevMouseWorldX;
        mouseVelZ = mouseWorldZ - prevMouseWorldZ;
    });

    document.addEventListener('mouseleave', function() {
        mouseOnCanvas = false;
        mouseVelX = 0;
        mouseVelZ = 0;
    });

    document.addEventListener('touchmove', function(e) {
        var t = e.touches[0];
        mouseOnCanvas = true;
        var ndcX = (t.clientX / window.innerWidth) * 2 - 1;
        var ndcY = -(t.clientY / window.innerHeight) * 2 + 1;
        prevMouseWorldX = mouseWorldX;
        prevMouseWorldZ = mouseWorldZ;
        mouseWorldX = ndcX * (frustumSize * aspect / 2);
        mouseWorldZ = -ndcY * (frustumSize / 2);
        mouseVelX = mouseWorldX - prevMouseWorldX;
        mouseVelZ = mouseWorldZ - prevMouseWorldZ;
    }, { passive: true });

    document.addEventListener('touchend', function() {
        mouseOnCanvas = false;
        mouseVelX = 0;
        mouseVelZ = 0;
    });

    // ============================================================
    // DELAUNAY TRIANGULATION
    // ============================================================
    function delaunayTriangulation(points) {
        var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
        points.forEach(function(p) {
            minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
            maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y);
        });
        var dx = maxx - minx, dy = maxy - miny;
        var midX = (minx + maxx) / 2, midY = (miny + maxy) / 2;
        var superTri = [
            { x: midX - 10 * dx, y: midY - 10 * dy },
            { x: midX + 10 * dx, y: midY - 10 * dy },
            { x: midX, y: midY + 10 * dy }
        ];
        var triangles = [{ a: superTri[0], b: superTri[1], c: superTri[2], points: [superTri[0], superTri[1], superTri[2]] }];

        points.forEach(function(point) {
            var bad = [];
            triangles.forEach(function(tri) {
                var a = tri.a, b = tri.b, c = tri.c;
                var d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
                if (Math.abs(d) < 1e-10) return;
                var ux = ((a.x*a.x+a.y*a.y)*(b.y-c.y)+(b.x*b.x+b.y*b.y)*(c.y-a.y)+(c.x*c.x+c.y*c.y)*(a.y-b.y))/d;
                var uy = ((a.x*a.x+a.y*a.y)*(c.x-b.x)+(b.x*b.x+b.y*b.y)*(a.x-c.x)+(c.x*c.x+c.y*c.y)*(b.x-a.x))/d;
                var circumRadius = Math.hypot(a.x - ux, a.y - uy);
                if (Math.hypot(point.x - ux, point.y - uy) < circumRadius) bad.push(tri);
            });
            var edges = [];
            bad.forEach(function(tri) {
                var triEdges = [[tri.a,tri.b],[tri.b,tri.c],[tri.c,tri.a]];
                triEdges.forEach(function(edge) {
                    var useOrig = edge[0].x < edge[1].x || (Math.abs(edge[0].x-edge[1].x)<1e-10 && edge[0].y<edge[1].y);
                    var sorted = useOrig ? [edge[0],edge[1]] : [edge[1],edge[0]];
                    var found = false;
                    for (var i=0;i<edges.length;i++) {
                        if (Math.abs(edges[i][0].x-sorted[0].x)<1e-10&&Math.abs(edges[i][0].y-sorted[0].y)<1e-10&&
                            Math.abs(edges[i][1].x-sorted[1].x)<1e-10&&Math.abs(edges[i][1].y-sorted[1].y)<1e-10) {
                            edges.splice(i,1); found=true; break;
                        }
                    }
                    if (!found) edges.push(sorted);
                });
            });
            triangles = triangles.filter(function(t){return !bad.includes(t);});
            edges.forEach(function(e){
                triangles.push({a:e[0],b:e[1],c:point,points:[e[0],e[1],point]});
            });
        });
        return triangles.filter(function(t){
            return !t.points.some(function(p){
                return superTri.some(function(s){return Math.abs(p.x-s.x)<1e-8&&Math.abs(p.y-s.y)<1e-8;});
            });
        });
    }

    // ============================================================
    // POLYGON HELPERS
    // ============================================================
    function isConvex(pts){var n=pts.length;if(n<3)return false;var sign=0;for(var i=0;i<n;i++){var a=pts[i],b=pts[(i+1)%n],c=pts[(i+2)%n];var cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)<1e-6)continue;if(sign===0){sign=cross>0?1:-1;}else if((cross>0?1:-1)!==sign)return false;}return sign!==0;}
    function orderPoints(pts){var cx=pts.reduce(function(s,p){return s+p.x;},0)/pts.length;var cy=pts.reduce(function(s,p){return s+p.y;},0)/pts.length;return pts.slice().sort(function(a,b){return Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx);});}
    function polygonArea(pts){var area=0;for(var i=0;i<pts.length;i++){var j=(i+1)%pts.length;area+=pts[i].x*pts[j].y-pts[j].x*pts[i].y;}return Math.abs(area)/2;}
    function polygonPerimeter(pts){var p=0;for(var i=0;i<pts.length;i++){var j=(i+1)%pts.length;p+=Math.hypot(pts[j].x-pts[i].x,pts[j].y-pts[i].y);}return p;}
    function isReasonableShape(pts){var area=polygonArea(pts);var perimeter=polygonPerimeter(pts);if(perimeter===0)return false;return(4*Math.PI*area)/(perimeter*perimeter)>0.15;}
    function edgeKey(a,b){var ax=a.x.toFixed(4),ay=a.y.toFixed(4),bx=b.x.toFixed(4),by=b.y.toFixed(4);if(ax<bx||(ax===bx&&ay<by))return ax+','+ay+'-'+bx+','+by;return bx+','+by+'-'+ax+','+ay;}
    function insetPolygon(pts,amount){var cx=pts.reduce(function(s,p){return s+p.x;},0)/pts.length;var cy=pts.reduce(function(s,p){return s+p.y;},0)/pts.length;return pts.map(function(p){return{x:p.x+(cx-p.x)*amount,y:p.y+(cy-p.y)*amount};});}

    // ============================================================
    // MERGE TRIANGLES INTO POLYGONS
    // ============================================================
    function mergeTriangles(triangles){
        var edgeToTris={};
        triangles.forEach(function(tri,idx){var pts=tri.points;for(var i=0;i<3;i++){var key=edgeKey(pts[i],pts[(i+1)%3]);if(!edgeToTris[key])edgeToTris[key]=[];edgeToTris[key].push(idx);}});
        var used=new Set();var polygons=[];
        var indexes=triangles.map(function(_,i){return i;});
        for(var i=indexes.length-1;i>0;i--){var j=Math.floor(rng()*(i+1));var temp=indexes[i];indexes[i]=indexes[j];indexes[j]=temp;}

        for(var idx_i=0;idx_i<indexes.length;idx_i++){
            var idx=indexes[idx_i];if(used.has(idx))continue;
            var pts=triangles[idx].points;var neighbors=[];
            for(var i=0;i<3;i++){var key=edgeKey(pts[i],pts[(i+1)%3]);var adj=edgeToTris[key];if(adj){for(var ai=0;ai<adj.length;ai++){var nIdx=adj[ai];if(nIdx!==idx&&!used.has(nIdx))neighbors.push({nIdx:nIdx});}}}

            if(neighbors.length===0){used.add(idx);polygons.push(orderPoints(pts.slice()));continue;}
            var done=false;

            if(neighbors.length>=2&&rng()<0.35){
                for(var a=0;a<neighbors.length&&!done;a++){
                    for(var b=a+1;b<neighbors.length&&!done;b++){
                        if(used.has(neighbors[a].nIdx)||used.has(neighbors[b].nIdx))continue;
                        var allPts=new Map();var addPoint=function(p){var k=p.x.toFixed(4)+','+p.y.toFixed(4);if(!allPts.has(k))allPts.set(k,p);};
                        pts.forEach(addPoint);triangles[neighbors[a].nIdx].points.forEach(addPoint);triangles[neighbors[b].nIdx].points.forEach(addPoint);
                        var unique=[];allPts.forEach(function(v){unique.push(v);});
                        if(unique.length===5){var ordered=orderPoints(unique);if(isConvex(ordered)&&isReasonableShape(ordered)){used.add(idx);used.add(neighbors[a].nIdx);used.add(neighbors[b].nIdx);polygons.push(ordered);done=true;}}
                    }
                }
            }
            if(done)continue;

            if(rng()<0.5){
                var shuffled=neighbors.slice();for(var i=shuffled.length-1;i>0;i--){var j=Math.floor(rng()*(i+1));var temp=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=temp;}
                for(var si=0;si<shuffled.length;si++){
                    var nIdx=shuffled[si].nIdx;if(used.has(nIdx))continue;
                    var allPts=new Map();var addPoint=function(p){var k=p.x.toFixed(4)+','+p.y.toFixed(4);if(!allPts.has(k))allPts.set(k,p);};
                    pts.forEach(addPoint);triangles[nIdx].points.forEach(addPoint);
                    var unique=[];allPts.forEach(function(v){unique.push(v);});
                    if(unique.length===4){var ordered=orderPoints(unique);if(isConvex(ordered)&&isReasonableShape(ordered)){used.add(idx);used.add(nIdx);polygons.push(ordered);done=true;break;}}
                }
            }
            if(!done&&!used.has(idx)){used.add(idx);polygons.push(orderPoints(pts.slice()));}
        }
        return polygons;
    }

    // ============================================================
    // DETERMINISTIC POINT GENERATION
    // ============================================================
    function generatePoints(){
        var spread=1400,points=[],gridStep=180;
        for(var gx=-spread;gx<=spread;gx+=gridStep){for(var gy=-spread;gy<=spread;gy+=gridStep){points.push({x:gx+(rng()-0.5)*gridStep*0.72,y:gy+(rng()-0.5)*gridStep*0.72});}}
        return points;
    }

    // ============================================================
    // ANIMATED BLOCKS STORAGE
    // ============================================================
    var animatedBlocks = [];

    // ============================================================
    // PARTICLE SYSTEM
    // ============================================================
    var particleCount=600;var particlePositions=new Float32Array(particleCount*3);var particleSpeeds=[];var particlePhases=[];var particleSizes=new Float32Array(particleCount);
    for(var i=0;i<particleCount;i++){particlePositions[i*3]=(rng()-0.5)*3000;particlePositions[i*3+1]=rng()*400+10;particlePositions[i*3+2]=(rng()-0.5)*3000;particleSpeeds.push({x:(rng()-0.5)*0.3,y:(rng()-0.5)*0.15,z:(rng()-0.5)*0.3});particlePhases.push(rng()*Math.PI*2);particleSizes[i]=1.5+rng()*3.0;}
    var particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));particleGeometry.setAttribute('size',new THREE.BufferAttribute(particleSizes,1));
    var particleMaterial=new THREE.PointsMaterial({color:0x222233,size:2.5,transparent:true,opacity:0.15,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false});
    var particleSystem=new THREE.Points(particleGeometry,particleMaterial);scene.add(particleSystem);

    // ============================================================
    // EMBER SYSTEM
    // ============================================================
    var emberCount=200;var emberPositions=new Float32Array(emberCount*3);var emberSpeeds=[];var emberPhases=[];var emberColors=new Float32Array(emberCount*3);
    for(var i=0;i<emberCount;i++){emberPositions[i*3]=(rng()-0.5)*2800;emberPositions[i*3+1]=rng()*300+20;emberPositions[i*3+2]=(rng()-0.5)*2800;emberSpeeds.push({x:(rng()-0.5)*0.15,y:0.05+rng()*0.2,z:(rng()-0.5)*0.15});emberPhases.push(rng()*Math.PI*2);var warmth=rng();if(warmth<0.4){emberColors[i*3]=0.8+rng()*0.2;emberColors[i*3+1]=0.1+rng()*0.15;emberColors[i*3+2]=0.0;}else if(warmth<0.7){emberColors[i*3]=0.6+rng()*0.3;emberColors[i*3+1]=0.3+rng()*0.2;emberColors[i*3+2]=0.0;}else{emberColors[i*3]=0.2+rng()*0.2;emberColors[i*3+1]=0.1+rng()*0.1;emberColors[i*3+2]=0.5+rng()*0.4;}}
    var emberGeometry=new THREE.BufferGeometry();emberGeometry.setAttribute('position',new THREE.BufferAttribute(emberPositions,3));emberGeometry.setAttribute('color',new THREE.BufferAttribute(emberColors,3));
    var emberMaterial=new THREE.PointsMaterial({size:1.8,transparent:true,opacity:0.25,vertexColors:true,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false});
    var emberSystem=new THREE.Points(emberGeometry,emberMaterial);scene.add(emberSystem);

    // ============================================================
    // VOLUMETRIC LIGHT RAYS
    // ============================================================
    var rayCount=8;var lightRays=[];
    for(var i=0;i<rayCount;i++){var rayWidth=30+rng()*80;var rayHeight=800+rng()*400;var rayGeo=new THREE.PlaneGeometry(rayWidth,rayHeight);var rayMat=new THREE.MeshBasicMaterial({color:i<4?0xffeedd:(i<6?0xff2222:0x2244ff),transparent:true,opacity:0.008+rng()*0.012,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});var rayMesh=new THREE.Mesh(rayGeo,rayMat);var angle=(i/rayCount)*Math.PI*2+rng()*0.5;var dist=100+rng()*300;rayMesh.position.set(Math.cos(angle)*dist,rayHeight/2-50,Math.sin(angle)*dist);rayMesh.rotation.y=angle+Math.PI/2;rayMesh.rotation.z=(rng()-0.5)*0.15;scene.add(rayMesh);lightRays.push({mesh:rayMesh,baseOpacity:rayMat.opacity,phase:rng()*Math.PI*2,speed:0.2+rng()*0.3,rotSpeed:(rng()-0.5)*0.01});}

    // ============================================================
    // GROUND FOG LAYERS
    // ============================================================
    var fogPlaneGeo=new THREE.PlaneGeometry(4000,4000,1,1);var fogPlaneMat=new THREE.MeshBasicMaterial({color:0x050508,transparent:true,opacity:0.3,side:THREE.DoubleSide,blending:THREE.NormalBlending,depthWrite:false});var fogPlane=new THREE.Mesh(fogPlaneGeo,fogPlaneMat);fogPlane.rotation.x=-Math.PI/2;fogPlane.position.y=0.5;scene.add(fogPlane);
    var fogPlane2Geo=new THREE.PlaneGeometry(3500,3500,1,1);var fogPlane2Mat=new THREE.MeshBasicMaterial({color:0x030306,transparent:true,opacity:0.15,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});var fogPlane2=new THREE.Mesh(fogPlane2Geo,fogPlane2Mat);fogPlane2.rotation.x=-Math.PI/2;fogPlane2.position.y=5;scene.add(fogPlane2);

    // ============================================================
    // EDGE GLOW LINES
    // ============================================================
    var groundLineCount=40;var groundLines=[];
    for(var i=0;i<groundLineCount;i++){var lineVerts=[];var segments=10+Math.floor(rng()*20);var startX=(rng()-0.5)*2400;var startZ=(rng()-0.5)*2400;var dirX=(rng()-0.5);var dirZ=(rng()-0.5);var len=Math.hypot(dirX,dirZ);var ndx=dirX/len;var ndz=dirZ/len;var totalLen=100+rng()*400;for(var s=0;s<=segments;s++){var t=s/segments;lineVerts.push(startX+ndx*totalLen*t+(rng()-0.5)*15,0.3,startZ+ndz*totalLen*t+(rng()-0.5)*15);}var lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(lineVerts,3));var colorChoice=rng();var lineColor=colorChoice<0.4?0x110808:(colorChoice<0.7?0x080811:0x0a0a0a);var lineMat=new THREE.LineBasicMaterial({color:lineColor,transparent:true,opacity:0.2+rng()*0.15,blending:THREE.AdditiveBlending});var lineMesh=new THREE.Line(lineGeo,lineMat);scene.add(lineMesh);groundLines.push({mesh:lineMesh,phase:rng()*Math.PI*2,speed:0.1+rng()*0.3,baseOpacity:lineMat.opacity});}

    // ============================================================
    // RINGS
    // ============================================================
    var ringCount=5;var rings=[];
    for(var i=0;i<ringCount;i++){var innerR=200+i*180+rng()*50;var outerR=innerR+2+rng()*3;var ringGeo=new THREE.RingGeometry(innerR,outerR,64);var ringMat=new THREE.MeshBasicMaterial({color:0x111115,transparent:true,opacity:0.06+rng()*0.04,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});var ringMesh=new THREE.Mesh(ringGeo,ringMat);ringMesh.rotation.x=-Math.PI/2;ringMesh.position.y=1+i*0.5;scene.add(ringMesh);rings.push({mesh:ringMesh,baseScale:1.0,phase:rng()*Math.PI*2,speed:0.05+rng()*0.1,pulseAmount:0.02+rng()*0.03});}

    // ============================================================
    // HEXAGONAL GRID
    // ============================================================
    var hexGridLines=[];var hexRadius=120;var hexSpacing=hexRadius*1.75;
    for(var row=-12;row<=12;row++){for(var col=-14;col<=14;col++){var offsetX=(row%2===0)?0:hexSpacing*0.5;var cx=col*hexSpacing+offsetX;var cz=row*hexRadius*1.5;if(Math.hypot(cx,cz)>1500)continue;if(rng()<0.6)continue;var hexVerts=[];for(var h=0;h<=6;h++){var angle=(Math.PI/3)*h+Math.PI/6;hexVerts.push(cx+Math.cos(angle)*hexRadius*0.4,0.2,cz+Math.sin(angle)*hexRadius*0.4);}var hexGeo=new THREE.BufferGeometry();hexGeo.setAttribute('position',new THREE.Float32BufferAttribute(hexVerts,3));var hexMat=new THREE.LineBasicMaterial({color:0x0a0a12,transparent:true,opacity:0.08+rng()*0.06,blending:THREE.AdditiveBlending});var hexLine=new THREE.LineLoop(hexGeo,hexMat);scene.add(hexLine);hexGridLines.push({mesh:hexLine,phase:rng()*Math.PI*2,speed:0.15+rng()*0.2,baseOpacity:hexMat.opacity,cx:cx,cz:cz});}}

    // ============================================================
    // BUILD MAIN GEOMETRIC SCENE
    // ============================================================
    function buildScene(){
        var toRemove=[];scene.traverse(function(child){if(child.userData&&child.userData.isBlock)toRemove.push(child);});
        toRemove.forEach(function(obj){scene.remove(obj);if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(function(m){m.dispose();});else obj.material.dispose();}});
        animatedBlocks.length=0;
        var points=generatePoints();
        var ep=1800;var edgePts=[];var edgeSteps=10;
        for(var i=0;i<=edgeSteps;i++){var t=-ep+(2*ep*i/edgeSteps);edgePts.push({x:t,y:-ep});edgePts.push({x:t,y:ep});edgePts.push({x:-ep,y:t});edgePts.push({x:ep,y:t});}
        var allPts=points.concat(edgePts);var triangles=delaunayTriangulation(allPts);
        var visible=triangles.filter(function(t){return t.points.some(function(p){return p.x>=-1700&&p.x<=1700&&p.y>=-1700&&p.y<=1700;});});
        var polygons=mergeTriangles(visible);

        var baseGeo=new THREE.PlaneGeometry(6000,6000);var baseMat=new THREE.MeshStandardMaterial({color:0x010101,roughness:0.95,metalness:0.0});var baseMesh=new THREE.Mesh(baseGeo,baseMat);baseMesh.rotation.x=-Math.PI/2;baseMesh.position.y=-0.5;baseMesh.receiveShadow=true;baseMesh.userData.isBlock=true;scene.add(baseMesh);

        for(var pi=0;pi<polygons.length;pi++){
            var rawPts=polygons[pi];var n=rawPts.length;var pts=insetPolygon(rawPts,0.02);
            var r=rng();var polyHeight;
            if(r<0.25)polyHeight=3+rng()*10;else if(r<0.50)polyHeight=14+rng()*28;else if(r<0.75)polyHeight=38+rng()*45;else polyHeight=75+rng()*80;
            var baseY=0;var topY=polyHeight;
            var cx=pts.reduce(function(s,p){return s+p.x;},0)/n;var cz=pts.reduce(function(s,p){return s+(-p.y);},0)/n;
            var vertices=[];var faceIndices=[];
            for(var i=0;i<n;i++)vertices.push(pts[i].x-cx,topY,-pts[i].y-cz);
            for(var i=0;i<n;i++)vertices.push(pts[i].x-cx,baseY,-pts[i].y-cz);
            for(var i=1;i<n-1;i++)faceIndices.push(0,i,i+1);
            for(var i=1;i<n-1;i++)faceIndices.push(n,n+i+1,n+i);
            var sideStart=vertices.length/3;
            for(var i=0;i<n;i++){var i2=(i+1)%n;var vi=sideStart+i*4;vertices.push(pts[i].x-cx,topY,-pts[i].y-cz);vertices.push(pts[i2].x-cx,topY,-pts[i2].y-cz);vertices.push(pts[i].x-cx,baseY,-pts[i].y-cz);vertices.push(pts[i2].x-cx,baseY,-pts[i2].y-cz);faceIndices.push(vi,vi+2,vi+1);faceIndices.push(vi+1,vi+2,vi+3);}
            var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(faceIndices);geo.computeVertexNormals();

            var matVariant=rng();var blockColor,blockRoughness,blockMetalness;
            if(matVariant<0.3){blockColor=0x000000;blockRoughness=0.35+rng()*0.25;blockMetalness=0.15+rng()*0.22;}
            else if(matVariant<0.5){blockColor=new THREE.Color(0.02,0.01,0.005);blockRoughness=0.4+rng()*0.3;blockMetalness=0.1+rng()*0.15;}
            else if(matVariant<0.7){blockColor=new THREE.Color(0.005,0.005,0.02);blockRoughness=0.3+rng()*0.2;blockMetalness=0.2+rng()*0.25;}
            else if(matVariant<0.85){blockColor=new THREE.Color(0.01,0.01,0.01);blockRoughness=0.15+rng()*0.15;blockMetalness=0.5+rng()*0.3;}
            else{var tc=rng();if(tc<0.33)blockColor=new THREE.Color(0.03,0.005,0.005);else if(tc<0.66)blockColor=new THREE.Color(0.005,0.005,0.03);else blockColor=new THREE.Color(0.02,0.005,0.03);blockRoughness=0.25+rng()*0.2;blockMetalness=0.3+rng()*0.3;}

            var mat=new THREE.MeshStandardMaterial({color:blockColor,roughness:blockRoughness,metalness:blockMetalness,flatShading:true});
            var mesh=new THREE.Mesh(geo,mat);mesh.position.set(cx,0,cz);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.isBlock=true;scene.add(mesh);

            var edgeVerts=[];for(var i=0;i<n;i++){var j=(i+1)%n;edgeVerts.push(pts[i].x-cx,topY+0.12,-pts[i].y-cz);edgeVerts.push(pts[j].x-cx,topY+0.12,-pts[j].y-cz);}
            var edgeGeo=new THREE.BufferGeometry();edgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(edgeVerts,3));
            var edgeMat=new THREE.LineBasicMaterial({color:0x111111,transparent:true,opacity:0.4});
            var edgeLine=new THREE.LineSegments(edgeGeo,edgeMat);edgeLine.position.set(cx,0,cz);edgeLine.userData.isBlock=true;scene.add(edgeLine);

            var bottomEdgeVerts=[];for(var i=0;i<n;i++){var j=(i+1)%n;bottomEdgeVerts.push(pts[i].x-cx,baseY-0.05,-pts[i].y-cz);bottomEdgeVerts.push(pts[j].x-cx,baseY-0.05,-pts[j].y-cz);}
            var bottomEdgeGeo=new THREE.BufferGeometry();bottomEdgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(bottomEdgeVerts,3));
            var bottomEdgeMat=new THREE.LineBasicMaterial({color:0x080808,transparent:true,opacity:0.2});
            var bottomEdgeLine=new THREE.LineSegments(bottomEdgeGeo,bottomEdgeMat);bottomEdgeLine.position.set(cx,0,cz);bottomEdgeLine.userData.isBlock=true;scene.add(bottomEdgeLine);

            if(polyHeight>50){var vertEdgeVerts=[];for(var i=0;i<n;i++){vertEdgeVerts.push(pts[i].x-cx,baseY,-pts[i].y-cz);vertEdgeVerts.push(pts[i].x-cx,topY,-pts[i].y-cz);}var vertEdgeGeo=new THREE.BufferGeometry();vertEdgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertEdgeVerts,3));var vertEdgeMat=new THREE.LineBasicMaterial({color:0x0a0a0a,transparent:true,opacity:0.15});var vertEdgeLine=new THREE.LineSegments(vertEdgeGeo,vertEdgeMat);vertEdgeLine.position.set(cx,0,cz);vertEdgeLine.userData.isBlock=true;scene.add(vertEdgeLine);}

            var distFromCenter=Math.hypot(cx,cz);var maxDist=1800;var delayFactor=distFromCenter/maxDist;
            var personalityRoll=rng();var breathSpeed,breathAmount,scaleSpeed,scaleAmount;
            if(personalityRoll<0.2){breathSpeed=0.15+rng()*0.1;breathAmount=1.5+polyHeight*0.02;scaleSpeed=0.08+rng()*0.07;scaleAmount=0.002+rng()*0.002;}
            else if(personalityRoll<0.5){breathSpeed=0.25+rng()*0.2;breathAmount=2.5+polyHeight*0.04;scaleSpeed=0.15+rng()*0.15;scaleAmount=0.003+rng()*0.004;}
            else if(personalityRoll<0.8){breathSpeed=0.35+rng()*0.3;breathAmount=3.0+polyHeight*0.05;scaleSpeed=0.2+rng()*0.2;scaleAmount=0.004+rng()*0.005;}
            else{breathSpeed=0.5+rng()*0.4;breathAmount=4.0+polyHeight*0.06;scaleSpeed=0.25+rng()*0.25;scaleAmount=0.005+rng()*0.007;}

            animatedBlocks.push({mesh:mesh,edgeLine:edgeLine,bottomEdgeLine:bottomEdgeLine,polyHeight:polyHeight,cx:cx,cz:cz,numSides:n,
                dropDelay:delayFactor*2.0+rng()*0.5,dropDuration:0.7+rng()*0.35,dropFrom:350+rng()*250,dropDone:false,
                breathSpeed:breathSpeed,breathAmount:breathAmount,breathPhase:rng()*Math.PI*2,
                breathSpeed2:breathSpeed*1.7+rng()*0.2,breathAmount2:breathAmount*0.3,breathPhase2:rng()*Math.PI*2,
                scaleSpeed:scaleSpeed,scaleAmount:scaleAmount,scalePhase:rng()*Math.PI*2,
                currentMouseLift:0,currentMouseTilt:0,targetMouseTilt:0,
                colorPulseSpeed:0.1+rng()*0.3,colorPulsePhase:rng()*Math.PI*2,colorPulseAmount:0.005+rng()*0.01,
                baseColor:mat.color.clone(),
                rotSpeed:(rng()-0.5)*0.005,rotAmount:(rng()-0.5)*0.003,rotPhase:rng()*Math.PI*2,
                waveDelay:distFromCenter*0.002,glowIntensity:0});
        }
    }

    buildScene();

    // ============================================================
    // EASING FUNCTIONS
    // ============================================================
    function easeOutBack(t){var c1=1.70158;var c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);}
    function easeOutCubic(t){return 1-Math.pow(1-t,3);}
    function clamp(val,min,max){return Math.max(min,Math.min(max,val));}
    function lerp(a,b,t){return a+(b-a)*t;}

    // ============================================================
    // WAVE SYSTEM
    // ============================================================
    var waves=[];var nextWaveTime=3;var waveInterval=5;
    function createWave(ox,oz,speed,amplitude,decay){waves.push({originX:ox,originZ:oz,speed:speed,amplitude:amplitude,decay:decay,time:0,maxRadius:2000,active:true});}
    function updateWaves(dt){for(var i=waves.length-1;i>=0;i--){waves[i].time+=dt;if(waves[i].time*waves[i].speed>waves[i].maxRadius)waves.splice(i,1);}}
    function getWaveHeight(x,z){var total=0;for(var i=0;i<waves.length;i++){var w=waves[i];var dist=Math.hypot(x-w.originX,z-w.originZ);var radius=w.time*w.speed;var delta=Math.abs(dist-radius);var width=150;if(delta<width){var envelope=1-delta/width;var decay=Math.exp(-w.time*w.decay);total+=Math.sin(dist*0.05-w.time*5)*w.amplitude*envelope*decay;}}return total;}

    // ============================================================
    // PULSE SYSTEM
    // ============================================================
    var pulses=[];var nextPulseTime=7;
    function createPulse(x,z,color,radius,speed){pulses.push({x:x,z:z,color:new THREE.Color(color),maxRadius:radius,speed:speed,currentRadius:0,active:true});}
    function updatePulses(dt){for(var i=pulses.length-1;i>=0;i--){pulses[i].currentRadius+=pulses[i].speed*dt;if(pulses[i].currentRadius>pulses[i].maxRadius)pulses.splice(i,1);}}
    function getPulseInfluence(x,z){var totalInfluence=0;var pulseColor=null;for(var i=0;i<pulses.length;i++){var p=pulses[i];var dist=Math.hypot(x-p.x,z-p.z);var delta=Math.abs(dist-p.currentRadius);var width=120;if(delta<width){var envelope=1-delta/width;var fade=1-p.currentRadius/p.maxRadius;var inf=envelope*fade*0.5;totalInfluence+=inf;if(!pulseColor)pulseColor=p.color.clone();}}return{influence:totalInfluence,color:pulseColor};}

    // ============================================================
    // NOISE FUNCTIONS
    // ============================================================
    function simpleNoise(x,y,t){return(Math.sin(x*0.01+t*0.3)*Math.cos(y*0.013+t*0.2)+Math.sin(x*0.023+y*0.017+t*0.15)*0.5+Math.cos(x*0.007-y*0.011+t*0.4)*0.3)/1.8;}
    function fbmNoise(x,y,t,octaves){var value=0,amplitude=1,frequency=1,totalAmplitude=0;for(var i=0;i<octaves;i++){value+=simpleNoise(x*frequency,y*frequency,t)*amplitude;totalAmplitude+=amplitude;amplitude*=0.5;frequency*=2;}return value/totalAmplitude;}

    // ============================================================
    // POST-PROCESSING OVERLAYS
    // ============================================================
    var vignetteOverlay=document.createElement('div');
    vignetteOverlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:0;background:radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%);';
    document.body.appendChild(vignetteOverlay);

    var scanlineOverlay=document.createElement('div');
    scanlineOverlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:0;opacity:0.03;background:repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px);';
    document.body.appendChild(scanlineOverlay);

    // ============================================================
    // CONSTELLATIONS
    // ============================================================
    var constellations=[];
    function buildConstellations(){
        var tallBlocks=animatedBlocks.filter(function(b){return b.polyHeight>40;});
        var maxConnDist=350;
        for(var i=0;i<tallBlocks.length;i++){var a=tallBlocks[i];var connections=0;
            for(var j=i+1;j<tallBlocks.length;j++){if(connections>=2)break;var b=tallBlocks[j];var dist=Math.hypot(a.cx-b.cx,a.cz-b.cz);
                if(dist<maxConnDist&&dist>50){var lineVerts=new Float32Array([a.cx,a.polyHeight+2,a.cz,b.cx,b.polyHeight+2,b.cz]);var lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(lineVerts,3));var lineMat=new THREE.LineBasicMaterial({color:0x0a0810,transparent:true,opacity:0.06,blending:THREE.AdditiveBlending,depthWrite:false});var lineMesh=new THREE.LineSegments(lineGeo,lineMat);lineMesh.userData.isBlock=true;scene.add(lineMesh);constellations.push({mesh:lineMesh,blockA:a,blockB:b,baseOpacity:0.06,phase:Math.random()*Math.PI*2,speed:0.2+Math.random()*0.3});connections++;}}}
    }
    buildConstellations();

    // ============================================================
    // FLOATING SHAPES
    // ============================================================
    var floatingShapes=[];
    for(var i=0;i<15;i++){var shapeGeo;var shapeType=Math.floor(rng()*5);if(shapeType===0)shapeGeo=new THREE.TetrahedronGeometry(8+rng()*12,0);else if(shapeType===1)shapeGeo=new THREE.OctahedronGeometry(6+rng()*10,0);else if(shapeType===2)shapeGeo=new THREE.IcosahedronGeometry(5+rng()*8,0);else if(shapeType===3)shapeGeo=new THREE.DodecahedronGeometry(7+rng()*9,0);else shapeGeo=new THREE.BoxGeometry(6+rng()*10,6+rng()*10,6+rng()*10);
        var shapeMat=new THREE.MeshStandardMaterial({color:0x020204,roughness:0.2+rng()*0.3,metalness:0.4+rng()*0.4,transparent:true,opacity:0.3+rng()*0.3,wireframe:rng()<0.4});
        var shapeMesh=new THREE.Mesh(shapeGeo,shapeMat);var angle=rng()*Math.PI*2;var dist=200+rng()*800;shapeMesh.position.set(Math.cos(angle)*dist,100+rng()*300,Math.sin(angle)*dist);shapeMesh.rotation.set(rng()*Math.PI*2,rng()*Math.PI*2,rng()*Math.PI*2);scene.add(shapeMesh);
        floatingShapes.push({mesh:shapeMesh,orbitRadius:dist,orbitAngle:angle,orbitSpeed:(rng()-0.5)*0.02,bobSpeed:0.2+rng()*0.4,bobAmount:10+rng()*30,bobPhase:rng()*Math.PI*2,baseY:shapeMesh.position.y,rotSpeedX:(rng()-0.5)*0.01,rotSpeedY:(rng()-0.5)*0.015,rotSpeedZ:(rng()-0.5)*0.008,scalePhase:rng()*Math.PI*2,scaleSpeed:0.1+rng()*0.2,scaleAmount:0.05+rng()*0.1});}

    // ============================================================
    // GRID FLOOR
    // ============================================================
    var gridSize=3000;var gridDivisions=30;var gridStep=gridSize/gridDivisions;var gridVertices=[];
    for(var i=-gridDivisions/2;i<=gridDivisions/2;i++){var pos=i*gridStep;gridVertices.push(-gridSize/2,-0.3,pos);gridVertices.push(gridSize/2,-0.3,pos);gridVertices.push(pos,-0.3,-gridSize/2);gridVertices.push(pos,-0.3,gridSize/2);}
    var gridGeo=new THREE.BufferGeometry();gridGeo.setAttribute('position',new THREE.Float32BufferAttribute(gridVertices,3));var gridMat=new THREE.LineBasicMaterial({color:0x050508,transparent:true,opacity:0.04,blending:THREE.AdditiveBlending,depthWrite:false});var gridMesh=new THREE.LineSegments(gridGeo,gridMat);scene.add(gridMesh);

    // ============================================================
    // AUDIO VIS BARS
    // ============================================================
    var audioVisBars=[];
    for(var i=0;i<32;i++){var angle=(i/32)*Math.PI*2;var barGeo=new THREE.BoxGeometry(4,1,4);var barMat=new THREE.MeshBasicMaterial({color:0x080812,transparent:true,opacity:0.08,blending:THREE.AdditiveBlending,depthWrite:false});var barMesh=new THREE.Mesh(barGeo,barMat);barMesh.position.set(Math.cos(angle)*600,0.5,Math.sin(angle)*600);barMesh.rotation.y=-angle;scene.add(barMesh);audioVisBars.push({mesh:barMesh,angle:angle,maxHeight:40+rng()*60,freqMult:0.5+(i/32)*3,phase:rng()*Math.PI*2,baseOpacity:0.08});}

    // ============================================================
    // MAIN ANIMATION LOOP
    // ============================================================
    var startTime=performance.now();var lastFrameTime=startTime;

    function animate(){
        requestAnimationFrame(animate);
        var now=performance.now();var dt=Math.min((now-lastFrameTime)/1000,0.05);lastFrameTime=now;
        var elapsed=(now-startTime)/1000;
        var globalBreathPhase=elapsed*0.15;

        // LIGHT ANIMATION
        spotLight.position.x=spotOrigin.x+Math.sin(elapsed*swaySpeed)*swayRadius;
        spotLight.position.z=spotOrigin.z+Math.cos(elapsed*swaySpeed*0.7)*swayRadius*0.6;
        spotLight.intensity=3.2+Math.sin(elapsed*0.15)*0.3;
        redLight.position.x=redOrigin.x+Math.sin(elapsed*swaySpeed*0.8+2)*swayRadius*0.7;
        redLight.position.z=redOrigin.z+Math.cos(elapsed*swaySpeed*0.6+1)*swayRadius*0.5;
        redLight.intensity=2.4+Math.sin(elapsed*0.4)*0.4;
        blueLight.position.x=blueOrigin.x+Math.sin(elapsed*swaySpeed*0.9+3.5)*swayRadius*0.5;
        blueLight.position.z=blueOrigin.z+Math.cos(elapsed*swaySpeed*0.5+2.1)*swayRadius*0.8;
        blueLight.intensity=1.8+Math.sin(elapsed*0.35+1.2)*0.3;
        purpleLight.position.x=purpleOrigin.x+Math.sin(elapsed*0.07)*150;
        purpleLight.position.z=purpleOrigin.z+Math.cos(elapsed*0.09)*120;
        purpleLight.intensity=1.2+Math.sin(elapsed*0.25)*0.3;
        rimLight.intensity=0.8+Math.sin(elapsed*0.3+0.5)*0.2;
        ambientLight.intensity=0.06+Math.sin(elapsed*0.1)*0.01;

        // WAVES & PULSES
        updateWaves(dt);updatePulses(dt);
        if(elapsed>nextWaveTime){createWave(Math.sin(elapsed*0.13)*400,Math.cos(elapsed*0.17)*400,300,8+Math.sin(elapsed)*3,0.3);nextWaveTime=elapsed+waveInterval+Math.sin(elapsed*0.7)*2;}
        if(mouseOnCanvas&&Math.abs(mouseVelX)+Math.abs(mouseVelZ)>30&&Math.random()<0.1)createWave(mouseWorldX,mouseWorldZ,250,12,0.5);
        if(elapsed>nextPulseTime){var pulseColors=[0xff1111,0x1111ff,0x6611aa,0xff6600,0x00aaff];createPulse(Math.sin(elapsed*0.11)*500,Math.cos(elapsed*0.13)*500,pulseColors[Math.floor(elapsed*0.3)%pulseColors.length],1500,200);nextPulseTime=elapsed+8+Math.sin(elapsed*0.5)*3;}

        // BLOCK ANIMATION
        for(var bi=0;bi<animatedBlocks.length;bi++){
            var block=animatedBlocks[bi];
            if(!block.dropDone){
                var dropTime=elapsed-block.dropDelay;
                if(dropTime<0){block.mesh.position.y=block.dropFrom;block.edgeLine.position.y=block.dropFrom;block.bottomEdgeLine.position.y=block.dropFrom;block.mesh.scale.set(0.75,0.75,0.75);block.edgeLine.scale.set(0.75,0.75,0.75);block.bottomEdgeLine.scale.set(0.75,0.75,0.75);block.mesh.material.opacity=0;block.mesh.material.transparent=true;continue;}
                var t=Math.min(dropTime/block.dropDuration,1);var eased=easeOutBack(t);var yOffset=block.dropFrom*(1-eased);
                block.mesh.position.y=yOffset;block.edgeLine.position.y=yOffset;block.bottomEdgeLine.position.y=yOffset;
                var scaleT=easeOutCubic(t);var s=0.75+0.25*scaleT;block.mesh.scale.set(s,s,s);block.edgeLine.scale.set(s,s,s);block.bottomEdgeLine.scale.set(s,s,s);
                block.mesh.material.transparent=true;block.mesh.material.opacity=Math.min(t*2,1);
                if(t>=1){block.dropDone=true;block.mesh.position.y=0;block.edgeLine.position.y=0;block.bottomEdgeLine.position.y=0;block.mesh.scale.set(1,1,1);block.edgeLine.scale.set(1,1,1);block.bottomEdgeLine.scale.set(1,1,1);block.mesh.material.opacity=1;block.mesh.material.transparent=false;}
            }else{
                var breathY=Math.sin(elapsed*block.breathSpeed+block.breathPhase)*block.breathAmount;
                var breathY2=Math.sin(elapsed*block.breathSpeed2+block.breathPhase2)*block.breathAmount2;
                var waveHeight=getWaveHeight(block.cx,block.cz);
                var globalBreath=Math.sin(globalBreathPhase+block.waveDelay)*1.5;
                var noiseY=fbmNoise(block.cx*0.5,block.cz*0.5,elapsed*0.3,3)*2;

                var targetMouseLift=0;var targetMouseTiltX=0;var targetMouseTiltZ=0;
                if(mouseOnCanvas){var dist=Math.hypot(block.cx-mouseWorldX,block.cz-mouseWorldZ);var radius=380;if(dist<radius){var influence=Math.pow(1-dist/radius,2);targetMouseLift=influence*80;var dirX=mouseWorldX-block.cx;var dirZ=mouseWorldZ-block.cz;var dirLen=Math.hypot(dirX,dirZ);if(dirLen>1){targetMouseTiltX=(dirZ/dirLen)*influence*0.05;targetMouseTiltZ=-(dirX/dirLen)*influence*0.05;}}}
                block.currentMouseLift+=(targetMouseLift-block.currentMouseLift)*0.06;if(Math.abs(block.currentMouseLift)<0.01)block.currentMouseLift=0;
                block.mesh.rotation.x+=(targetMouseTiltX-block.mesh.rotation.x)*0.04;
                block.mesh.rotation.z+=(targetMouseTiltZ-block.mesh.rotation.z)*0.04;

                var totalY=breathY+breathY2+block.currentMouseLift+waveHeight+globalBreath+noiseY;
                block.mesh.position.y=totalY;block.edgeLine.position.y=totalY;block.bottomEdgeLine.position.y=totalY;

                var scaleOff=Math.sin(elapsed*block.scaleSpeed+block.scalePhase)*block.scaleAmount;
                var scaleOff2=Math.sin(elapsed*block.scaleSpeed*1.6+block.scalePhase+1)*block.scaleAmount*0.3;
                var totalScale=scaleOff+scaleOff2;var sx=1+totalScale;var sy=1+totalScale*0.4;var sz=1+totalScale;
                block.mesh.scale.set(sx,sy,sz);block.edgeLine.scale.set(sx,sy,sz);block.bottomEdgeLine.scale.set(sx,sy,sz);

                var microRot=Math.sin(elapsed*block.rotSpeed*100+block.rotPhase)*block.rotAmount;
                block.mesh.rotation.y=microRot;block.edgeLine.rotation.y=microRot;block.bottomEdgeLine.rotation.y=microRot;

                var colorPulse=Math.sin(elapsed*block.colorPulseSpeed+block.colorPulsePhase)*block.colorPulseAmount;
                var pulseInfo=getPulseInfluence(block.cx,block.cz);
                if(pulseInfo.influence>0.01&&pulseInfo.color){block.mesh.material.color.copy(block.baseColor.clone().lerp(pulseInfo.color,pulseInfo.influence*0.15));}
                else{block.mesh.material.color.setRGB(clamp(block.baseColor.r+colorPulse,0,0.1),clamp(block.baseColor.g+colorPulse*0.5,0,0.05),clamp(block.baseColor.b+colorPulse*0.7,0,0.1));}

                block.mesh.material.roughness=clamp(block.mesh.material.roughness+Math.sin(elapsed*0.2+block.breathPhase)*0.05*0.01,0.1,0.95);
                block.edgeLine.material.opacity=clamp(0.4+Math.sin(elapsed*0.3+block.breathPhase)*0.1+(block.currentMouseLift>5?0.2:0),0,0.8);

                if(block.currentMouseLift>1){block.glowIntensity=lerp(block.glowIntensity,block.currentMouseLift/80,0.05);block.mesh.material.emissive=block.mesh.material.emissive||new THREE.Color(0,0,0);block.mesh.material.emissive.setRGB(block.glowIntensity*0.03,block.glowIntensity*0.01,block.glowIntensity*0.02);block.mesh.material.emissiveIntensity=block.glowIntensity*0.5;}
                else{block.glowIntensity=lerp(block.glowIntensity,0,0.03);if(block.mesh.material.emissive){block.mesh.material.emissive.setRGB(block.glowIntensity*0.03,block.glowIntensity*0.01,block.glowIntensity*0.02);block.mesh.material.emissiveIntensity=block.glowIntensity*0.5;}}
            }
        }

        // PARTICLES
        var positions=particleSystem.geometry.attributes.position.array;
        for(var i=0;i<particleCount;i++){var idx=i*3;var speed=particleSpeeds[i];var phase=particlePhases[i];positions[idx]+=speed.x+Math.sin(elapsed*0.1+phase)*0.05;positions[idx+1]+=speed.y*Math.sin(elapsed*0.3+phase);positions[idx+2]+=speed.z+Math.cos(elapsed*0.12+phase)*0.05;if(positions[idx]>1500)positions[idx]=-1500;if(positions[idx]<-1500)positions[idx]=1500;if(positions[idx+1]>500)positions[idx+1]=10;if(positions[idx+1]<5)positions[idx+1]=400;if(positions[idx+2]>1500)positions[idx+2]=-1500;if(positions[idx+2]<-1500)positions[idx+2]=1500;if(mouseOnCanvas){var dx=positions[idx]-mouseWorldX;var dz=positions[idx+2]-mouseWorldZ;var dist=Math.hypot(dx,dz);if(dist<200&&dist>0.1){var force=(1-dist/200)*2;positions[idx]+=(dx/dist)*force;positions[idx+2]+=(dz/dist)*force;positions[idx+1]+=force*0.5;}}}
        particleSystem.geometry.attributes.position.needsUpdate=true;
        particleMaterial.opacity=0.15+Math.sin(elapsed*0.2)*0.04;

        // EMBERS
        var emberPos=emberSystem.geometry.attributes.position.array;
        for(var i=0;i<emberCount;i++){var idx=i*3;var speed=emberSpeeds[i];var phase=emberPhases[i];emberPos[idx]+=speed.x+Math.sin(elapsed*0.08+phase)*0.1;emberPos[idx+1]+=speed.y;emberPos[idx+2]+=speed.z+Math.cos(elapsed*0.1+phase)*0.1;if(emberPos[idx+1]>500){emberPos[idx]=Math.sin(elapsed+i)*1400;emberPos[idx+1]=5;emberPos[idx+2]=Math.cos(elapsed*0.7+i)*1400;}if(emberPos[idx]>1400)emberPos[idx]=-1400;if(emberPos[idx]<-1400)emberPos[idx]=1400;if(emberPos[idx+2]>1400)emberPos[idx+2]=-1400;if(emberPos[idx+2]<-1400)emberPos[idx+2]=1400;}
        emberSystem.geometry.attributes.position.needsUpdate=true;
        emberMaterial.opacity=0.25+Math.sin(elapsed*0.35)*0.08;

        // LIGHT RAYS
        for(var i=0;i<lightRays.length;i++){var ray=lightRays[i];ray.mesh.material.opacity=ray.baseOpacity*(0.3+(Math.sin(elapsed*ray.speed+ray.phase)*0.5+0.5)*0.7);ray.mesh.rotation.y+=ray.rotSpeed*dt;ray.mesh.position.y+=Math.sin(elapsed*0.05+ray.phase)*0.1;}

        // GROUND LINES
        for(var i=0;i<groundLines.length;i++){var gl=groundLines[i];gl.mesh.material.opacity=gl.baseOpacity*(0.3+(Math.sin(elapsed*gl.speed+gl.phase)*0.5+0.5)*0.7);}

        // RINGS
        for(var i=0;i<rings.length;i++){var ring=rings[i];ring.mesh.scale.set(1+Math.sin(elapsed*ring.speed+ring.phase)*ring.pulseAmount,1+Math.sin(elapsed*ring.speed+ring.phase)*ring.pulseAmount,1);ring.mesh.rotation.z=elapsed*0.002*(i%2===0?1:-1);ring.mesh.material.opacity=0.06+Math.sin(elapsed*ring.speed*0.5+ring.phase)*0.02;}

        // HEX GRID
        for(var i=0;i<hexGridLines.length;i++){var hex=hexGridLines[i];hex.mesh.material.opacity=hex.baseOpacity*(0.2+(Math.sin(elapsed*hex.speed+hex.phase)*0.5+0.5)*0.8);if(mouseOnCanvas){var dist=Math.hypot(hex.cx-mouseWorldX,hex.cz-mouseWorldZ);if(dist<250)hex.mesh.material.opacity=Math.min(hex.baseOpacity+(1-dist/250)*0.15,0.4);}}

        // FOG
        fogPlane.material.opacity=0.3+Math.sin(elapsed*0.08)*0.05;
        fogPlane2.material.opacity=0.15+Math.sin(elapsed*0.12+1)*0.03;
        fogPlane2.position.y=5+Math.sin(elapsed*0.1)*2;

        // CONSTELLATIONS
        for(var i=0;i<constellations.length;i++){var c=constellations[i];var posArray=c.mesh.geometry.attributes.position.array;posArray[0]=c.blockA.cx;posArray[1]=c.blockA.mesh.position.y+c.blockA.polyHeight+2;posArray[2]=c.blockA.cz;posArray[3]=c.blockB.cx;posArray[4]=c.blockB.mesh.position.y+c.blockB.polyHeight+2;posArray[5]=c.blockB.cz;c.mesh.geometry.attributes.position.needsUpdate=true;c.mesh.material.opacity=c.baseOpacity*(0.3+(Math.sin(elapsed*c.speed+c.phase)*0.5+0.5)*0.7);if(mouseOnCanvas){var midX=(c.blockA.cx+c.blockB.cx)/2;var midZ=(c.blockA.cz+c.blockB.cz)/2;var dist=Math.hypot(midX-mouseWorldX,midZ-mouseWorldZ);if(dist<300)c.mesh.material.opacity=Math.min(c.baseOpacity+(1-dist/300)*0.12,0.3);}}

        // FLOATING SHAPES
        for(var i=0;i<floatingShapes.length;i++){var fs=floatingShapes[i];fs.orbitAngle+=fs.orbitSpeed*dt;fs.mesh.position.x=Math.cos(fs.orbitAngle)*fs.orbitRadius;fs.mesh.position.z=Math.sin(fs.orbitAngle)*fs.orbitRadius;fs.mesh.position.y=fs.baseY+Math.sin(elapsed*fs.bobSpeed+fs.bobPhase)*fs.bobAmount;fs.mesh.rotation.x+=fs.rotSpeedX;fs.mesh.rotation.y+=fs.rotSpeedY;fs.mesh.rotation.z+=fs.rotSpeedZ;var scaleMod=1+Math.sin(elapsed*fs.scaleSpeed+fs.scalePhase)*fs.scaleAmount;fs.mesh.scale.set(scaleMod,scaleMod,scaleMod);fs.mesh.material.opacity=(0.3+Math.sin(elapsed*0.2+i)*0.1)*clamp(1-Math.hypot(fs.mesh.position.x,fs.mesh.position.z)/1200,0.1,1);}

        // GRID
        gridMat.opacity=0.04+Math.sin(elapsed*0.07)*0.01;

        // AUDIO VIS BARS
        for(var i=0;i<audioVisBars.length;i++){var bar=audioVisBars[i];var freq1=Math.abs(Math.sin(elapsed*bar.freqMult+bar.phase));var freq2=Math.abs(Math.sin(elapsed*bar.freqMult*1.5+bar.phase+1));var freq3=Math.abs(Math.sin(elapsed*bar.freqMult*0.3+bar.phase+2));var combined=freq1*0.5+freq2*0.3+freq3*0.2;var height=combined*bar.maxHeight+1;bar.mesh.scale.y=height;bar.mesh.position.y=height/2;var hue=(i/32+elapsed*0.02)%1;bar.mesh.material.color.setRGB(Math.abs(Math.sin(hue*Math.PI*2))*0.06+0.02,Math.abs(Math.sin(hue*Math.PI*2+2.094))*0.03+0.01,Math.abs(Math.sin(hue*Math.PI*2+4.189))*0.08+0.03);bar.mesh.material.opacity=bar.baseOpacity*(0.3+combined*0.7);}

        // RENDERER SETTINGS
        renderer.toneMappingExposure=0.75+Math.sin(elapsed*0.06)*0.05;
        scene.fog.density=0.00022+Math.sin(elapsed*0.05)*0.00002;

        renderer.render(scene,camera);
    }

    animate();

    // ============================================================
    // WINDOW RESIZE
    // ============================================================
    window.addEventListener('resize',function(){aspect=window.innerWidth/window.innerHeight;camera.left=-frustumSize*aspect/2;camera.right=frustumSize*aspect/2;camera.top=frustumSize/2;camera.bottom=-frustumSize/2;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));});

    // ============================================================
    // CLICK / TOUCH / KEYBOARD INTERACTIONS
    // ============================================================
    document.addEventListener('click',function(e){var ndcX=(e.clientX/window.innerWidth)*2-1;var ndcY=-(e.clientY/window.innerHeight)*2+1;var clickX=ndcX*(frustumSize*aspect/2);var clickZ=-ndcY*(frustumSize/2);createWave(clickX,clickZ,350,15,0.4);var colors=[0xff2222,0x2222ff,0xaa22ff,0xff8800];createPulse(clickX,clickZ,colors[Math.floor(Math.random()*colors.length)],800,250);});

    document.addEventListener('touchstart',function(e){if(e.touches.length===1){var t=e.touches[0];var ndcX=(t.clientX/window.innerWidth)*2-1;var ndcY=-(t.clientY/window.innerHeight)*2+1;var tapX=ndcX*(frustumSize*aspect/2);var tapZ=-ndcY*(frustumSize/2);createWave(tapX,tapZ,350,15,0.4);var colors=[0xff2222,0x2222ff,0xaa22ff,0xff8800];createPulse(tapX,tapZ,colors[Math.floor(Math.random()*colors.length)],800,250);}},{passive:true});

    window.addEventListener('keydown',function(e){
        if(e.key===' '||e.code==='Space'){e.preventDefault();createWave(0,0,500,25,0.2);createPulse(0,0,0xffffff,2000,400);}
        if(e.key==='r'||e.key==='R')createPulse((Math.random()-0.5)*1000,(Math.random()-0.5)*1000,0xff0000,1500,300);
        if(e.key==='b'||e.key==='B')createPulse((Math.random()-0.5)*1000,(Math.random()-0.5)*1000,0x0044ff,1500,300);
        if(e.key==='w'||e.key==='W')createWave((Math.random()-0.5)*1200,(Math.random()-0.5)*1200,400,20,0.3);
    });

    document.addEventListener('visibilitychange',function(){if(document.hidden)lastFrameTime=performance.now();});

})();
