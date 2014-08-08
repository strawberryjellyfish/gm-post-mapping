$(document).ready(function () {
  sjMap.initialize();
});

var sjMap = {

  iconPath: 'images/',
  map: null,
  mapElement: null,
  infoWindow: null,
  routes: [],
  markers: [],

  // setup functions

  initialize: function(){
    // set up map using data attribute settings or defaults
    this.mapElement = $('#map_canvas');
    var myOptions = {
      backgroundColor:
        this.mapElement.data('background-color') ?
          this.mapElement.data('background-color') :
          "#B3D1FF",
      zoom:
        this.mapElement.data('zoom') ?
          this.mapElement.data('zoom') :
          4,
      min_zoom:
        this.mapElement.data('min-zoom') ?
          this.mapElement.data('min-zoom') :
          1,
      max_zoom:
        this.mapElement.data('max-zoom') ?
          this.mapElement.data('max-zoom') :
          20,
      center:
        this.mapElement.data('center') ?
          new google.maps.LatLng(mapElement.data('center')) :
          new google.maps.LatLng(-23.6, 133.3),
      constrain_ne:
        this.mapElement.data('constrain_ne') ?
          new google.maps.LatLng(mapElement.data('constrain_ne')) :
          new google.maps.LatLng(6.122611334025562, -169.74488196250002),
      constrain_sw:
        this.mapElement.data('constrain_sw') ?
          new google.maps.LatLng(mapElement.data('constrain_sw')) :
          new google.maps.LatLng(-37.19162567748894, 77.04999999999995),
      disableDoubleClickZoom:
        this.mapElement.data('disable-double-click') ?
          this.mapElement.data('disable-double-click') :
          true,
      draggable:
        this.mapElement.data('draggable') ?
          this.mapElement.data('draggable') :
          true,
      scrollable:
        this.mapElement.data('scrollable') ?
          this.mapElement.data('scrollable') :
          true,
      mapTypeControl:
        this.mapElement.data('type-control') ?
          this.mapElement.data('type-control') :
          true,
      panControl:
        this.mapElement.data('pan-control') ?
          this.mapElement.data('pan-control') :
          true,
      zoomControl:
        this.mapElement.data('zoom-control') ?
          this.mapElement.data('zoom-control') :
          true,
      scaleControl:
        this.mapElement.data('scale-control') ?
          this.mapElement.data('scale-control') :
          true,
      streetViewControl:
        this.mapElement.data('street-control') ?
          this.mapElement.data('street-control') :
          true,
      overviewMapControl:
        this.mapElement.data('overview-control') ?
          this.mapElement.data('overview-control') :
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
        this.mapElement.data('map-type') ?
          this.mapElement.data('map-type') :
          google.maps.MapTypeId.ROADMAP
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

    var routes = this.mapElement.data('route-waypoints');
    for (var i = 0; i < routes.length; i++) {
      this.drawRoute(routes[i]);
    }

    var postMarkers = this.mapElement.data('post-markers');
    if (postMarkers.length > 0)
      this.drawPostMarkers(postMarkers);

    if (myOptions['constrain_ne'] && myOptions['constrain_sw']) {

      var strictBounds = new google.maps.LatLngBounds(
        myOptions['constrain_sw'], myOptions['constrain_ne']
      );

      google.maps.event.addListener(this.map, 'bounds_changed', function() {
        if (strictBounds.contains(this.getCenter())) return;

        // We're out of bounds - Move the map back within the bounds
        var c = this.getCenter(),
        x = c.lng(),
        y = c.lat(),
        maxX = strictBounds.getNorthEast().lng(),
        maxY = strictBounds.getNorthEast().lat(),
        minX = strictBounds.getSouthWest().lng(),
        minY = strictBounds.getSouthWest().lat();

        if (x < minX) x = minX;
        if (x > maxX) x = maxX;
        if (y < minY) y = minY;
        if (y > maxY) y = maxY;

        this.setCenter(new google.maps.LatLng(y, x));
        console.log('center '+y+' '+x);
      });
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
        marker['url'], marker['summary'], 'post', null, marker['category']
      );
    }
  },

  addMarker: function(id, title, coords, icon, z, url, summary, type, route, category) {
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
      category: category
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
  },


  // Utility functions

  showRoute: function(routeId) {
    if (routeId) sjMap.routes[routeId].setMap(sjMap.map);
  },

  hideRoute: function(routeId) {
    if (routeId) sjMap.routes[routeId].setMap(null);
  },

  showRoutes: function(routeIds) {
    if (routeIds) {
      $.each( routeIds, function(index, value) {
        sjMap.showRoute(value);
      });
    }
  },

  hideRoutes: function(routeIds) {
    if (routeIds) {
      $.each( routeIds, function(index, value) {
        sjMap.hideRoute(value);
      });
    }
  },

  showMarker: function(markerId) {
    if (markerId) sjMap.markers[markerId].setMap(sjMap.map);
  },

  hideMarker: function(markerId) {
    if (markerId) sjMap.markers[markerId].setMap(null);
  },

  highlightMarker: function(markerId) {
    // visually highlight the marker
    // TODO: add some form of marker hilighting: colour border, animation?
  },

  showMarkers: function(markersIds) {
    if (markerIds) {
      $.each( markersIds, function(index, value) {
        sjMap.showMarker(value);
      });
    }
  },

  hideMarkers: function(markersIds) {
    if (markerIds) {
      $.each( markersIds, function(index, value) {
        sjMap.hideMarker(value);
      });
    }
  },

  showMarkersByCategory: function(categoryId) {
    $.each( sjMap.markers, function(index, value) {
      if (value && value.category == categoryId)
        sjMap.showMarker(value.id);
    });
  },

  hideMarkersByCategory: function(categoryId) {
    $.each( sjMap.markers, function(index, value) {
      if (value && value.category == categoryId)
        sjMap.hideMarker(value.id);
    });
  },

  showMarkersByRoute: function(routeId, showRoute, showPost) {
    $.each( sjMap.markers, function(index, value) {
      if ( value && value.route == routeId ) {
        if (showRoute && value.type == 'route') sjMap.showMarker(value.id);
        if (showPost && value.type == 'post') sjMap.showMarker(value.id);
      }
    });
  },

  hideMarkersByRoute: function(routeId, hideRoute, hidePost) {
    $.each( sjMap.markers, function(index, value) {
      if (value && value.route == routeId ) {
        if (hideRoute && value.type == 'route') sjMap.hideMarker(value.id);
        if (hidePost && value.type == 'post') sjMap.hideMarker(value.id);
      }
    });
  },

  // fadeRoute: function(routeId) {
  //   var op = 1;  // initial opacity
  //   var timer = setInterval(function () {
  //     if (op <= 0.1){
  //       clearInterval(timer);
  //       sjMap.routes[routeId].setOptions({ strokeOpacity: 0});
  //     }
  //     sjMap.routes[routeId].setOptions({ strokeOpacity: op});
  //     op -= op * 0.1;
  //   }, 100);
  // }
}
