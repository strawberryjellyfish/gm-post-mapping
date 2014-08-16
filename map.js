/*
// sjMap.js - plot markers and polyline routes on a googlemap
//
// geodata and config options are read from data attributes on the #map_canvas
// div which is also the element that will contain teh googlemap. This js is
// intended to be worked into a more extensive WordPress plugin which will
// handle all the data collation, hence not worrying about it here.
// By the way the intended destination as part of a WordPress plugin also
// explains the somewhat daunting number of settings...
// trying to be as flexible as possible
//
// rob@strawberryjellyfish.com
//
*/

$(document).ready(function () {
  var firstMap = {};
  sjMap.call(firstMap);
  firstMap.initialize();
});

var sjMap = function(){
  iconPath = 'images/';       // path to marker icon images
  map = null;                 // conatins the google map object
  mapElement = null;          // the DOM element containing the map
  infoWindow = null;          // the googlemap infoWindow object used for info bubbles
  routes = new Array();       // array of route polyline objects
  markers = new Array();      // array of map marker objects
  markersIndex = new Array(); // array of markers ids
  categories = new Array();   // array of map marker categories
  animOptions = null;         // animation Options hash
  anim = null;                // animation object
  instance = this;            // keeping track

  // setup functions
  this.initialize = function(elementId){
    // set up map using data attribute settings or defaults
    mapElement = elementId ? $(elementId) : $('#map_canvas');
    var mapOptions = mapElement.data('map-options');
    var myOptions = {
      disableClusters:
        mapOptions.disableClusters ?
          mapOptions.disableClusters :
          false,
      backgroundColor:
        mapOptions.backgroundColor ?
          mapOptions.backgroundColor :
          "#B3D1FF",
      zoom:
        mapOptions.zoom ?
          mapOptions.zoom :
          4,
      min_zoom:
        mapOptions.minZoom ?
          mapOptions.minZoom :
          1,
      max_zoom:
        mapOptions.maxZoom ?
          mapOptions.maxZoom :
          20,
      center:
        mapOptions.center ?
          new google.maps.LatLng(mapOptions.center) :
          new google.maps.LatLng(-23.6, 133.3),
      constrain_ne:
        mapOptions.constrainNe ?
          new google.maps.LatLng(mapOptions.constrainNe) :
          new google.maps.LatLng(15, 200),
      constrain_sw:
        mapOptions.constrainSw ?
          new google.maps.LatLng(mapOptions.constrainSw) :
          new google.maps.LatLng(-55, 70),
      disableDoubleClickZoom:
        mapOptions.disableDoubleClick ?
          mapOptions.disableDoubleClick :
          true,
      draggable:
        mapOptions.draggable ?
          mapOptions.draggable :
          true,
      scrollable:
        mapOptions.scrollable ?
          mapOptions.scrollable :
          true,
      mapTypeControl:
        mapOptions.typeControl ?
          mapOptions.typeControl :
          true,
      panControl:
        mapOptions.panControl ?
          mapOptions.panControl :
          true,
      zoomControl:
        mapOptions.zoomControl ?
          mapOptions.zoomControl :
          true,
      scaleControl:
        mapOptions.scaleControl ?
          mapOptions.scaleControl :
          true,
      streetViewControl:
        mapOptions.streetControl ?
          mapOptions.streetControl :
          true,
      overviewMapControl:
        mapOptions.overviewControl ?
          mapOptions.overviewControl :
          true,
      categoryControl:
        mapOptions.categoryControl ?
          mapOptions.categoryControl :
          true,
      routeControl:
        mapOptions.routeControl ?
          mapOptions.routeControl :
          true,
      mapTypeControlOptions: {
        mapTypeIds: [
          'Styled',
          google.maps.MapTypeId.ROADMAP,
          google.maps.MapTypeId.SATELLITE,
          google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.TERRAIN
        ],
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT
      },
      mapTypeId:
        mapOptions.mapType ?
          mapOptions.mapType :
          google.maps.MapTypeId.ROADMAP
    }

    var clusterOptions = {
      batchSize: 100,
      averageCenter: true,
      enableRetinaIcons: true,
      gridSize: 20
    }


    // initialize map
    map = new google.maps.Map(mapElement.get(0), myOptions );

    // add custom style if defined
    var mapStyle = mapElement.data('map-style');
    if (mapStyle) {
      var styledMapType = new google.maps.StyledMapType(mapStyle, { name: 'Styled' } );
      map.mapTypes.set('Styled', styledMapType);
    }

    // initialize infowindow object
    var infocontent = document.createElement("DIV");
    infoWindow = new google.maps.InfoWindow({
      content: infocontent,
      maxWidth: 500
    });

    // setup marker, category and route variables from element data-attributes
    var postMarkers = mapElement.data('post-markers');
    var categories = mapElement.data('categories');
    var routes = mapElement.data('route-waypoints');

    // populate the map with routes & markers
    if (routes && routes.length > 0) {
      for (var i = 0; i < routes.length; i++) {
        this.drawRoute(routes[i]);
      }
    }
    if (postMarkers && postMarkers.length > 0)
      this.drawPostMarkers(postMarkers);

    // markers are clustered by defualt but can be disabled via options
    if (! myOptions['disableClusters'])
      var markerCluster = new MarkerClusterer(map, markers, clusterOptions);

    // if (myOptions['constrain_ne'] && myOptions['constrain_sw']) {

    //   var strictBounds = new google.maps.LatLngBounds(
    //     myOptions['constrain_sw'], myOptions['constrain_ne']
    //   );

    //   google.maps.event.addListener(this.map, 'bounds_changed', function() {
    //     // TODO: Fix Me!
    //     if (strictBounds.contains(this.getCenter())) return;

    //     // We're out of bounds - Move the map back within the bounds
    //     var c = this.getCenter(),
    //     x = c.lng(),
    //     y = c.lat(),
    //     maxX = strictBounds.getNorthEast().lng(),
    //     maxY = strictBounds.getNorthEast().lat(),
    //     minX = strictBounds.getSouthWest().lng(),
    //     minY = strictBounds.getSouthWest().lat();

    //     if (x < minX) x = minX;
    //     if (x > maxX) x = maxX;
    //     if (y < minY) y = minY;
    //     if (y > maxY) y = maxY;

    //     this.setCenter(new google.maps.LatLng(y, x));
    //     console.log('center '+y+' '+x);
    //   });
    // }

    // Add custom map controls
    if (myOptions.routeControl) this.buildRouteDropdown(routes);
    if (myOptions.categoryControl) this.buildCategoryDropdown(categories);

    // set up sequence animation
    if (mapElement.data('animate')) {
      animOptions = mapElement.data('animate');
      animOptions.position = 0;

      if (animOptions.post) {
        animOptions.markers = this.objectFindByKey(markers, 'type', 'post');
      } else if (animOptions.route) {
        animOptions.markers = this.objectFindByKey(markers, 'route', animOptions.route);
      }
      if (animOptions.markers && animOptions.enabled && animOptions.autoStart) {
        google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
          anim = setTimeout(instance.playAnim(), animOptions.delay);
        });
      }
      if (! animOptions.hideControls)
        this.buildPlaybackControls();

    }
  }

  this.drawRoute = function(route) {
    // define a Polyline and/or waypoint markers from an array of waypoints
    var markers = route['markers'];
    var markerCoordinates = new Array();
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng( marker['lat'], marker['lng'] );
      markerCoordinates.push(coords);
      if (route['showMarkers'] == 'yes') {
        this.addMarker(
          marker['id'], marker['name'], coords, marker['icon'], i, null, null,
          'route', route['id'], null
        );
      }
    }
    if (route['showRoute'] == 'yes') {
      var stroke_style = route['stroke'].split(' ');
      var routeLine = new google.maps.Polyline({
        path: markerCoordinates,
        strokeColor: stroke_style[0],
        strokeOpacity: stroke_style[1],
        strokeWeight: stroke_style[2],
        name: route['name'],
        id: route['id'],
        pulse: function() {
          var op = 1;  // initial opacity
          var d = 0;
          var c = 0;
          var route = this;
          var timer = setInterval(function () {
            if (op <= 0.1) {
              d = 1;
            } else if (op >= 1) {
              d = 0;
              c += 1;
            }
            route.setOptions({ strokeOpacity: op});
            if (d == 1) {
              op += op * 0.25;
            } else {
              op -= op * 0.25;
            }
            if ( c >= 5) {
              clearInterval(timer);
              route.setOptions({ strokeOpacity: 1});
            }
          }, 50);
        }
      });
      routeLine.setMap(map);
    }
    routes[routeLine.id] = routeLine;
  }

  this.drawPostMarkers = function(markers) {
    // draw map markers from an array of post data
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      this.addMarker(
        marker['id'], marker['name'], coords, marker['icon'], marker['index'],
        marker['url'], marker['summary'], 'post', marker['route'], marker['cat']
      );
    }
  }

  this.addMarker = function(id, title, coords, icon, z, url, summary, type, route, categories) {
    // add marker to map and store additional attributes to allow identifying
    // marker by route or category.
    var markerIcon = {
      url: icon ? iconPath + icon + '.png' : iconPath + '0.png',
      size: new google.maps.Size(32, 32),
      origin: new google.maps.Point(0,0),
      anchor: new google.maps.Point(16,16)
    };

    var marker = new google.maps.Marker({
      id: id,
      position: coords,
      map: map,
      icon: markerIcon,
      title: title,
      zIndex: z,
      url: url,
      html: summary,
      type: type,
      route: route,
      categories: categories
    });

    if (url) {
      // attach click event listener if url exists
      google.maps.event.addListener(marker, "click", function() {
        window.location.href = this.url;
      });
    }

    if (summary) {
      // attach mouseover event if summary exists
      google.maps.event.addListener(marker, "mouseover", function() {
        infoWindow.setContent('<div class="map-info-bubble-text">'+this.html+'</div>');
        infoWindow.open(this.map, this);
      });
      google.maps.event.addListener(marker, "mouseout", function() {
        infoWindow.close();
      });
    }
    markers[marker.id] = marker;
    markersIndex.push(marker.id);
  }


  // Utility functions

  this.objectFindByKey = function(array, key, value) {
    var found = new Array();
    if (array) {
      for (var i = 0; i < array.length; i++) {
        if (array[i] && array[i][key] === value)
          found.push(array[i]);
      }
    }
    return found.length > 0 ? found : null;
  }

  this.hideAll = function() {
    // hide all markers and routes on the map (nothing is destroyed)
    if (markers) {
      for (var i = 0; i < markers.length; i++) {
        if (markers[i]) this.hideMarker(markers[i].id);
      }
    }
    if (routes) {
      for (var i = 0; i < routes.length; i++) {
        if (routes[i]) this.hideRoute(routes[i].id);
      }
    }
  }

  this.showAll = function(showRoutes, showMarkers) {
    // make all markers and routes visible
    console.log('show all: ' + showRoutes + ' ' +showMarkers);

    if (showMarkers) {
      console.log('show markers');
      for (var i = 0; i < markers.length; i++) {
        if (markers[i]) this.showMarker(markers[i].id);
      }
    }
    if (showRoutes) {
      console.log('show routes');
      for (var i = 0; i < routes.length; i++) {
        if (routes[i]) this.showRoute(routes[i].id);
      }
    }
  }

  this.showRoute = function(routeId) {
    // make the route with id routeId visible
    if (routeId && routes[routeId]) routes[routeId].setMap(map);
  }

  this.hideRoute = function(routeId) {
    // make the route with id routeId hidden
    if (routeId && routes[routeId]) routes[routeId].setMap(null);
  }

  this.showRoutes = function(routeIds) {
    // make the routes with ids in routeIds array visible
    if (routeIds) {
      for (var i = 0; i < routeIds.length; i++) {
        this.showRoute(routeIds[i]);
      }
    }
  }

  this.hideRoutes = function(routeIds) {
    // make the routes with ids in routeIds array hidden
    if (routeIds) {
      for (var i = 0; i < routeIds.length; i++) {
        this.hideRoute(routeIds[i]);
      }
    }
  }

  this.showMarker = function(markerId) {
    // make the marker with id markerId visible
 //   console.log('show marker: '+markerId);
    if (markerId && markers[markerId]) markers[markerId].setMap(map);
  }

  this.hideMarker = function(markerId) {
    // make the marker with id markerId hidden
//    console.log('hide marker: '+markerId);
    if (markerId && markers[markerId]) markers[markerId].setMap(null);
  }

  this.highlightMarker = function(markerId) {
    // visually highlight the marker
    // TODO: add some form of marker hilighting: colour border, animation?
  }

  this.showMarkers = function(markersIds) {
    // make the markers with ids in markersIds array visible
    if (markerIds) {
      for (var i = 0; i < markerIds.length; i++) {
        this.showMarker(markerIds[i]);
      }
    }
  }

  this.hideMarkers = function(markersIds) {
    // make the markers with ids in markersIds array hidden
    if (markerIds) {
      for (var i = 0; i < markerIds.length; i++) {
        this.hideMarker(markerIds[i]);
      }
    }
  }

  this.showMarkersByCategory = function(categoryId, clear) {
    // make the markers with the categoryId visible,
    // clear = true : clear all other markers
    console.log(categoryId);
    if (markers) {
      for (var i = 0; i < markers.length; i++) {
        if (markers[i] && markers[i].categories && markers[i].categories.split(',').indexOf(categoryId.toString()) > -1) {
          this.showMarker(markers[i].id);
        } else if (markers[i] && clear) {
          this.hideMarker(markers[i].id);
        }
      }
    }
  }

  this.hideMarkersByCategory = function(categoryId) {
    // make the markers with the categoryId hidden
    console.log(categoryId);
    if (markers) {
      for (var i = 0; i < markers.length; i++) {
        if (markers[i] && markers[i].categories && markers[i].categories.split(',').indexOf(categoryId) > -1 )
        this.hideMarker(markers[i].id);
      }
    }
  }

  this.showMarkersByRoute = function(routeId, route, post, clear) {
    // make the markers with the routeId visible,
    // route = true : show route markers
    // post = true : show post markers
    // clear = true : clear all other markers
    if (markers) {
      for (var i = 0; i < markers.length; i++) {
        if ( markers[i] && markers[i].route == routeId ) {
          if (route && markers[i].type == 'route') this.showMarker(markers[i].id);
          if (post && markers[i].type == 'post') this.showMarker(markers[i].id);
        } else if (markers[i] && clear) {
          this.hideMarker(markers[i].id);
        }
      }
    }
  }

  this.hideMarkersByRoute = function(routeId, route, post) {
    // make the markers with the routeId hidden,
    // route = true : hide route markers
    // post = true : hide post markers
    if (markers) {
      for (var i = 0; i < markers.length; i++) {
        if (markers[i] && markers[i].route == routeId ) {
          if (route && markers[i].type == 'route') this.hideMarker(markers[i].id);
          if (post && markers[i].type == 'post') this.hideMarker(markers[i].id);
        }
      }
    }
  }

  this.playAnim = function() {
    // pan map to each marker in turn and open infowindow
    if (animOptions.position < animOptions.markers.length) {
      this.gotoMarker(animOptions.markers[animOptions.position]);
      this.anim = setTimeout('instance.playAnim()', animOptions.delay);
      $('#sjMapPlaybackPlayPause').text('Pause');
    } else if (animOptions.loop) {
      animOptions.position = 0;
      this.gotoMarker(animOptions.markers[animOptions.position]);
      this.anim = setTimeout('google.maps.event.addListenerOnce(map, "tilesloaded", function() { instance.playAnim(); }', animOptions.delay);
    } else {
      clearTimeout(this.anim);
      animOptions.position = 0;
      this.anim = null;
      $('#sjMapPlaybackPlayPause').text('Play');
    }
    animOptions.position += 1;
  }

  this.gotoMarker = function(marker, markerId) {
    // pan map to marker and open infowindow
    if (! marker)
      var marker = this.objectFindByKey(markers, 'id', markerId);
    console.log('gotoMarker('+marker+', '+markerId+')');
    //console.log(markers);
    map.panTo(marker.getPosition());
    this.openInfoWindow(marker);
  }

  this.openInfoWindow = function(marker, markerId) {
    if (! marker)
      var marker = this.objectFindByKey(markers, 'id', markerId);
    infoWindow.setContent(marker.html);
    infoWindow.open(map, marker);
  }

  this.buildRouteDropdown = function(routes) {
    // build a map dropdown control for routes
    var dropDownItems = new Array();
    for (var i = 0; i < routes.length; i++) {
      var divOptions = {
        name: routes[i].name,
        title: '',
        id: 'sjMapRouteControl-' + routes[i].id,
        objid: routes[i].id,
        action: function(){
          instance.hideAll();
          instance.showRoute(this.dataset.objid);
          instance.showMarkersByRoute(this.dataset.objid, true, true);
        }
      }
      dropDownItems.push(new this.optionDiv(divOptions));
    }

    var divOptions = {
      name: 'Show All',
      title: '',
      id: 'sjMapRouteControl-all',
      action: function(){
        instance.showAll(true, true);
      }
    }
    dropDownItems.push(new this.separator());
    dropDownItems.push(new this.optionDiv(divOptions));

    var dropDownOptions = { items: dropDownItems, id: 'routeDropDown' };
    var routeDropDownDiv = new this.dropDownOptionsDiv(dropDownOptions);
    var dropDownOptions = {
      name: 'Routes',
      id: 'sjMapRouteDD',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      dropDown: routeDropDownDiv
    }
    var routeDropDown = new this.dropDownControl(dropDownOptions);

  }

  this.buildCategoryDropdown = function(categories) {
    // build a map dropdown control for marker categories
    var dropDownItems = new Array();
    for (var i = 0; i < categories.length; i++) {
      var divOptions = {
        name: categories[i].name,
        id: 'sjMapCategoryControl-' + categories[i].id,
        objid: categories[i].id,
        action: function(){
          instance.showMarkersByCategory(this.dataset.objid, true);
        }
      }
      dropDownItems.push(new this.optionDiv(divOptions));
    }
    //console.log(dropDownItems);

    var divOptions = {
      name: 'Show All',
      title: '',
      id: 'sjMapCategoryControl-all',
      action: function(){
        instance.showAll(false, true);
      }
    }
    dropDownItems.push(new this.separator());
    dropDownItems.push(new this.optionDiv(divOptions));

    var dropDownOptions = { items: dropDownItems, id: 'categoryDropDown' };
    var categoryDropDownDiv = new this.dropDownOptionsDiv(dropDownOptions);
    var dropDownOptions = {
      name: 'Categories',
      id: 'sjMapCategoryDD',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      dropDown: categoryDropDownDiv
    }
    var categoryDropDown = new this.dropDownControl(dropDownOptions);

  }

  this.buildPlaybackControls = function() {
    var buttonOptions = {
      name: 'Play',
      id: 'sjMapPlaybackPlayPause',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      action: function(){
        if (instance.anim) {
          clearTimeout(instance.anim);
          instance.anim = null;
          $(this).text('Play');
        } else {
          instance.playAnim();
          $(this).text('Pause');
        }
      }
    }
    var playbackControls = new this.buttonControl(buttonOptions);
  }

  //  custom map control functions

  this.optionDiv = function(options) {
    var control = document.createElement('DIV');
    control.className = "dropDownItemDiv";
    if (options.title) control.title = options.title;
    control.id = options.id;
    control.innerHTML = options.name;
    control.dataset.objid = options.objid;
    google.maps.event.addDomListener(control, 'click', options.action);
    return control;
  }

  this.checkBox = function(options) {
    //first make the outer container
    var container = document.createElement('DIV');
    container.className = "checkboxContainer";
    container.title = options.title;

    var span = document.createElement('SPAN');
    span.role = "checkbox";
    span.className = "checkboxSpan";

    var bDiv = document.createElement('DIV');
    bDiv.className = "blankDiv";
    bDiv.id = options.id;

    var image = document.createElement('IMG');
    image.className = "blankImg";
    image.src = "http://maps.gstatic.com/mapfiles/mv/imgs8.png";

    var label = document.createElement('LABEL');
    label.className = "checkboxLabel";
    label.innerHTML = options.label;

    bDiv.appendChild(image);
    span.appendChild(bDiv);
    container.appendChild(span);
    container.appendChild(label);

    google.maps.event.addDomListener(container, 'click', function() {
      (document.getElementById(bDiv.id).style.display == 'block') ?
        document.getElementById(bDiv.id).style.display = 'none' :
        document.getElementById(bDiv.id).style.display = 'block';
      options.action();
    })
    return container;
  }

  this.separator = function() {
    var sep = document.createElement('DIV');
    sep.className = "separatorDiv";
    return sep;
  }

  this.dropDownOptionsDiv = function(options) {
    var container = document.createElement('DIV');
    container.className = "dropDownOptionsDiv";
    container.id = options.id;
    for (i = 0; i < options.items.length; i++) {
      container.appendChild(options.items[i]);
    }
    return container;
  }

  this.dropDownControl = function(options) {
    var container = document.createElement('DIV');
    container.className = 'container';
    var control = document.createElement('DIV');
    control.className = 'dropDownControl';
    control.innerHTML = options.name;
    control.id = options.id;
    var arrow = document.createElement('IMG');
    arrow.src = "http://maps.gstatic.com/mapfiles/arrow-down.png";
    arrow.className = 'dropDownArrow';
    control.appendChild(arrow);
    container.appendChild(control);
    container.appendChild(options.dropDown);

    map.controls[options.position].push(container);
    google.maps.event.addDomListener(container, 'click', function() {
      (document.getElementById(options.dropDown.id).style.display == 'block') ? document.getElementById(options.dropDown.id).style.display = 'none' : document.getElementById(options.dropDown.id).style.display = 'block';
    })
  }

  this.buttonControl = function(options) {
    var control = document.createElement('DIV');
    control.innerHTML = options.name;
    control.id = options.id;
    control.className = 'button container';
    control.index = options.index ? options.index : 1 ;
    map.controls[options.position].push(control);
    google.maps.event.addDomListener(control, 'click', options.action);
    return control;
  }
}