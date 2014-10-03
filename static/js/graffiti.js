var BOUNDARY_URL =  BASE_URL + 'static/data/boundaries/sf.geojson'; 
var ROADS_URL = BASE_URL + 'static/data/roads/sf.json';
var NEIGHBORHOODS_URL = BASE_URL + 'static/data/sf-neighborhoods.geojson'; 
var GRAFFITI_DATA_URL = BASE_URL + 'static/data/graffiti/sf_311_graffiti_2013.csv';
var CIVIC_ART_DATA_URL = BASE_URL + 'static/data/sf-civic-art3.csv'; 

var GIS_LOOKUP = 'sf';

var WIDTH = 1000; 
var HEIGHT = 600;
var SCALE = 1.0;

var POINT_SIZE = 3;



var places, map, points, path, projection; 
var tip;

window.onload = function () {
	
	var mapOptions = {
		src: BOUNDARY_URL, 
		width: WIDTH, 
		height: HEIGHT,
		scale: SCALE,
		svgContainer: '#mapContainer',
		roads: ROADS_URL,
		lookup: GIS_LOOKUP,
	}
	
	map = new D3Map(mapOptions); 
	
	map.loadGeoJSON(function () {
		map.svg.select('path').attr('fill', '#ededed').attr('opacity', 1.0);
		projecton = map.projection
		path = d3.geo.path().projection(map.projection);
		
		queue()
			.defer(d3.json, NEIGHBORHOODS_URL)
			.defer(d3.csv, GRAFFITI_DATA_URL)
			.defer(d3.csv, CIVIC_ART_DATA_URL)
			.await(setup)

	});
}

function setup(error, neighborhoods, data, art) {
	console.log(neighborhoods, data, art);
	
	data.forEach(function (d) {
		d.lat = parseFloat(d.lat); d.lng = parseFloat(d.lng); 
		var point = map.projection([d.lng, d.lat]);
		d.x = point[0]; d.y = point[1];
	});
	
	var nested_data = d3.nest()
		.key(function(d) { return d.Neighborhood})
		.entries(data)
		.sort(function (a, b) {
			return d3.descending(a.values.length, b.values.length);
		});
	
	map.svg.selectAll('circle')
		.data(data)
		.enter().append('circle')
		.attr('class', 'graffiti-incident')
		.attr('cx', function (d) {
			return d.x;
		})
		.attr('cy', function (d, i) {
			if (isNaN(d.y)) console.log(d, i);
			return d.y;
		})
		.attr('r', 5)
		.attr('fill', function (d) {
			var type = d['Request Type'].toLowerCase(); 
			if (type.indexOf('not_offensive') >= 0) return 'purple';
			return '#FC634E';
		});
			
	map.svg.selectAll('.civic-art')
		.data(art)
		.enter().append('text')
		.attr('class', 'civic-art')
		.attr('x', function (d) {
			var geometry = JSON.parse(replaceAll("'", '\"', d.geometry));
			return map.projection(geometry.coordinates)[0];
		})
		.attr('y', function (d) {
			var geometry = JSON.parse(replaceAll("'", '\"', d.geometry));
			return map.projection(geometry.coordinates)[1];
		})
		//.attr('r', 5)
		.style('fill', '#12EFFF')
		.style('opacity', 1.0)
		.style('font-weight', 'normal')
		.text('x');
	
	map.svg.selectAll('.neighborhood')
		.data(neighborhoods.features)
		.enter().append('path')
		.attr('d', path)
		.attr('stroke', 'gray')
		.attr('fill', 'white')
		.attr('class', 'neighborhood')
		.attr('stroke-opacity', 0.1)
		.attr('fill-opacity', 0.0)
		.on('mouseover', function (d, i) {
			d3.select(this).attr('stroke-opacity', 1.0).attr('fill-opacity', 0.5)
			map.svg.selectAll('.neighborhood-text').filter(function (d, j) { return j == i;})
				.attr('opacity', 1.0);
		})
		.on('mouseout', function (d, i) {
			d3.select(this).attr('stroke-opacity', 0.1).attr('fill-opacity', 0.0);
			map.svg.selectAll('.neighborhood-text').filter(function (d, j) { return j == i;})
				.attr('opacity', 0.0);
		})
		.each(function (d) {
			var pos = path.centroid(d);
			
			var g = map.svg.append('g')
				.attr('class','neighborhood-text')
				.attr('opacity', 0.0)
				.attr('fill', 'black')
				.attr('pointer-events', 'none');
			
			var text = g.append('text')
				.attr('x', pos[0] - 5)
				.attr('y', pos[1] - 5)
				.attr('dy', 0)
				.attr('text-anchor', 'end')
				.attr('font-weight', 'normal')
				.text(d.properties.nbrhood)
				// .call(wrap, 70)
			
			var bbox = text.node().getBBox();
			
			g.append('path')
				.attr('d', 'M' + pos[0].toString() + ' '+ pos[1].toString() + 'L' + (pos[0] - bbox.width - 5).toString() + ' ' + pos[1])
				.attr('fill', 'none')
				.attr('stroke', 'black');
				
			g.append('circle')
				.attr('r', 3)
				.attr('cx', pos[0])
				.attr('cy', pos[1]);
			
		});
		
		drawGraph(nested_data);
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function drawGraph(data) {
	data.forEach(function (d) {
		d.text = '<b>' + d.key + '</b><br/>' + d.values.length + ' Incidents';
	})
	var chartOptions = {
		margin: {top: 5, left: 170, right: 0, bottom: 5}, 
		width: 800, 
		height: 50,
		data: data,
		svgContainer: '#graphContainer', 
		xValue: function (d) { return d.key }, 
		yValue: function (d) { return d.values.length; },
		colorfn: 'purple',
		showTip: true,
		mouseover: function (d, i) {
			var name = d.key; 
			var nodes = map.svg.selectAll('.neighborhood')
				.filter(function(d) {
					return d.properties.nbrhood == name; 
				})
				.attr('stroke-opacity', 1.0)
				.attr('fill-opacity', 0.5)
		}, 
		mouseout: function (d, i) {
			map.svg.selectAll('.neighborhood')
				.attr('stroke-opacity', 0.0)
				.attr('fill-opacity', 0.0);
		}
	};
	graph = new SimpleBarChart(chartOptions); 
	graph.initialize();
}