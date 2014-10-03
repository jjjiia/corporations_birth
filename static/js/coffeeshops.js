var places, map, points, pointsD;
var placePoints = d3.map();
var bbox = [[-122.44882, 37.80402], [-122.385134, 37.76488]]; 
var maxDistances = d3.map();
var globalPoints = [];

var round = 0;
var ctx;

var interactionSvg;
var essayBoxShown = false;

var gridColors = ['#4CBA96', '#96C957', '#D1ED1C', '#EDB51C', '#ED731C', '#ED1C1C',
'#3DB3A3', '#1CD5ED', '#1C81ED', '#5F1CED', '#AB1CED', '#ED1CED',
'#ED1CAB', '#ED1C69', '#F77F6D', '#F7B76D', '#F7DC6D', '#F0F76D', 
'#BBF76D', '#3DBA4C', '#07A0A8', '#568791', '#6DA7F7', '#E36DF7', 
'#686869', '#2182D1', '#8576B3'];

var line = d3.svg.line()
	.interpolate("basis-closed")
	.x(function (d) { return d[0]})
	.y(function (d) { return d[1]});

if (typeof MAX_OPACITY == 'undefined') {
	MAX_OPACITY = 0.5
}

if (typeof SHOW_BOUNDARY == 'undefined') {
	SHOW_BOUNDARY = true;
}
	
window.onload = function () {
	
	var mapOptions = {
		src: BOUNDARY_URL, 
		width: WIDTH, 
		height: HEIGHT,
		scale: SCALE,
		svgContainer: '#mapContainer',
		lookup: GIS_LOOKUP,
		mapColor: '#fff'
	}
	
	if (typeof ROADS_URL != 'undefined') {
		mapOptions.roads = ROADS_URL
	}
	
	if (typeof BBOX != 'undefined') {
		mapOptions.bbox = BBOX;
	}
	
	map = new D3Map(mapOptions); 
	
	map.loadGeoJSON(function () {
		map.svg.select('.boundary').attr('fill', '#fcfcfc').attr('stroke', '#dedede').attr('opacity', 0.0);
		map.svg.select('.road').attr('opacity', 0.0);
		var path = d3.geo.path().projection(map.projection);
		
		
		d3.json(PLACES_URL, function (error, placeData) {
			places = placeData.places;
			places.forEach(function (d, i) {
				placePoints.set(d.id, []);
				maxDistances.set(d.id, d.max_distance)
			});
			d3.json(POINTS_URL, function (error, pointsData) {
				points = pointsData.points;
				points.forEach(function (d, i) {
					if (placePoints.has(d.place_id)) {
						placePoints.get(d.place_id).push(d); 
					}
				});
				//draw();
				d3.select('#mapContainer').select('i').remove();
				drawCanvas();
				if (SHOW_BOUNDARY) map.svg.select('.boundary').attr('opacity', 1.0);
				map.svg.select('.road').attr('opacity', 0.2);
			});
		});
	}); 
	
	setupLightBox();
	setupBackButton();
}

function draw() {
	
	for (var i = 0; i < places.length; i++) {
		var color = gridColors[(i % gridColors.length)];
		var place = places[i]; 
		var pts = placePoints.get(place.id)
		var vertices = pts.map(function (d, i) { d.coords = map.projection([d.lng, d.lat]); return d.coords;}); 
		
		pts.sort(function (a, b) {
			var p = map.projection([place.lng, place.lat]); 
			var distA = Math.sqrt(Math.pow(a.coords[0] - p[0], 2) + Math.pow(a.coords[1] - p[1], 2)); 
			var distB = Math.sqrt(Math.pow(b.coords[0] - p[0], 2) + Math.pow(b.coords[1] - p[1], 2));
			return d3.ascending(distA, distB);
		});
		
		var hull = d3.geom.hull(vertices); 
		
		map.svg.selectAll('.circle')
			.data(pts)
			.enter().append('circle')
			.attr('cx', function (d) { return d.coords[0];})
			.attr('cy', function (d) { return d.coords[1];})
			.attr('r', POINT_SIZE)
			.attr('fill', color)
			.attr('opacity', 0)
			.transition()
			.delay(function (d, i2) { return i * 25 + Math.floor(i2 / 10) * 100; })
			.attr('opacity', function (d, i) {
				if (maxDistances.get(d.place_id) < 1000) {
					return 0.1 + MAX_OPACITY * (1.0 - (d.distance / maxDistances.get(d.place_id)));
				}
				return 0.1 + MAX_OPACITY * (1.0 - (d.distance / 1000));
			});
		
		map.svg.append('path')
			.datum(place)
			.attr("d", line(hull))
			.attr('fill', color)
			.attr('fill-opacity', 0.0)
			.attr('stroke', '#232323')
			.attr('stroke-opacity', 0.0)
			// .attr('stroke-dasharray', '3 1')
			.attr('class', 'hull')
			.on('mouseover', function (d) {
				var p = map.svg.selectAll('.place').filter(function (d2) { return d2.id == d.id})[0][0]; 
				d.text = d.name; map.tip.show(d, p); 
				d3.select(this).transition().attr('stroke-opacity', 0.8);
			 })
			.on('mouseout', function (d) {
				map.tip.hide()
				d3.select(this).transition().attr('stroke-opacity', 0.0);
			});
	}
	
	map.svg.selectAll('.place')
		.data(places)
		.enter().append('circle')
		.attr('cx', function (d) {
			return map.projection([d.lng, d.lat])[0]; 
		})
		.attr('cy', function (d) {
			return map.projection([d.lng, d.lat])[1];
		})
		.attr('r', 0)
		.transition()
		.duration(2000)
		.delay(function (d, i) { return i * 25 })
		.attr('r', 1)
		.attr('class', 'place')
		.attr('fill-opacity', 0)
		.attr('stroke-opacity', 0.0)
		.attr('fill', '#232323')
		.attr('stroke', '#FC363b');
}

function drawCanvas() {
	map.svg.style('position', 'absolute').style('left', 0).style('top', 0)//.style('z-index', 2);
	
	var canvas = d3.select('#mapContainer').append('canvas')
		.attr('width', WIDTH).attr('height', HEIGHT)
		.style('position', 'absolute').style('left', 0).style('top', 0)//.style('z-index', 3)
		
	interactionSvg = d3.select('#mapContainer').append('svg')
		.attr('width', WIDTH).attr('height', HEIGHT)
		.style('position', 'absolute').style('left', 0).style('top', 0)
		//.style('z-index', 1);
		
	ctx = canvas.node().getContext('2d')
	for (var i = 0; i < places.length; i++) {
		var color = gridColors[(i % gridColors.length)];
		var place = places[i]; 
		var pts = placePoints.get(place.id)
		var vertices = pts.map(function (d, i) { d.coords = map.projection([d.lng, d.lat]); return d.coords;}); 
		
		pts.sort(function (a, b) {
			var p = map.projection([place.lng, place.lat]); 
			var distA = Math.sqrt(Math.pow(a.coords[0] - p[0], 2) + Math.pow(a.coords[1] - p[1], 2)); 
			var distB = Math.sqrt(Math.pow(b.coords[0] - p[0], 2) + Math.pow(b.coords[1] - p[1], 2));
			return d3.ascending(distA, distB);
		});
		
		var hull = d3.geom.hull(vertices); 
		
		drawShed(pts, color);
		
		interactionSvg.append('path')
			.datum(place)
			.attr("d", line(hull))
			.attr('fill', color)
			.attr('fill-opacity', 0.0)
			.attr('stroke', 'gray')
			.attr('stroke-width', 2)
			.attr('stroke-opacity', 0.0)
			.attr('stroke-dasharray', '5 5')
			.attr('class', 'hull')
			.on('click', function (d) {
				ga('send', 'event', 'coffeeshop', 'click', d.name);
				window.open(d.url, '_newtab')
			})
			.on('mouseover', function (d) {
				var location = map.projection([d.lng, d.lat]);
				var text = interactionSvg.select('.tip-text').text(d.name).attr('opacity', 1.0);
				var bbox = text.node().getBBox();
				var x = location[0]; var y = location[1]-bbox.height/2 - 5; 
				interactionSvg.select('.tip').attr('transform', 'translate(' + x + ',' + y + ')').attr('opacity', 0.7);
				interactionSvg.select('.tip').select('rect').attr('width', bbox.width + 20).attr('height', bbox.height + 10);
				d3.select(this).transition().attr('fill-opacity', 0.2).attr('stroke-opacity', 0.8);
				ga('send', 'event', 'coffeeshop', 'hover', d.name);
			 })
			.on('mouseleave', function (d) {
				d3.select(this).transition().attr('fill-opacity', 0.0).attr('stroke-opacity', 0.0);
			});
	}
	
	interactionSvg.selectAll('.place')
		.data(places.filter(function (d) {return placePoints.get(d.id).length > 0}))
		.enter().append('circle')
		.attr('cx', function (d) {
			return map.projection([d.lng, d.lat])[0]; 
		})
		.attr('cy', function (d) {
			return map.projection([d.lng, d.lat])[1];
		})
		.attr('r', 0)
		.transition()
		.duration(2000)
		.delay(function (d, i) { return Math.floor(i / 10) * DELAY })
		.attr('r', 5)
		.attr('class', 'place')
		.attr('fill-opacity', 0.1)
		.attr('stroke-opacity', 0.0)
		.attr('fill', 'rgb(222,16,40)');

	interactionSvg.selectAll('.place-inner')
		.data(places.filter(function (d) {return placePoints.get(d.id).length > 0}))
		.enter().append('circle')
		.attr('cx', function (d) {
			return map.projection([d.lng, d.lat])[0]; 
		})
		.attr('cy', function (d) {
			return map.projection([d.lng, d.lat])[1];
		})
		.attr('r', 0)
		.transition()
		.duration(2000)
		.delay(function (d, i) { return Math.floor(i / 10) * DELAY })
		.attr('r', 2)
		.attr('class', 'place-inner')
		.attr('fill-opacity', 0.4)
		.attr('stroke-opacity', 0.0)
		.attr('fill', 'rgb(222,16,40)');
		
		
		var tip = interactionSvg.append('g')
			.attr('class', 'tip')
			.attr('transform', 'translate(20,20)')
			.attr('pointer-events', 'none')
			.attr('opacity', 0.0)

		tip.append('rect')
			.attr('x', 30).attr('y', 0)
			.attr('width', 20)
			.attr('height', 20)
			.attr('fill', 'black')
			.attr('rx', 2)
			.attr('ry', 2);
		
		tip.append('text')
			.attr('class', 'tip-text')
			.attr('x', 40)
			.attr('y', 16)
			.attr('fill', 'white')
			.text('hello');

		var line2 = d3.svg.line()
			.x(function (d) { return d[0]})
			.y(function (d) { return d[1]});
		tip.append('path')
			.attr('d', line2([[0,12], [30,12]]))
			.attr('stroke', 'black')
			.attr('fill', 'none');
	
		tip.append('circle')
			.attr('cx', 0)
			.attr('cy', 12)
			.attr('r', 3);
		
		// interactionSvg.on('click', function () {
		// 	var event = d3.mouse(this);
		// 	console.log(event, map.projection.invert(event));
		// });
}

function drawShed(pts, color) {
	ctx.fillStyle = color;
	
	for (var j = 0; j < pts.length; j++) {
		var pt = pts[j];
		if (typeof pt == 'undefined') continue;
		var opacity = MAX_OPACITY * (1.0 - (pt.distance / 1000)); 
 		if (maxDistances.get(pt.place_id) < 1000) {
			opacity = MAX_OPACITY * (1.0 - (pt.distance / maxDistances.get(pt.place_id)));
		}
		drawCircle(ctx, pt.coords[0], pt.coords[1], POINT_SIZE, opacity)
		globalPoints.push(pt);
	
	}
}

function drawCircle(ctx, x, y, r, a) {
	ctx.globalAlpha = a;
	ctx.beginPath();
	ctx.arc(x,y,r, 0, 2*Math.PI);
	ctx.fill();
}

function setupLightBox() {
	$('#showMore').click(function(e){
		e.preventDefault();
		interactionSvg.select('.tip').attr('opacity', 0.0);
		window.location.hash = '#/description';
	    essayBoxShown = !essayBoxShown;
		if (essayBoxShown) {
			$('#essayBox').css('display', 'block');
		    $('#essayBox').animate({'opacity':1.0}, 500);
			$(this).text(' ... view map ');
		} else {
			closeEssayBox();
			$(this).text(' ... more ');
		}
		
	  });
	  
	  $('#essayBox').click(function () {
		  closeEssayBox(); 
		  $('#showMore').text(' ... more ');
	  });
	
	$('#viewMap').on('click', function (e) {
		e.preventDefault(); 
		closeEssayBox();
		$('#showMore').text(' ... more ');
	}); 
}

 function closeEssayBox(){
  $('#essayBox').animate({'opacity':0.0}, 500, function () {
  	$('#essayBox').css('display', 'none');
  })
  essayBoxShown = false;
}

function setupBackButton() {
	window.onhashchange = function () {
		console.log('event', location.hash)
		if (location.hash == '') {
			closeEssayBox(); 
			$('#showMore').text(' ... more ');
		}
	}
}