
$(document).ready(function () {
  sjMap.initialize();
});

var sjMap = {

  iconPath: 'images/',
  map: null,
  mapElement: null,
  infoWindow: null,

  initialize: function(){
    // set up map using data attribute settings or defaults
    mapElement = $('#map_canvas');
    var myOptions = {
      backgroundColor:
        mapElement.data('background-color') ?
          mapElement.data('background-color') :
          "#B3D1FF",
      zoom:
        mapElement.data('zoom') ?
          mapElement.data('zoom') :
          4,
      center:
        mapElement.data('center') ?
          new google.maps.LatLng(mapElement.data('center')) :
          new google.maps.LatLng(-23.6, 133.3),
      mapTypeControl:
        mapElement.data('type-control') ?
          mapElement.data('type-control') :
          true,
      panControl:
        mapElement.data('pan-control') ?
          mapElement.data('pan-control') :
          true,
      zoomControl:
        mapElement.data('zoom-control') ?
          mapElement.data('zoom-control') :
          true,
      scaleControl:
        mapElement.data('scale-control') ?
          mapElement.data('scale-control') :
          true,
      streetViewControl:
        mapElement.data('street-control') ?
          mapElement.data('street-control') :
          true,
      overviewMapControl:
        mapElement.data('overview-control') ?
          mapElement.data('overview-control') :
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
        mapElement.data('map-type') ?
          mapElement.data('map-type') :
          google.maps.MapTypeId.ROADMAP
    }

    map = new google.maps.Map(mapElement.get(0), myOptions );
    var mapStyle = mapElement.data('map-style');

    if (mapStyle) {
      var styledMapType = new google.maps.StyledMapType(mapStyle, { name: 'Styled' } );
      map.mapTypes.set('Styled', styledMapType);
    }

    var infocontent = document.createElement("DIV");
    infoWindow = new google.maps.InfoWindow({
      content: infocontent,
      maxWidth: 500
    });

    var routes = mapElement.data('route-waypoints');
    for (var i = 0; i < routes.length; i++) {
      this.drawRoute(routes[i]);
    }

    var postMarkers = mapElement.data('post-markers');
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
      routeLine.setMap(map);
    }
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
      map: map,
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
        infoWindow.setContent('<div class="map-info-bubble-text">'+this.html+'</div>');
        infoWindow.open(map, this);
      });
      google.maps.event.addListener(marker, "mouseout", function() {
        infoWindow.close();
      });
    }
  }
}