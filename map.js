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

var sjMap = function(elementId){
  this.iconPath = 'images/';       // path to marker icon images
  this.map = null;                 // conatins the google map object
  this.mapElement = elementId ? $(elementId) : $('#map_canvas');        // the DOM element containing the map
  this.infoWindow = null;          // the googlemap infoWindow object used for info bubbles
  this.routes = new Array();       // array of route polyline objects
  this.markers = new Array();      // array of map marker objects
  this.markersIndex = new Array(); // array of markers ids
  this.categories = new Array();   // array of map marker categories
  this.animOptions = null;         // animation Options hash
  this.anim = null;                // animation object
  this.instance = this;            // keeping track

  // setup functions
  this.initialize = function(elementId){
    // set up map using data attribute settings or defaults
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
          true
    }

    // Map type settings
    // All available map types
    var typeIds = new Array();
    if (mapOptions.mapTypeOptions) {
      if (mapOptions.mapType.toUpperCase().indexOf('ROADMAP'))
        typeIds.push(google.maps.MapTypeId.ROADMAP);
      if (mapOptions.mapType.toUpperCase().indexOf('SATELLITE'))
        typeIds.push(google.maps.MapTypeId.SATELLITE);
      if (mapOptions.mapType.toUpperCase().indexOf('HYBRID'))
        typeIds.push(google.maps.MapTypeId.HYBRID);
      if (mapOptions.mapType.toUpperCase().indexOf('TERRAIN'))
        typeIds.push(google.maps.MapTypeId.TERRAIN);
      if (this.mapElement.data('map-style') && mapOptions.mapType.toUpperCase().indexOf('STYLED'))
        typeIds.push('Styled');
    } else {
      // default map types
      typeIds = [
        google.maps.MapTypeId.ROADMAP,
        google.maps.MapTypeId.SATELLITE,
        google.maps.MapTypeId.HYBRID,
        google.maps.MapTypeId.TERRAIN
      ];
      if (this.mapElement.data('map-style'))
        typeIds.push('Styled');
    }

    myOptions.mapTypeControlOptions = {
      mapTypeIds: typeIds,
      // TODO: control type and position should be configurable
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      position: google.maps.ControlPosition.TOP_RIGHT
    };

    // selected type
    var mapType = mapOptions.mapType ? mapOptions.mapType.toUpperCase() : '' ;
    switch(mapType) {
      case 'ROADMAP':
        myOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
      break;
      case 'SATELLITE':
        myOptions.mapTypeId = google.maps.MapTypeId.SATELLITE;
      break;
      case 'HYBRID':
        myOptions.mapTypeId = google.maps.MapTypeId.HYBRID;
      break;
      case 'TERRAIN':
        myOptions.mapTypeId = google.maps.MapTypeId.TERRAIN;
      break;
      case 'STYLED':
        myOptions.mapTypeId = 'Styled';
      break;
      default:
        myOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
    }

    // TODO: cluster options should be configurable
    var clusterOptions = {
      batchSize: 100,
      averageCenter: true,
      enableRetinaIcons: true,
      gridSize: 20
    }

    // initialize map
    this.map = new google.maps.Map(this.mapElement.get(0), myOptions );

    // add custom style if defined
    var mapStyle = this.mapElement.data('map-style');
    if (mapStyle) {
      var styledMapType = new google.maps.StyledMapType(mapStyle, { name: 'Styled' } );
      this.map.mapTypes.set('Styled', styledMapType);
    }

    // initialize infowindow object
    var infocontent = document.createElement("DIV");
    this.infoWindow = new google.maps.InfoWindow({
      content: infocontent,
      maxWidth: 500
    });

    // initialise custom infoBox object
    var infoBoxDiv = $("<div>", {class: "infoBoxWrapper", id: "infoBoxWrapper"});
    this.mapElement.append(infoBoxDiv);

    this.infoBox = new InfoBox({
      content: document.getElementById("infoBoxWrapper"),
      disableAutoPan: false,
      maxWidth: "400px",
      pixelOffset: new google.maps.Size(-200, 0),
      zIndex: null,
      closeBoxURL: "",
      infoBoxClearance: new google.maps.Size(1, 1)
    });


    // setup marker, category and route variables from element data-attributes
    var postMarkers = this.mapElement.data('post-markers');
    var categories = this.mapElement.data('categories');
    var routes = this.mapElement.data('route-waypoints');

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
      this.markerCluster = new MarkerClusterer(this.map, this.markers, clusterOptions);

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
    if (this.mapElement.data('animate')) {
      this.animOptions = this.mapElement.data('animate');
      this.animOptions.position = 0;

      if (this.animOptions.post) {
        this.animOptions.markers = this.objectFindByKey(this.markers, 'type', 'post');
      } else if (this.animOptions.route) {
        this.animOptions.markers = this.objectFindByKey(this.markers, 'route', this.animOptions.route);
      }
      var _self = this;
      if (this.animOptions.markers && this.animOptions.enabled && this.animOptions.autoStart) {
        google.maps.event.addListenerOnce(this.map, 'tilesloaded', function() {
          _self.anim = setTimeout(function(){_self.playAnim();}, _self.animOptions.delay);
        });
      }
      if (! this.animOptions.hideControls)
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
          marker['id'], marker['name'], coords, marker['icon'], i, null, null, null,
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
      routeLine.setMap(this.map);
    }
    this.routes[routeLine.id] = routeLine;
  }

  this.drawPostMarkers = function(markers) {
    // draw map markers from an array of post data
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var coords = new google.maps.LatLng(marker['lat'], marker['lng']);
      this.addMarker(
        marker['id'], marker['name'], coords, marker['icon'], marker['index'],
        marker['url'], marker['image'], marker['summary'], 'post', marker['route'], marker['cat']
      );
    }
  }

  this.addMarker = function(id, title, coords, icon, z, url, image, summary, type, route, categories) {
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
      image: image,
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
      var _self = this;
      google.maps.event.addListener(marker, "mouseover", function() {
        _self.openInfoWindow(this);
        // _self.infoWindow.setContent('<div class="map-info-bubble-text">'+this.html+'</div>');
        // _self.infoWindow.open(this.map, this);
      });
      google.maps.event.addListener(marker, "mouseout", function() {
        _self.infoBox.setVisible(false);
      });
    }
    this.markers[marker.id] = marker;
    this.markersIndex.push(marker.id);
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
    if (this.markers) {
      for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i]) this.hideMarker(this.markers[i].id);
      }
    }
    if (this.routes) {
      for (var i = 0; i < this.routes.length; i++) {
        if (this.routes[i]) this.hideRoute(this.routes[i].id);
      }
    }
  }

  this.showAll = function(showRoutes, showMarkers) {
    // make all markers and routes visible
    if (showMarkers) {
      for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i]) this.showMarker(this.markers[i].id);
      }
    }
    if (showRoutes) {
      for (var i = 0; i < this.routes.length; i++) {
        if (this.routes[i]) this.showRoute(this.routes[i].id);
      }
    }
  }

  this.showRoute = function(routeId) {
    // make the route with id routeId visible
    if (routeId && this.routes[routeId]) this.routes[routeId].setMap(this.map);
  }

  this.hideRoute = function(routeId) {
    // make the route with id routeId hidden
    if (routeId && this.routes[routeId]) this.routes[routeId].setMap(null);
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
    if (markerId && this.markers[markerId]) this.markers[markerId].setMap(this.map);
  }

  this.hideMarker = function(markerId) {
    // make the marker with id markerId hidden
    if (markerId && this.markers[markerId]) this.markers[markerId].setMap(null);
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
    if (this.markers) {
      for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i] && this.markers[i].categories && this.markers[i].categories.split(',').indexOf(categoryId.toString()) > -1) {
          this.showMarker(this.markers[i].id);
        } else if (this.markers[i] && clear) {
          this.hideMarker(this.markers[i].id);
        }
      }
    }
  }

  this.hideMarkersByCategory = function(categoryId) {
    // make the markers with the categoryId hidden
    if (this.markers) {
      for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i] && this.markers[i].categories && this.markers[i].categories.split(',').indexOf(categoryId) > -1 )
        this.hideMarker(this.markers[i].id);
      }
    }
  }

  this.showMarkersByRoute = function(routeId, route, post, clear) {
    // make the markers with the routeId visible,
    // route = true : show route markers
    // post = true : show post markers
    // clear = true : clear all other markers
    if (this.markers) {
      for (var i = 0; i < this.markers.length; i++) {
        if ( this.markers[i] && this.markers[i].route == routeId ) {
          if (route && this.markers[i].type == 'route') this.showMarker(this.markers[i].id);
          if (post && this.markers[i].type == 'post') this.showMarker(this.markers[i].id);
        } else if (this.markers[i] && clear) {
          this.hideMarker(this.markers[i].id);
        }
      }
    }
  }

  this.hideMarkersByRoute = function(routeId, route, post) {
    // make the markers with the routeId hidden,
    // route = true : hide route markers
    // post = true : hide post markers
    if (this.markers) {
      for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i] && this.markers[i].route == routeId ) {
          if (route && this.markers[i].type == 'route') this.hideMarker(this.markers[i].id);
          if (post && this.markers[i].type == 'post') this.hideMarker(this.markers[i].id);
        }
      }
    }
  }

  this.playAnim = function() {
    // pan map to each marker in turn and open infowindow
    var _self = this;
    if (this.animOptions.position < this.animOptions.markers.length) {
      this.gotoMarker(this.animOptions.markers[this.animOptions.position]);
      this.anim = setTimeout(function(){_self.playAnim();}, _self.animOptions.delay);
      $(this).find('.sjMapPlaybackPlayPause').text('Pause');
    } else if (this.animOptions.loop) {
      this.animOptions.position = 0;
      this.gotoMarker(this.animOptions.markers[this.animOptions.position]);
      this.anim = setTimeout(function(){_self.playAnim();}, _self.animOptions.delay);
    } else {
      clearTimeout(this.anim);
      this.animOptions.position = 0;
      this.anim = null;
      $(this).find('.sjMapPlaybackPlayPause').text('Play');
    }
    this.animOptions.position += 1;
  }


  this.gotoMarker = function(marker, markerId) {
    // pan map to marker and open infowindow
    if (! marker)
      var marker = this.objectFindByKey(markers, 'id', markerId);
    this.map.panTo(marker.getPosition());
    this.openInfoWindow(marker);
  }

  this.openInfoWindow = function(marker, markerId) {
    if (!marker)
      var marker = this.objectFindByKey(markers, 'id', markerId);
    var content = '<div class="customInfoBox"><div class="customInfoBoxContent">';
    if (marker.image)
        content += '<img src="'+ marker.image + '" alt = "' + marker.title + '" class="customInfoBoxFeaturedImage"/>';
    if (marker.html)
      content += '<div class="customInfoBoxSummary">' + marker.html + '</div>';
    content += '</div></div>';

    this.infoBox.setContent(content);
    //if (!this.infoBox.getVisible())
      this.infoBox.open(this.map, marker);
    this.infoBox.setVisible(true);


    //this.infoWindow.setContent(content);
    //this.infoWindow.open(this.map, marker);
  }

  this.buildRouteDropdown = function(routes) {
    // build a map dropdown control for routes
    if (routes && routes.length > 0) {
      var _self = this;
      var dropDownItems = new Array();
      for (var i = 0; i < routes.length; i++) {
        var divOptions = {
          name: routes[i].name,
          title: '',
          className: 'sjMapRouteControl',
          objid: routes[i].id,
          action: function(){
            _self.hideAll();
            _self.showRoute(this.dataset.objid);
            _self.showMarkersByRoute(this.dataset.objid, true, true);
          }
        }
        dropDownItems.push(new this.optionDiv(divOptions));
      }

      var divOptions = {
        name: 'Show All',
        title: '',
        className: 'sjMapRouteControl-all',
        action: function(){
          _self.showAll(true, true);
        }
      }
      dropDownItems.push(new this.separator());
      dropDownItems.push(new this.optionDiv(divOptions));

      var dropDownOptions = { items: dropDownItems, id: 'routeDropDown' };
      var routeDropDownDiv = new this.dropDownOptionsDiv(dropDownOptions);
      var dropDownOptions = {
        name: 'Routes',
        className: 'sjMapRouteDD',
        title: '',
        position: google.maps.ControlPosition.TOP_RIGHT,
        dropDown: routeDropDownDiv
      }
      var routeDropDown = this.dropDownControl(dropDownOptions);

    }
  }

  this.buildCategoryDropdown = function(categories) {
    if (categories && categories.length > 0) {
      // build a map dropdown control for marker categories
      var _self = this;
      var dropDownItems = new Array();
      for (var i = 0; i < categories.length; i++) {
        var divOptions = {
          name: categories[i].name,
          className: 'sjMapCategoryControl',
          objid: categories[i].id,
          action: function(){
            _self.showMarkersByCategory(this.dataset.objid, true);
          }
        }
        dropDownItems.push(new this.optionDiv(divOptions));
      }

      var divOptions = {
        name: 'Show All',
        title: '',
        className: 'sjMapCategoryControl-all',
        action: function(){
          _self.showAll(false, true);
        }
      }
      dropDownItems.push(new this.separator());
      dropDownItems.push(new this.optionDiv(divOptions));

      var dropDownOptions = { items: dropDownItems, id: 'categoryDropDown' };
      var categoryDropDownDiv = new this.dropDownOptionsDiv(dropDownOptions);
      var dropDownOptions = {
        name: 'Categories',
        className: 'sjMapCategoryDD',
        title: '',
        position: google.maps.ControlPosition.TOP_RIGHT,
        dropDown: categoryDropDownDiv
      }
      var categoryDropDown = this.dropDownControl(dropDownOptions);

    }
  }

  this.buildPlaybackControls = function() {
    var _self = this;
    var buttonOptions = {
      name: 'Play',
      className: 'sjMapPlaybackPlayPause',
      title: '',
      position: google.maps.ControlPosition.TOP_RIGHT,
      action: function(){
        if (_self.anim) {
          clearTimeout(_self.anim);
          _self.anim = null;
          $(this).text('Play');
        } else {
          _self.playAnim();
          $(this).text('Pause');
        }
      }
    }
    var playbackControls = this.buttonControl(buttonOptions);
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
    container.className = options.className ?
      'dropDownOptionsDiv ' + options.className : 'dropDownOptionsDiv';
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
    control.className = options.className ?
      'dropDownControl '+ options.className : 'dropDownControl';
    control.innerHTML = options.name;
    control.id = options.id;
    var arrow = document.createElement('IMG');
    arrow.src = "http://maps.gstatic.com/mapfiles/arrow-down.png";
    arrow.className = 'dropDownArrow';
    control.appendChild(arrow);
    container.appendChild(control);
    container.appendChild(options.dropDown);
    this.map.controls[options.position].push(container);
    google.maps.event.addDomListener(container, 'click', function() {
      var dropDown = $(this).find('.dropDownOptionsDiv');
      (dropDown.css('display') == 'block') ?
        dropDown.css('display', 'none') : dropDown.css('display', 'block');
    })
  }

  this.buttonControl = function(options) {
    var control = document.createElement('DIV');
    control.innerHTML = options.name;
    control.id = options.id;
    control.className = options.className ?
      'button container ' + options.className : 'button container';
    control.index = options.index ? options.index : 1 ;
    this.map.controls[options.position].push(control);
    google.maps.event.addDomListener(control, 'click', options.action);
  }
}