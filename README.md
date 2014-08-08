gm-post-mapping
===============

Experimental JavaScript functions for populating a googlemap with markers and
polyline routes.

Geodata and config options are read from data attributes on the #map_canvas
div which is also the element that will contain the googlemap. This js is
intended to be worked into a more extensive WordPress plug-in which will
handle all the data collation, hence not worrying about it here.

By the way the intended destination as part of a WordPress plug-in also
explains the somewhat daunting number of settings...
trying to be as flexible as possible so it would probably be useful in other
contexts too

##TODO##

* Custom  map controls for routes and category selection
* Tidy up custom control Listeners and styles
* Custom info panel (alternative to the ubiquitous info bubble)
* Tidy up  infowindow styles
* Marker clustering
* Complete support for route/category ids in marker json
* Highlight selected marker animation?
* Animate a map route, (run though route markers in sequence)
* Fix boundary limits

##Phase 2##

Stop messing about with the JavaScript and bolt into the skeleton WorPress
plug-in to check I've not overlooked any obvious functionality.