
$(document).ready(function () {
  sjMap.initialize();
});

var sjMap = {

  iconPath: 'images/',
  map: null,
  mapElement: null,
  infowindow: null,

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
       mapTypeIds: [ 'Styled']
     },
     mapTypeId: 'Styled'
  }

  var styles = [];

  map = new google.maps.Map(mapElement.get(0), myOptions );
  var mapStyle = mapElement.data('map-style');
  console.log("style: "+mapStyle)
  if (mapStyle) {
    var styledMapType = new google.maps.StyledMapType(mapStyle, { name: 'Styled' } );
    map.mapTypes.set('Styled', styledMapType);
  }

  var infocontent = document.createElement("DIV");
  infowindow = new google.maps.InfoWindow({
    content: infocontent,
    maxWidth: 500
  });
   var mapElement = $('#map_canvas');
   var route = mapElement.data('route-waypoints');
   if (route.length > 0)
     this.drawRoute(route);
   var postMarkers = mapElement.data('post-markers');
   if (postMarkers.length > 0)
     this.drawPostMarkers(postMarkers);
  },

  drawRoute: function(markers) {
    var markerCoordinates = new Array();
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      markerCoordinates.push(coords);
      if ($('#map_canvas').data('route-show-markers') == 'yes') {
        this.addMarker(marker['name'], coords, marker['icon'], i, null, null);
      }
    }
    if ($('#map_canvas').data('route-show') == 'yes') {
      var stroke_style = $('#map_canvas').data('route-stroke').split(' ');
      var route = new google.maps.Polyline({
        path: markerCoordinates,
        strokeColor: stroke_style[0],
        strokeOpacity: stroke_style[1],
        strokeWeight: stroke_style[2]
      });
      route.setMap(map);
    }
  },

  drawPostMarkers: function(markers) {
    console.log('Add post markers');
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      console.log(marker);
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      this.addMarker( marker['name'], coords, marker['icon'],
        marker['index'], marker['url'], marker['summary']
      );
    }
  },

  addMarker: function(title, coords, icon, z, url, summary) {
    var iconUrl = icon ? this.iconPath + icon + '.png' : '';
    var marker = new google.maps.Marker({
      position: coords,
      map: map,
      icon: iconUrl,
      title: title,
      zIndex: z,
      url: url,
      html: summary
    });

    if (url) {
      google.maps.event.addListener(marker, "click", function() {
        alert('click');
        window.location.href = this.url;
      });
    }

    if (summary) {
      google.maps.event.addListener(marker, "mouseover", function() {
        infowindow.setContent('<div class="map-info-bubble-text">'+this.html+'</div>');
        infowindow.open(map, this);
      });
      google.maps.event.addListener(marker, "mouseout", function() {
        infowindow.close();
      });
    }
  }
}