var map;
var markers = [];
var polygon = null;
var placeMarkers = [];
var infowindow;
var defaultIcon;
var highlightedIcon;

var locations = [
    {title: 'Small Square', location: {lat: -25.487558, lng: -49.277179}, type: 'Parks'},
    {title: 'Big Square', location: {lat: -25.489204, lng: -49.27602}, type: 'Parks'},
    {title: 'My House', location: {lat:  -25.48736, lng: -49.278726}, type: 'Houses'},
];

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: -25.48736, lng: -49.278726},
	    zoom: 13,
	    mapTypeControl: false
	});

	infowindow = new google.maps.InfoWindow();
	defaultIcon = makeMarkerIcon('0091ff');
    highlightedIcon = makeMarkerIcon('FFFF24');

	map.addListener("click", function(){
		setDefaultIcons();
	   	closeInfoWindow(infowindow);
	});

	var Location = function(data){
		this.title = ko.observable(data.title);
		this.location = data.location;
		this.type = data.type;
		this.marker = '';
	}

	var Type = function(title){
		this.typeTitle = title;
	}

	var ViewModel = function(){
		var self = this;
		self.placeList = ko.observableArray([]);
		self.selectedType = ko.observable('');

		self.availableTypes = ko.observableArray([
			new Type('Parks'),
			new Type('Houses'),
			new Type('Markets'),
		]);

		self.getCurrentType = function() {
	        var newType = this.selectedType();

	        self.placeList().forEach(function(place){
	        	if(place.type == newType.typeTitle){
	        		place.marker.setVisible(true);
	        	}else{
	        		place.marker.setVisible(false);
	        	}
	        });

	        if (!newType){
	            return this.placeList;
	        }

	        return this.placeList().filter(function(f) {
	            return f.type == newType.typeTitle;
	        });

	    }

		locations.forEach(function(loc){
			self.placeList.push(new Location(loc));
		});

		self.placeList().forEach(function(place){
		    var position = place.location;
		    var title = place.title();
		    var marker = new google.maps.Marker({
		      position: position,
		      title: title,
		      icon: defaultIcon,
		      animation: google.maps.Animation.DROP,
		    });
		    markers.push(marker);
		    marker.addListener('click', function(){
		      showInfo(this, null);
		    });
		    place.marker = marker;
		});

		self.currentPlace = ko.observable(self.placeList()[0]);

		self.changePlace = function(clickedPlace) {
			self.currentPlace(clickedPlace);
			showInfo(null, clickedPlace);
		};

		showListings();
	}
	ko.applyBindings(new ViewModel());
}



 // TODO: Complete the following function to initialize the map

function setDefaultIcons(){
	for(var i = 0; i < markers.length; i++){
		markers[i].setIcon(defaultIcon);
	}
}

function showInfo(marker, clickedPlace){
	if(marker == null){
		var center = new google.maps.LatLng(clickedPlace.location);
		for(var i = 0; i < markers.length; i++){
			if(markers[i].title == clickedPlace.title()){
				marker = markers[i];
			}
		}
		map.panTo(center);
	}else{
		map.panTo(marker.position);
	}
	setDefaultIcons();
	marker.setIcon(makeMarkerIcon('FFFF24'));
	populateInfoWindow(marker, infowindow);
}

function makeMarkerIcon(markerColor){
  var markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21,34)
  );
  return markerImage;
}

function closeInfoWindow(infowindow){
	infowindow.close(infowindow);
    infowindow.marker = null;
}

function populateInfoWindow(marker, infowindow){
    if(infowindow.marker != marker){
      infowindow.setContent('');
      infowindow.marker = marker;          
      infowindow.addListener('closeclick', function(){
      	marker.setIcon(defaultIcon);
      	closeInfoWindow(infowindow);
      });
      var streetViewService = new google.maps.StreetViewService();
      var radius = 50;
      function getStreetView(data, status){
        if(status == google.maps.StreetViewStatus.OK){
          var nearStreetViewLocation = data.location.latLng;
          var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
          infowindow.setContent("<div>" + marker.title + "</div><div id='pano'></div>");
          var panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 30
            }
          };
          var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
        }else{
          infowindow.setContent("<div>"+ marker.title + "</div><div>No Street View Found</div>");
        }
      }
      streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
      infowindow.open(map, marker);
    }
}

function showListings(){
  var bounds = new google.maps.LatLngBounds();
  for(var i = 0; i < markers.length; i++){
    markers[i].setMap(map);
    bounds.extend(markers[i].position);
  }
  map.fitBounds(bounds);
}

function hideListings(markers){
  for(var i = 0; i < markers.length; i++){
    markers[i].setMap(null);
  }
}

function zoomToArea(){
  var geocoder = new google.maps.Geocoder();
  var address = document.getElementById('zoom-to-area-text').value;
  if(address == ''){
    alert("You must enter an area or an address!");
  }else {
    geocoder.geocode({
      address: address,
      componentRestrictions: {locality: 'New York'}
    }, function(results, status){
        if(status == google.maps.GeocoderStatus.OK){
          map.setCenter(results[0].geometry.location);
          map.setZoom(15);
        }else {
          alert("We could not find that place, try a more specific address!");
        }
    });
  }
}

function textSearchPlaces(){
  var bounds = map.getBounds();
  hideListings(placeMarkers);
  var placesService = new google.maps.places.PlacesService(map);
  placesService.textSearch({
    query: document.getElementById('places-search').value,
    bounds: bounds,
  }, function(results, status){
    if(status == google.maps.places.PlacesServiceStatus.OK){
      createMarkersForPlaces(results);
    }
  });
}

function createMarkersForPlaces(places){
  var bounds = new google.maps.LatLngBounds();
  for(var i = 0; i < places.length; i++){
    var place = places[i];
    var icon = {
      url: place.icon,
      size: new google.maps.Size(35, 35),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(15, 34),
      scaledSize: new google.maps.Size(25, 25)
    };
    var marker = new google.maps.Marker({
      map: map,
      icon: icon,
      title: place.name,
      position: place.geometry.location,
      id: place.place_id
    });

    var placeInfoWindow = new google.maps.InfoWindow();
      // If a marker is clicked, do a place details search on it in the next function.
      marker.addListener('click', function() {
        if (placeInfoWindow.marker == this) {
          console.log("This infowindow already is on this marker!");
        } else {
          getPlacesDetails(this, placeInfoWindow);
        }
      });
      placeMarkers.push(marker);
      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    }
    map.fitBounds(bounds);
}

function getPlacesDetails(marker, infowindow){
  var service = new google.maps.places.PlacesService(map);
  service.getDetails({
    placeId: marker.id,
  }, function(place, status){
    if(status === google.maps.places.PlacesServiceStatus.OK){
      infowindow.marker = marker;
      var innerHTML = '<div>';
      if(place.name){
        innerHTML += '<strong>' + place.name + '</strong>';
      }
      if(place.formatted_address){
        innerHTML += '<br>' + place.formatted_address;
      }
      if(place.formatted_phone_number){
        innerHTML += '<br>' + place.formatted_phone_number;
      }
      if(place.photos){
        innerHTML += '<br><br><img src="' + place.photos[0].getUrl({maxHeight: 100, maxWidth: 200}) + '">';
      }
      innerHTML += '</div>';
      infowindow.setContent(innerHTML);
      infowindow.open(map, marker);
      infowindow.addListener('closeclick', function(){
        infowindow.marker = null;
      });
    }
  });
}



 





