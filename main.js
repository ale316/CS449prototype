// MAIN

// standard global variables
var container, scene, camera, renderer, controls;
var thumbContainer, thumbScene, thumbCamera, thumbRenderer, thumbArrow;

var keyboard = new KeyboardState();

// custom global variables
var targetList = [];
var projector, mouse = { x: 0, y: 0 }, INTERSECTED;
var selectedFaces = [];
var floorSide = 1000;
var baseColor = new THREE.Color( 0x9C9CAA );
var highlightedColor = new THREE.Color( 0xFFA000 );
var selectedColor = new THREE.Color( 0xFFCC00 );

init();
initThumb();
animate();
animateThumb();

// FUNCTIONS
function init()
{
	// SCENE
	scene = new THREE.Scene();

  // CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(0,250,950);
	camera.lookAt(scene.position);

  // RENDERER
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer();
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById( 'ThreeJS' );
	container.appendChild( renderer.domElement );

	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );

  // LIGHT
	var light = new THREE.AmbientLight( 0xffffff ); // soft white light
	scene.add( light );

	// SKYBOX
	var skyBoxGeometry = new THREE.BoxGeometry( 10000, 10000, 10000 );
	var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x393939, side: THREE.BackSide } );
	var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
	scene.add(skyBox);

	////////////
	// CUSTOM //
	////////////

	addIco();

  //////////////////////////////////////////////////////////////////////

	// initialize object to perform world/screen calculations
	projector = new THREE.Projector();

	// when the mouse moves, call the given function
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

function initThumb() {
  // SCENE
  thumbScene = new THREE.Scene();

  // CAMERA
  var SCREEN_WIDTH = 200, SCREEN_HEIGHT = 134;
  var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
  thumbCamera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
  thumbScene.add(thumbCamera);
  thumbCamera.position.set(0,400,950);
  thumbCamera.lookAt(thumbScene.position);

  // RENDERER
  if ( Detector.webgl )
    thumbRenderer = new THREE.WebGLRenderer( {antialias:true} );
  else
    thumbRenderer = new THREE.CanvasRenderer();
  thumbRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  thumbContainer = document.getElementById( 'thumb' );
  thumbContainer.appendChild( thumbRenderer.domElement );

  // LIGHT
  var light = new THREE.AmbientLight( 0xffffff ); // soft white light
  thumbScene.add( light );

  // SKYBOX
  var skyBoxGeometry = new THREE.BoxGeometry( 10000, 10000, 10000 );
  var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0xc606060, side: THREE.BackSide } );
  var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
  thumbScene.add(skyBox);

  ////////////
  // CUSTOM //
  ////////////

  var thumbObjGeom =  new THREE.BoxGeometry(150, 150, 150);
  var thumbObjMat = new THREE.MeshBasicMaterial(
	   {
       color: 0xff0000,
       transparent: true,
       opacity: 0.6
     }
  );
  var thumbObj = new THREE.Mesh( thumbObjGeom, thumbObjMat );
  thumbObj.position.set(0,0,0);
  thumbScene.add(thumbObj);

  var thumbWire = new THREE.EdgesHelper( thumbObj, 0x880000 );
  thumbObj.add(thumbWire);

  var dir = new THREE.Vector3( 0, 0, -1 );
  dir.applyQuaternion(camera.quaternion);
  // dir.applyQuaternion(camera.quaternion);
  var origin = camera.position.clone().normalize().multiplyScalar(350);
  var length = 80;
  thumbArrow = new THREE.ArrowHelper( dir, origin, length, highlightedColor, 40, 60 );
  thumbArrow.line.material.linewidth = 5;
  thumbScene.add( thumbArrow );

  //////////////////////////////////////////////////////////////////////

  // initialize object to perform world/screen calculations
  thumbProjector = new THREE.Projector();
}

function addIco() {
  var cubeSide = 100;
	var faceColorMaterial = new THREE.MeshLambertMaterial(
	   {
       color: 0xffffff,
       vertexColors: THREE.FaceColors,
       shading:THREE.FlatShading,
       polygonOffset: true,
       polygonOffsetUnits: 1,
       polygonOffsetFactor: 1
     }
  );

	var icoGeom= new THREE.IcosahedronGeometry(cubeSide, 1);

  var ico = new THREE.Mesh( icoGeom, faceColorMaterial );
	ico.position.set(0, 0, 0);

	for ( var i = 0; i < icoGeom.faces.length; i++ ) {
		face = icoGeom.faces[ i ];
    face.color= baseColor;
	}

  var edges = new THREE.EdgesHelper( ico, 0x5A5B67 );

  bbox = new THREE.BoundingBoxHelper( ico, highlightedColor );
  bbox.update();
  bbox.visible = false;
  ico.add( bbox );

  scene.add(ico);
  ico.add(edges);

	targetList.push(ico);
}

function onDocumentMouseMove( event )
{
	// the following line would stop any other event handler from firing
	// (such as the mouse's TrackballControls)
	//event.preventDefault();

	// update the mouse variable
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


function onDocumentMouseDown( event )
{
	// the following line would stop any other event handler from firing
	// (such as the mouse's TrackballControls)
	// event.preventDefault();

	//console.log("Click.");

	// update the mouse variable
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	checkSelection();

}

function ColorSelected(){
	selectedFaces.forEach( function(arrayItem) {
			arrayItem.face.color = selectedColor;
			arrayItem.object.geometry.colorsNeedUpdate = true;
		});
}

function toggleBoundingBox() {
  bbox.visible = !bbox.visible;
}

function checkSelection(){
	// find intersections

	// create a Ray with origin at the mouse position
	//   and direction into the scene (camera direction)
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	// projector.unprojectVector( vector, camera );
  vector.unproject(camera);
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
  ray.linePrecision = 0;
  ray.precision = 0.5;
	// create an array containing all objects in the scene with which the ray intersects
	var intersects = ray.intersectObjects( targetList );

	//if an intersection is detected
	if ( intersects.length > 0 ) {
		console.log("Hit @ " + toString( intersects[0].point ) );

		//test items in selected faces array
		var test=-1;
		selectedFaces.forEach( function(arrayItem) {
			// if the faceIndex and object ID are the same between the intersect and selected faces ,
			// the face index is recorded
			if(intersects[0].faceIndex == arrayItem.faceIndex && intersects[0].object.id == arrayItem.object.id){
				test = selectedFaces.indexOf(arrayItem);
			}
		});

		// if is a previously selected face, change the color back to green, otherswise change to blue
		if(test >= 0) {
			intersects[ 0 ].face.color = new THREE.Color( 0x44dd66 );
			selectedFaces.splice(test, 1);
		} else {
			intersects[ 0 ].face.color = new THREE.Color( 0x222288 );
			selectedFaces.push(intersects[0]);
		}

		intersects[ 0 ].object.geometry.colorsNeedUpdate = true;
	}
}
function checkHighlight(){
	// find intersections

	// create a Ray with origin at the mouse position
	//   and direction into the scene (camera direction)
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	// projector.unprojectVector( vector, camera );
  vector.unproject(camera);
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
  ray.linePrecision = 3;
  ray.precision = 1;
	// create an array containing all objects in the scene with which the ray intersects
	var intersects = ray.intersectObjects( targetList );

	// INTERSECTED = the object in the scene currently closest to the camera
	//		and intersected by the Ray projected from the mouse position

	// if there is one (or more) intersections
	if ( intersects.length > 0 ) {	// case if mouse is not currently over an object
		if (INTERSECTED == null) {
			INTERSECTED = _pickIntersected(intersects);
      _setColor(INTERSECTED, highlightedColor, 2);
			// INTERSECTED.face.color = highlightedColor;
		} else {	// if thse mouse is over an object
		  // INTERSECTED.face.color = baseColor;
      _setColor(INTERSECTED, baseColor, 2);
			INTERSECTED.object.geometry.colorsNeedUpdate = true;

      INTERSECTED = _pickIntersected(intersects);
			// INTERSECTED.face.color = highlightedColor;
      _setColor(INTERSECTED, highlightedColor, 2);
		}

		INTERSECTED.object.geometry.colorsNeedUpdate = true;

	} else {
    // If no intersections
		// restore previous intersection object (if it exists) to its original color
		if (INTERSECTED){
			// INTERSECTED.face.color = baseColor;
      _setColor(INTERSECTED, baseColor, 2);
			INTERSECTED.object.geometry.colorsNeedUpdate = true;
		}
		// remove previous intersection object reference
		//     by setting current intersection object to "nothing"

		INTERSECTED = null;


	}
}

function toString(v) { return "[ " + v.x + ", " + v.y + ", " + v.z + " ]"; }


function animate()
{
  requestAnimationFrame(animate);
	render();
	update();
}

function animateThumb()
{
  requestAnimationFrame(animateThumb);
	renderThumb();
	updateThumb();
}

function renderThumb() {
  thumbRenderer.render(thumbScene, thumbCamera);
}

function updateThumb() {
  var dir = new THREE.Vector3( 0, 0, -1 );
  dir.applyQuaternion(camera.quaternion);
  var origin = camera.position.clone().normalize().multiplyScalar(350);
  thumbArrow.setDirection(dir);
  thumbArrow.position.copy(origin);
  // console.log(thumbArrow.position);
}

function update()
{
	checkHighlight();
	keyboard.update();

	ColorSelected();
	//intersects[ 0 ].object.geometry.colorsNeedUpdate = true;
	controls.update();
  // console.log(camera);
}

function render()
{
	renderer.render( scene, camera );
}

function _addIfUnique(arr, elem) {
  for (var i = 0; i < arr.length; ++i) {
    var curr = arr[i];
    if (curr.geometry.vertices[0].equals(elem.geometry.vertices[0]) &&
        curr.geometry.vertices[1].equals(elem.geometry.vertices[1])) {
        return false;
    }
  }
  arr.push(elem);
  return true;
}

function _setColor(obj, color, lineWidth) {
  if (obj.object.type == "Mesh")
    obj.face.color = color;
  else if (obj.object.type == "Line") {
    obj.object.material.color = color;
    obj.object.material.lineWidth = lineWidth;
  }
}

function _pickIntersected(list) {
  for (var i = 0; i < list.length; ++i) {
    var obj = list[i];
    if (obj.object.type == "Line") return obj;
  }

  return list[0];
}


$('.left-sidebar li').on('click', function (e) {
  $('body').css( 'cursor', 'url(img/'+$(this).data('type')+'.png), auto' );
});

$(document).on('keyup', function(e) {
     if (e.keyCode == 27) { // escape key maps to keycode `27`
        $('body').css( 'cursor', 'default' );
     } else if(e.keyCode == 66) {
       toggleBoundingBox();
     }
});
