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
      center:
        this.mapElement.data('center') ?
          new google.maps.LatLng(mapElement.data('center')) :
          new google.maps.LatLng(-23.6, 133.3),
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
        this.addMarker( marker['name'], coords, marker['icon'], i, null, null, route['id'], null );
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
        id: route['id']
      });
      routeLine.setMap(this.map);
    }
    this.routes.push(routeLine);
  },

  drawPostMarkers: function(markers) {
    // draw map markers from an array of post data
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      this.addMarker(
        marker['name'], coords, marker['icon'], marker['index'],
        marker['url'], marker['summary'], null, marker['category']
      );
    }
  },

  addMarker: function(title, coords, icon, z, url, summary, route, category) {
    // add marker to map and store additional attributes to allow identifying
    // marker by route or category.
    var iconUrl = icon ? this.iconPath + icon + '.png' : this.iconPath + '0.png';
    var marker = new google.maps.Marker({
      position: coords,
      map: this.map,
      icon: iconUrl,
      title: title,
      zIndex: z,
      url: url,
      html: summary,
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

    this.markers.push(marker);
  }
}