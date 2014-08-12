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
  sjMap.initialize();
});

var sjMap = {
  iconPath: 'images/',    // path to marker icon images
  map: null,              // conatins the google map object
  mapElement: null,       // the DOM element containing the map
  infoWindow: null,       // the googlemap infoWindow object used for info bubbles
  routes: new Array(),    // array of route polyline objects
  markers: new Array(),   // array of map marker objects
  markersIndex: new Array(),// array of markers ids
  categories: new Array(), // array of map marker categories
  animOptions: null,       // animation Options hash
  anim: null,              // animation object
  // setup functions
  initialize: function(){
    // set up map using data attribute settings or defaults
    this.mapElement = $('#map_canvas');
    var mapOptions = this.mapElement.data('map-options');
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
        ]
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

    this.map = new google.maps.Map(this.mapElement.get(0), myOptions );

    var mapStyle = this.mapElement.data('map-style');
    if (mapStyle) {
      var styledMapType = new google.maps.StyledMapType(mapStyle, { name: 'Styled' } );
      this.map.mapTypes.set('Styled', styledMapType);
    }

    var infocontent = document.createElement("DIV");
    this.infoWindow = new google.maps.InfoWindow({
      content: infocontent,
      maxWidth: 500
    });

    var categories = this.mapElement.data('categories');
    var routes = this.mapElement.data('route-waypoints');
    for (var i = 0; i < routes.length; i++) {
      this.drawRoute(routes[i]);
    }

    var postMarkers = this.mapElement.data('post-markers');
    if (postMarkers.length > 0)
      this.drawPostMarkers(postMarkers);

    if (! myOptions['disableClusters'])
      var markerCluster = new MarkerClusterer(this.map, this.markers, clusterOptions);

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

    if (myOptions.routeControl)
      this.buildRouteDropdown(routes);
    if (myOptions.categoryControl)
      this.buildCategoryDropdown(categories);




    // set up  options for marker sequence animation
    if (this.mapElement.data('animate')) {
      this.animOptions = this.mapElement.data('animate');
      this.animOptions.position = 0;

      if (this.animOptions.post) {
        sjMap.animOptions.markers = sjMap.objectFindByKey(sjMap.markers, 'type', 'post');
      } else if (this.animOptions.route) {
        this.animOptions.markers = this.objectFindByKey(this.markers, 'route', this.animOptions['route']);
      }
      if (this.animOptions.markers && this.animOptions.enabled && this.animOptions.autoStart) {
        google.maps.event.addListenerOnce(this.map, 'tilesloaded', function() {
          this.anim = setTimeout(sjMap.playAnim(), sjMap.animOptions.delay);
        });
      }
    }
  },

  drawRoute: function(route) {
    // define a Polyline and/or waypoint markers from an array of waypoints
    var markers = route['markers'];
    var markerCoordinates = new Array();
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng( marker['lat'], marker['lng'] );
      markerCoordinates.push(coords);
      if (route['showMarkers'] == 'yes') {
        this.addMarker( marker['id'], marker['name'], coords, marker['icon'], i, null, null, 'route', route['id'], null );
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
      routeLine.setMap(this.map);
    }
    this.routes[routeLine.id] = routeLine;
  },

  drawPostMarkers: function(markers) {
    // draw map markers from an array of post data
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      this.addMarker(
        marker['id'], marker['name'], coords, marker['icon'], marker['index'],
        marker['url'], marker['summary'], 'post', marker['route'], marker['cat']
      );
    }
  },

  addMarker: function(id, title, coords, icon, z, url, summary, type, route, categories) {
    // add marker to map and store additional attributes to allow identifying
    // marker by route or category.
    var markerIcon = {
      url: icon ? this.iconPath + icon + '.png' : this.iconPath + '0.png',
      size: new google.maps.Size(32, 32),
      origin: new google.maps.Point(0,0),
      anchor: new google.maps.Point(16,16)
    };
    var marker = new google.maps.Marker({
      id: id,
      position: coords,
      map: this.map,
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
        sjMap.infoWindow.setContent('<div class="map-info-bubble-text">'+this.html+'</div>');
        sjMap.infoWindow.open(this.map, this);
      });
      google.maps.event.addListener(marker, "mouseout", function() {
        sjMap.infoWindow.close();
      });
    }
    this.markers[marker.id] = marker;
    this.markersIndex.push(marker.id);
  },


  // Utility functions

  hideAll: function() {
    // hide all markers and routes on the map (nothing is destroyed)
    $.each( sjMap.markers, function(index, value) {
      if (value) sjMap.hideMarker(value.id);
    });
    $.each( sjMap.routes, function(index, value) {
      if (value) sjMap.hideRoute(value.id);
    });
  },

  showAll: function(routes, markers) {
    // make all markers and routes visible
    if (markers) {
      $.each( sjMap.markers, function(index, value) {
        if (value) sjMap.showMarker(value.id);
      });
    }
    if (routes) {
      $.each( sjMap.routes, function(index, value) {
        if (value) sjMap.showRoute(value.id);
      });
    }
  },

  showRoute: function(routeId) {
    // make the route with id routeId visible
    if (routeId) sjMap.routes[routeId].setMap(sjMap.map);
  },

  hideRoute: function(routeId) {
    // make the route with id routeId hidden
    if (routeId) sjMap.routes[routeId].setMap(null);
  },

  showRoutes: function(routeIds) {
    // make the routes with ids in routeIds array visible
    if (routeIds) {
      $.each( routeIds, function(index, value) {
        sjMap.showRoute(value);
      });
    }
  },

  hideRoutes: function(routeIds) {
    // make the routes with ids in routeIds array hidden
    if (routeIds) {
      $.each( routeIds, function(index, value) {
        sjMap.hideRoute(value);
      });
    }
  },

  showMarker: function(markerId) {
    // make the marker with id markerId visible
    if (markerId) sjMap.markers[markerId].setMap(sjMap.map);
  },

  hideMarker: function(markerId) {
    // make the marker with id markerId hidden
    if (markerId) sjMap.markers[markerId].setMap(null);
  },

  highlightMarker: function(markerId) {
    // visually highlight the marker
    // TODO: add some form of marker hilighting: colour border, animation?
  },

  showMarkers: function(markersIds) {
    // make the markers with ids in markersIds array visible
    if (markerIds) {
      $.each( markersIds, function(index, value) {
        sjMap.showMarker(value);
      });
    }
  },

  hideMarkers: function(markersIds) {
    // make the markers with ids in markersIds array hidden
    if (markerIds) {
      $.each( markersIds, function(index, value) {
        sjMap.hideMarker(value);
      });
    }
  },

  showMarkersByCategory: function(categoryId, clear) {
    // make the markers with the categoryId visible,
    // clear = true : clear all other markers
      $.each( sjMap.markers, function(index, value) {
      if (value && value.categories && value.categories.split(',').indexOf(categoryId.toString()) > -1) {
        sjMap.showMarker(value.id);
      } else if (value && clear) {
        sjMap.hideMarker(value.id);
      }
    });
  },

  hideMarkersByCategory: function(categoryId) {
    // make the markers with the categoryId hidden
    $.each( sjMap.markers, function(index, value) {
      if (value && value.categories && value.categories.split(',').indexOf(categoryId) > -1 )
        sjMap.hideMarker(value.id);
    });
  },

  showMarkersByRoute: function(routeId, route, post, clear) {
    // make the markers with the routeId visible,
    // route = true : show route markers
    // post = true : show post markers
    // clear = true : clear all other markers
    $.each( sjMap.markers, function(index, value) {
      if ( value && value.route == routeId ) {
        if (route && value.type == 'route') sjMap.showMarker(value.id);
        if (post && value.type == 'post') sjMap.showMarker(value.id);
      } else if (value && clear) {
        sjMap.hideMarker(value.id);
      }
    });
  },

  hideMarkersByRoute: function(routeId, route, post) {
    // make the markers with the routeId hidden,
    // route = true : hide route markers
    // post = true : hide post markers
    $.each( sjMap.markers, function(index, value) {
      if (value && value.route == routeId ) {
        if (route && value.type == 'route') sjMap.hideMarker(value.id);
        if (post && value.type == 'post') sjMap.hideMarker(value.id);
      }
    });
  },

  playAnim: function() {
    if (this.animOptions.position < this.animOptions.markers.length) {
      var marker = this.animOptions.markers[this.animOptions.position];
      this.map.panTo(marker.getPosition());
      this.infoWindow.setContent(marker.html);
      this.infoWindow.open(this.map, marker);
      route = setTimeout('sjMap.playAnim()', sjMap.animOptions.delay);
    } else if (this.animOptions.loop) {
      this.animOptions.position = 0;
      var marker = this.animOptions.markers[this.animOptions.position];
      this.map.panTo(marker.getPosition());
      this.infoWindow.setContent(marker.html);
      this.infoWindow.open(this.map, marker);
      route = setTimeout('google.maps.event.addListenerOnce(sjMap.map, "tilesloaded", function() { sjMap.playAnim(); }', sjMap.animOptions.delay);
    } else {
      clearTimeout(this.anim);
      this.animOptions.position = 0;
      this.anim = null;
    }
    this.animOptions.position += 1;
  },


  buildRouteDropdown: function(routes) {
    // build a map dropdown control for routes
    var dropDownItems = new Array();
    $.each( routes, function(index, value) {
      var divOptions = {
        name: value.name,
        title: '',
        id: 'sjMapRouteControl-' + value.id,
        action: function(){
          sjMap.hideAll();
          sjMap.showRoute(value.id);
          sjMap.showMarkersByRoute(value.id, true, true);
        }
      }
      dropDownItems.push(new sjMap.optionDiv(divOptions));
    });

    var divOptions = {
      name: 'Show All',
      title: '',
      id: 'sjMapRouteControl-all',
      action: function(){
        sjMap.showAll(true, false);
      }
    }
    dropDownItems.push(new sjMap.separator());
    dropDownItems.push(new sjMap.optionDiv(divOptions));

    var dropDownOptions = { items: dropDownItems, id: 'routeDropDown' };
    var routeDropDownDiv = new sjMap.dropDownOptionsDiv(dropDownOptions);
    var dropDownOptions = {
      name: 'Routes',
      id: 'sjMapRouteDD',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      dropDown: routeDropDownDiv
    }
    var routeDropDown = new sjMap.dropDownControl(dropDownOptions);

  },


  buildCategoryDropdown: function(categories) {
    // build a map dropdown control for marker categories
    var dropDownItems = new Array();
    $.each( categories, function(index, value) {
      var divOptions = {
        name: value.name,
        id: 'sjMapCategoryControl-' + value.id,
        action: function(){
          sjMap.showMarkersByCategory(value.id, true);
        }
      }
      dropDownItems.push(new sjMap.optionDiv(divOptions));
    });

    var divOptions = {
      name: 'Show All',
      title: '',
      id: 'sjMapCategoryControl-all',
      action: function(){
        sjMap.showAll(false, true);
      }
    }
    dropDownItems.push(new sjMap.separator());
    dropDownItems.push(new sjMap.optionDiv(divOptions));

    var dropDownOptions = { items: dropDownItems, id: 'categoryDropDown' };
    var categoryDropDownDiv = new sjMap.dropDownOptionsDiv(dropDownOptions);
    var dropDownOptions = {
      name: 'Categories',
      id: 'sjMapCategoryDD',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      dropDown: categoryDropDownDiv
    }
    var categoryDropDown = new sjMap.dropDownControl(dropDownOptions);

  },
  //  custom map control functions

  optionDiv: function(options) {
    var control = document.createElement('DIV');
    control.className = "dropDownItemDiv";
    if (options.title) control.title = options.title;
    control.id = options.id;
    control.innerHTML = options.name;
    google.maps.event.addDomListener(control, 'click', options.action);
    return control;
  },

  checkBox: function(options) {
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
      (document.getElementById(bDiv.id).style.display == 'block') ? document.getElementById(bDiv.id).style.display = 'none' : document.getElementById(bDiv.id).style.display = 'block';
      options.action();
    })
    return container;
  },

  separator: function() {
    var sep = document.createElement('DIV');
    sep.className = "separatorDiv";
    return sep;
  },

  dropDownOptionsDiv: function(options) {
    var container = document.createElement('DIV');
    container.className = "dropDownOptionsDiv";
    container.id = options.id;
    for (i = 0; i < options.items.length; i++) {
      container.appendChild(options.items[i]);
    }
    return container;
  },

  dropDownControl: function(options) {
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

    sjMap.map.controls[options.position].push(container);
    google.maps.event.addDomListener(container, 'click', function() {
      (document.getElementById(options.dropDown.id).style.display == 'block') ? document.getElementById(options.dropDown.id).style.display = 'none' : document.getElementById(options.dropDown.id).style.display = 'block';
    })
  },

  buttonControl: function(options) {
    var control = document.createElement('DIV');
    control.innerHTML = options.name;
    control.className = 'button';
    control.index = 1;
    sjMap.map.controls[options.position].push(control);
    google.maps.event.addDomListener(control, 'click', options.action);
    return control;
  },

  objectFindByKey: function(array, key, value) {
    var found = new Array();
    for (var i = 0; i < array.length; i++) {
      if (array[i] && array[i][key] === value)
        found.push(array[i]);
    }
    return found.length > 0 ? found : null;
  }
}