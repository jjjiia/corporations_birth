function renderScreenshot(canvas, scaleFactor) {
	var ctx = canvas.getContext('2d');
	var screenshotCanvas = document.createElement('canvas'); 
	var screenshotCtx = screenshotCanvas.getContext('2d');
	screenshotCanvas.width = canvas.width * scaleFactor; 
	screenshotCanvas.height = canvas.height * scaleFactor;
	screenshotCtx.drawImage(canvas, 0, 0, canvas.width * scaleFactor, canvas.height * scaleFactor);
	return screenshotCanvas.toDataURL();
}

function makeGridPoints(gridNWCorner, numCellsX, numCellsY, cellWidth) {
    var currentPoint = gridNWCorner; 
    gridPoints = [];
    gridPoints.push(currentPoint); 
    var pointNextRow = google.maps.geometry.spherical.computeOffset(currentPoint, cellWidth, 180); 
    for (var i = 1; i <= numCellsY; i++) {
      for (var j = 1; j < numCellsX; j++) {
        currentPoint = google.maps.geometry.spherical.computeOffset(currentPoint, cellWidth, 90); 
        gridPoints.push(currentPoint);
      }
      currentPoint = pointNextRow; 
      gridPoints.push(currentPoint); 
      pointNextRow = google.maps.geometry.spherical.computeOffset(currentPoint, cellWidth, 180);
    }
  return gridPoints;
}

function displayMarkers(points, map) {
  for (var i = 0; i < points.length; i++) {
    var marker = new google.maps.Marker({
      position: points[i],
      map: map,
    });
  }
}

function fromLngLatListToGMapLatLng(coords) {
  var latlngs = [];
  for (var i = 0; i < coords.length; i++) {
    latlngs.push(new google.maps.LatLng(coords[i][1], coords[i][0]));
  }
  return latlngs;
}


BoundaryChecker = function (source, onFetchHandler) {
  this.shapes = []; 
  this.handler = onFetchHandler;
  var that = this; 
  var minArea = 2000000; 

  $.getJSON(source, {}, function (response) {
    console.log('Getting boundaries ...')
    var features = response['features']; 
    for (var i = 0; i < features.length; i++) {
      var feature = features[i]; 
      if (feature['geometry']['type'] == 'Polygon') {
        var latlngCoords = fromLngLatListToGMapLatLng(feature['geometry']['coordinates'][0]);
        var area = google.maps.geometry.spherical.computeArea(latlngCoords); 
        if (area < minArea) continue;
        that.shapes.push(new google.maps.Polygon({
          paths: latlngCoords,
        }));
      } else {
        var polygons = feature['geometry']['coordinates'];
        for (var j = 0; j < polygons.length; j++) {
          var latlngCoords = fromLngLatListToGMapLatLng(polygons[j][0]);
          var area = google.maps.geometry.spherical.computeArea(latlngCoords); 
          if (area < minArea) continue;
          that.shapes.push(new google.maps.Polygon({
            paths: latlngCoords,
          }));
        }
      }
    }
    console.log('Done. Number of polygons:', that.shapes.length);

    that.handler();
  });
}

BoundaryChecker.prototype  = {
  containsPoint: function (latlng) {
    for (var i = 0; i < this.shapes.length; i++) {
      if (google.maps.geometry.poly.containsLocation(latlng, this.shapes[i])) {
        return true;
      }
    }
    return false;
  }
}