var map;
var markers = [];
var polygon = null;
var placeMarkers = [];

var locations = [
    {title: 'Small Square', location: {lat: -25.487524, lng: -49.277417}},
    {title: 'My House', location: {lat:  -25.48736, lng: -49.278726}},
];

var ViewModel = function(){
	var self = this;
}

 // TODO: Complete the following function to initialize the map
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: -25.48736, lng: -49.278726},
	    zoom: 16,
	    mapTypeControl: false
	});

	var defaultIcon = makeMarkerIcon('0091ff');
    var highlightedIcon = makeMarkerIcon('FFFF24');

  	for(var i = 0; i < locations.length; i++){
	    var position = locations[i].location;
	    var title = locations[i].title;
	    var marker = new google.maps.Marker({
	      position: position,
	      title: title,
	      icon: defaultIcon,
	      animation: google.maps.Animation.DROP,
	      id: i
	    });
	    markers.push(marker);
	    marker.addListener('click', function(){
	      populateInfoWindow(this, largeInfoWindow);
	    });
	    marker.addListener('mouseover', function(){
	      this.setIcon(highlightedIcon);
	    });
	    marker.addListener('mouseout', function(){
	      this.setIcon(defaultIcon);
	    });
	}
	showListings();
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

function toggleDrawing(drawingManager){
  if(drawingManager.map){
    drawingManager.setMap(null);
    if(polygon){
      polygon.setMap(null);
    }
  }else{
    drawingManager.setMap(map);
  }
}

function populateInfoWindow(marker, infowindow){
    if(infowindow.marker != marker){
      infowindow.setContent('');
      infowindow.marker = marker;          
      infowindow.addListener('closeclick', function(){
        infowindow.setMarker(null);
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

function searchWithinPolygon(){
  for(var i = 0; i < markers.length; i++){
    if (google.maps.geometry.poly.containsLocation(markers[i].position, polygon)){
      markers[i].setMap(map);
    }else{
      markers[i].setMap(null);
    }
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

function searchWithinTime(){
  var distanceMatrixService = new google.maps.DistanceMatrixService();
  var address = document.getElementById('search-within-time-text').value;
  if(address == ''){
    alert("You must enter a valid address!");
  }else{
    hideListings(markers);
    var origins = [];
    for(var i = 0; i < markers.length; i++){
      origins[i] = markers[i].position;
    }
    var destination = address;
    var mode = document.getElementById('mode').value;
    distanceMatrixService.getDistanceMatrix({
      origins: origins,
      destinations: [destination],
      travelMode: google.maps.TravelMode[mode],
      unitSystem: google.maps.UnitSystem.IMPERIAL,          
    }, function(response, status){
      if(status !== google.maps.DistanceMatrixStatus.OK){
        alert("Error status was: " + status);
      }else{
        displayMarkersWithinTime(response);
      }
    });
  }
}

function displayMarkersWithinTime(response){
  var maxDuration = document.getElementById('max-duration').value;
  var origins = response.originAddresses;
  var destination = response.destinationAddresses;
  var atLeastOne = false;
  for(var i = 0; i < origins.length; i++){
    var results = response.rows[i].elements;
    for(var j = 0; j < results.length; j++){
      var element = results[j];
      if(element.status == "OK"){
        var distanceText = element.distance.text;
        var duration = element.duration.value / 60;
        var durationText = element.duration.text;
        if(duration <= maxDuration){
          markers[i].setMap(map);
          atLeastOne = true;
          var infowindow = new google.maps.InfoWindow({
            content: durationText + " away " + distanceText + "<div><input type='button' value='View Route' onclick='displayDirections(&quot;" + origins[i] + "&quot;)'></input></div>"
          });
          infowindow.open(map, markers[i]);
          markers[i].infowindow = infowindow;
          google.maps.event.addListener(markers[i], 'click', function(){
            this.infowindow.close();
          });
        }
      }
    }
  }
}

function displayDirections(origin){
  hideListings(markers);
  var directionsService = new google.maps.DirectionsService();
  var destinationAddress = document.getElementById('search-within-time-text').value;
  var mode = document.getElementById('mode').value;
  directionsService.route({
    origin: origin,
    destination: destinationAddress,
    travelMode: google.maps.TravelMode[mode],
  }, function(response, status){
    if(status === google.maps.DirectionsStatus.OK){
      var directionsDisplay = new google.maps.DirectionsRenderer({
        map: map,
        directions: response,
        draggable: true,
        polylineOptions: {
          strokeColor: 'green'
        }
      });
    }else{
      alert("Directions failed due to " + status);
    }
  });
}

function searchBoxPlaces(searchBox){
  hideListings(placeMarkers);
  var places = searchBox.getPlaces();
  createMarkersForPlaces(places);
  if(places.length == 0){
    alert("We did not find any places within your search!");
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

ko.applyBindings(new ViewModel());

 





