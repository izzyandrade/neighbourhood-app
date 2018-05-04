var map;
var markers = [];
var polygon = null;
var placeMarkers = [];
var infowindow;
var defaultIcon;
var highlightedIcon;

//hardcoded locations that will be displayed on the map
var locations = [
    {title: 'Small Square', location: {lat: -25.487558, lng: -49.277179}, type: 'Parks'},
    {title: 'Big Square', location: {lat: -25.489204, lng: -49.27602}, type: 'Parks'},
    {title: 'Dalpar', location: {lat:  -25.48942, lng: -49.280567}, type: 'Markets'},
    {title: 'Shopping Palladium', location: {lat:  -25.47784, lng: -49.290765}, type: 'Shopping'},
    {title: 'Shopping Total', location: {lat: -25.478744, lng: -49.294367}, type: 'Shopping'},
];

//this is the function that initializes the map, the locations, and the markers for it.
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
		this.address = '';
	}

	var Type = function(title){
		this.typeTitle = title;
	}

	var ViewModel = function(){
		var self = this;
		self.placeList = ko.observableArray([]);
		self.selectedType = ko.observable('');

		self.availableTypes = ko.observableArray([
			new Type('All'),
			new Type('Parks'),
			new Type('Markets'),
			new Type('Shopping'),
		]);

		//this is what I used to filter the locaitons, each location has a type
		//and when a location is clicked, it sends the type to knockout, then KO recognizes what type is it
		//and filter the places to show only the ones with the same type.
		self.getCurrentType = function() {
	        var newType = this.selectedType();
	        if(infowindow.marker != null){
	        	closeInfoWindow(infowindow);
	        }
	        self.placeList().forEach(function(place){
	        	place.marker.setIcon(defaultIcon);
	        	if(place.type == newType.typeTitle || newType.typeTitle == 'All'){
	        		place.marker.setVisible(true);
	        	}else{
	        		place.marker.setVisible(false);
	        	}
	        });
	        if (newType.typeTitle == 'All' || !newType){
	            return this.placeList;
	        }
	        return this.placeList().filter(function(f) {
	            return f.type == newType.typeTitle;
	        });
	    }

		locations.forEach(function(loc){
			self.placeList.push(new Location(loc));
		});

		//go through all the locations and display markers for them.
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
		      self.currentPlace(place);
		    });
		    place.marker = marker;
		});

		//this functions returns the address of the places from the foursquare API.
	    self.placeList().forEach(function(place) {
	        // Set initail variables to build the correct URL for each space
	        // AJAX call to Foursquare
	        client_id = "HVJ5D5EH2TEFUVCSGSHZN11LZM4OHYT0S5RBLCG10ADAHR43";
			client_secret = "XH4MUXCD2JBYWO0EJFTV5Y434PEX55JZ03ETXVUMYBYW5SYH";
			content_fs = '';
			ll = place.location.lat+","+ place.location.lng;
			var baseurl = 'https://api.foursquare.com/v2/venues/search/?client_id='+client_id+"&client_secret="+client_secret+"&ll="+ll+"&v=20181604";
			$.ajax({
				type: "GET",
				dataType: "json",
				cache: false,
				url: baseurl,
				success: function(data) {
					place.address = data.response.venues[0].location.address;
				}
			}).fail(function(XMLHttpRequest, textStatus, errorThrown){
				alert("Request failed! Error: " + errorThrown);
			});
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
		var center =  new google.maps.LatLng(clickedPlace.location);
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

//this function populates the markers infowindows. 
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
      var content = '';
      function getStreetView(data, status){
        if(status == google.maps.StreetViewStatus.OK){
          var nearStreetViewLocation = data.location.latLng;
          var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
          content += "<div>" + marker.title + "</div><div id='pano'></div>";
          infowindow.setContent(content);
          var panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 30
            }
          };
          var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
        }else{
        	content += "<div>"+ marker.title + "</div><div>No Street View Found</div>";
          	infowindow.setContent(content);
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

function googleError(){
	alert("Google maps API failed to load!");
}


 





