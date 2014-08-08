gm-post-mapping
===============

Experimental javascript functions for populating a googlemap with markers and
polyline routes.

Geodata and config options are read from data attributes on the #map_canvas
div which is also the element that will contain teh googlemap. This js is
intended to be worked into a more extensive WordPress plugin which will
handle all the data collation, hence not worrying about it here.

By the way the intended destination as part of a WordPress plugin also
explains the somewhat daunting number of settings...
trying to be as flexible as possible so it would probablyu be useful in other
contexts too

##TODO##

* Custom  map controls for routes and category selection
* Tidy up custom control Listeners and styles
* Custom info panel (alternative to the ubiqitous info bubble)
* Tidy up  infowindow styles
* Hilight selected marker animation?
* Animate a map route, (run though route markers in sequence)
* Fix boundry limits

##Phase 2##

Stop messing about with the javascript and bolt into the skeleton WorPress
plugin to check I've not overlooked any obvious functionality.