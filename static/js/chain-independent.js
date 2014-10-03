var places, map, points; 
var placePoints = d3.map();
var placeMap = d3.map(); 
var tip;
var kmToMile = 0.621371; 
var neighborhoods;
var graphSvg; 
var tip;
var overallChainPercentage; 

var chain_colors = ['#FF8126'] //

var independent_colors = [ '#5EB56A'];


var line = d3.svg.line()
	.x(function (d) { return d[0]})
	.y(function (d) { return d[1]});

var canvas, interactionSvg; 
	
window.onload = function () {
	
  setupLightBox();
	var mapOptions = {
		src: BOUNDARY_URL, 
		width: WIDTH, 
		height: 600,
		scale: SCALE,
		svgContainer: '#mapContainer',
		roads: STREETS_URL,
		lookup: STREETS_LOOKUP,
	}
	
	map = new D3Map(mapOptions); 
	canvas = d3.select('#mapContainer')
    .append('canvas')
    .attr('width', 1000).attr('height', 600);

    
  interactionSvg = d3.select('#mapContainer')
    .append('svg')
    .attr('width', 1000).attr('height', 600); 

  ctx = canvas.node().getContext('2d');
	map.loadGeoJSON(function () {
		path = d3.geo.path().projection(map.projection);

		queue()
			.defer(d3.csv, PLACES_URL)
			.defer(d3.csv, POINTS_URL)
			.defer(d3.json, NEIGHBORHOODS_URL)
			.await(function (error, placeData, pointsData, nbrhoods) {
				places = placeData; 
				points = pointsData;
				neighborhoods = nbrhoods;
				
				places.forEach(function (d, i) {
					placeMap.set(d.id, d); 
					placePoints.set(d.id, []);
				}); 
				
				points.forEach(function (d, i) {
					d.lat = parseFloat(d.lat);
					d.lng = parseFloat(d.lng); 
					d.distance = parseInt(d.distance);
					placePoints.get(d.place_id).push(d); 
				}); 
				
				draw();
        //drawEssayGraph();
        drawNeighborhoodsGraph();
		});
	});
}

function draw() {
  
  d3.select('body').on('mouseover', function () { 
    console.log('out')
		update_graph(places);
		d3.select('#location').text(CITY_NAME); 
		map.svg.selectAll('.neighborhood').attr('stroke-opacity', 0.0); 
    hideTip();
    graph.svg.selectAll('.bar').attr('fill', graph.colorfn);
	}); 
  
	interactionSvg.selectAll('.neighborhood')
		.data(neighborhoods.features)
		.enter().append('path')
		.attr('class', 'neighborhood')
		.attr('d', path)
		.attr('fill', '#ccc')
		.attr('fill-opacity', 0.0)
		.attr('stroke', '#E3D646')
		.attr('stroke-width', 2)
		.attr('stroke-opacity', 0.0)
    .on('mouseover', function (d) {
      d3.event.stopPropagation()
    	var n_places = places.filter(function (d2) { return d2.neighborhood == d.properties[NEIGHBOORHOODS_KEY] }); 
    	update_graph(n_places);
    	d3.select('#location').text(d.properties[NEIGHBOORHOODS_KEY]);
    	interactionSvg.selectAll('.neighborhood').attr('stroke-opacity', 0.0).attr('fill-opacity', 0.0); 
      d3.select(this).attr('stroke-opacity', 1.0).attr('fill-opacity', 0.1);
    })

		
	var vertices = points.map(function (d, i) { return map.projection([d.lng, d.lat])});
		
	var line = d3.svg.line()
	    .interpolate("basis-closed")
		.x(function (d) { return d[0]})
		.y(function (d) { return d[1]});
			
	for (var i = 0; i < places.length; i++) {

		var place = places[i]; 
		
		var color; 
		if (place.chain.toLowerCase() == 'true') {
			color = get_random(chain_colors);
		} else {
			color = get_random(independent_colors);
		}
		
		var pts = placePoints.get(place.id)
		
		var vertices = pts.map(function (d, i) { 
			d.coords = map.projection([d.lng, d.lat]); 
			d.place = place; 
			return d.coords;
		}); 
		
		var hull = d3.geom.hull(vertices); 
		
    ctx.fillStyle = color;
    pts.forEach(function (d, i) {
      ctx.globalAlpha =  0.8 * Math.pow(1.0 - (Math.min(d.distance, 1000) / 1000), 1.5);
      ctx.fillRect(d.coords[0], d.coords[1], RECT_WIDTH, RECT_WIDTH); 
    }); 

    
    if (hull.length == 0 && pts.length > 0) {
      pt = pts[0].coords;
      hull.push(pt); hull.push([pt[0] + RECT_WIDTH, pt[1]]); 
      hull.push([pt[0] + RECT_WIDTH, pt[1] + RECT_WIDTH]); 
      hull.push([pt[0], pt[1] + RECT_WIDTH]);
    }
		interactionSvg.append('path')
			.datum(place)
			.attr("d", line(hull))
			.attr('fill', color)
			.attr('fill-opacity', 0.0)
			.attr('class', 'hull')
			.on('mouseover', function (d) {
        d3.event.stopPropagation()
      	var n_places = places.filter(function (d2) { return d2.neighborhood == d.neighborhood }); 
      	update_graph(n_places);
      	d3.select('#location').text(d.neighborhood);
      	interactionSvg.selectAll('.neighborhood').attr('stroke-opacity', 0.0).attr('fill-opacity', 0.0); 
	
      	interactionSvg.selectAll('.neighborhood')
      		.filter(function (d2) { return d2.properties[NEIGHBOORHOODS_KEY] == d.neighborhood})
      		.attr('stroke-opacity', 1.0)
      		.attr('fill-opacity', 0.1);
      		var location = map.projection([d.lng, d.lat]);
          showTip(location[0], location[1], d.name);
          graph.svg.selectAll('.bar').attr('fill', function (d2, i) {
            if (d2.key == d.neighborhood) {
              return '#E3D646';
            }
            return graph.colorfn(d2);
          });
			}); 
	}
	

	tip = interactionSvg.append('g')
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
		
	
	d3.selectAll('.loading').remove()
	drawGraph();
}
	
	
function drawGraph() {
	var data = get_graph_data(places);
  overallChainPercentage = data[0].count / data[0].total;
	graphSvg = d3.select('#graphContainer').append('svg')
		.attr('width', 300)
		.attr('height', 100); 
  
	graphSvg.selectAll('.bar')
		.data(data)
		.enter().append('rect')
		.attr('class', function (d, i) {
			return 'bar ' + (i == 0 ? 'chain' : 'independent');
		})
		.attr('x', 300)
		.attr('y', function (d, i) { return i * 20 })
		.attr('width', 0)
		.attr('height', 15)
		.transition()
		.duration(2000)
		.attr('x', function (d) { return 300 - (d.count/d.total)*200})
		.attr('width', function (d) { return (d.count/d.total)*200});
	
	graphSvg.selectAll('text')
		.data(data)
		.enter().append('text')
		.attr('x', function (d, i) { return 290 - (d.count/d.total)*200 })
		.attr('y', function (d, i) { return i * 20 + 10; })
		.attr('text-anchor', 'end')
		.text(function (d) { return d.text + ' (' + d3.format('%')(d.count/d.total)  + ')' })
	
}
	
function update_graph(places) {
	var data = get_graph_data(places);
	graphSvg.selectAll('.bar')
		.data(data)
		.transition()
		.duration(1000)
		.attr('x', function (d) { return 300 - (d.count/d.total)*200})
		.attr('width', function (d) { return (d.count/d.total)*200});
	
	graphSvg.selectAll('text')
		.data(data)
		.transition()
		.duration(1000)
		.attr('x', function (d, i) { return 290 - (d.count/d.total)*200 })
		.text(function (d) { return d.text + ' (' + d.count + ')'});
		
}
function get_graph_data(places) {
	var num_chains = 0; 
	var num_independent = 0; 
	places.forEach(function (d) {
		if (d.chain.toLowerCase() == 'true') {
			num_chains++; 
		} else {
			num_independent++; 
		}
	}); 
	var data = [
			{'count': num_chains, 'total': places.length, text: 'Chains'}, 
			{'count': num_independent, 'total': places.length, text: 'Independent'}
		]; 
	return data; 
}

function get_random(items) {
	return items[Math.floor(Math.random()*items.length)]
}

function drawEssayGraph() {
  var svg = d3.select('#essayGraphContainer')
    .append('svg')
    .attr('width', ESSAY_GRAPH_WIDTH)
    .attr('height', ESSAY_GRAPH_HEIGHT); 
  
    var clustered_data = d3.nest()
      .key(function (d) { return d.neighborhood; })
      .entries(places)

    clustered_data.forEach(function (d1, i) {
      var chains = d1.values.filter(function (d2) { return d2.chain.toLowerCase() == 'true'});
      d1.chain = chains.length / d1.values.length; 
    }); 
    
    clustered_data.sort(function (a, b) { return d3.descending(a.chain, b.chain)}); 
    
    var x = d3.scale.linear().domain([0, 0.5]).range([0, 50]); 
    var maxTextWidth = d3.max(clustered_data, function (d) { return d.key.length * 8});
    svg.append('g')
      .selectAll('.essay-neighborhood')
      .data(clustered_data)
      .enter().append('text')
      .attr('class', 'essay-neighborhood')
      .attr('x', 0)
      .attr('y', function (d, i) { return i * 20 + 10})
      .text(function (d, i) { return (i+1).toString() + '. ' + d.key }); 
    
    svg.append('g')
      .attr('transform', 'translate(' + (maxTextWidth+70) + ', 0)')
      .selectAll('.essay-percentage')
      .data(clustered_data)
      .enter().append('text')
      .attr('x', 0)
      .attr('y', function (d, i) { return i * 20 + 10})
      .text(function (d) { return d3.format('%')(d.chain) });
  
    svg.append('g')
      .attr('transform', 'translate(' + (maxTextWidth+100) +', 0)')
      .selectAll('.essay-bar')
      .data(clustered_data)
      .enter().append('rect')
      .attr('x', 0)
      .attr('y', function (d, i) { return i * 20 })
      .attr('width', function (d, i) {
        return x(d.chain); 
      })
      .attr('height', 10)
      .attr('fill', function (d) {
        if (d.chain <= overallChainPercentage) {
          return '#A7DE1D';
        } 
        return '#FF8126';
      })
}

function drawNeighborhoodsGraph() {
  var data = d3.nest()
    .key(function (d) { return d.neighborhood; })
    .entries(places); 
    
  data.forEach(function (d1, i) {
    var chains = d1.values.filter(function (d2) { return d2.chain.toLowerCase() == 'true'});
    d1.chain = chains.length / d1.values.length; 
  }); 
  data.sort(function (a, b) { return d3.descending(a.chain, b.chain)}); 
	console.log(data);
  
  d3.select('#neighborhoodsGraph').text('');
	var chartOptions = {
		margin: {top: 5, left: 50, right: 50, bottom: 0}, 
		width: 1000, 
		height: 50,
		data: data,
		svgContainer: '#neighborhoodsGraph', 
		xValue: function (d) { return d.key }, 
		yValue: function (d) { return d.chain; },
		colorfn: function (d) {
		  if (d.chain <= overallChainPercentage) {
		    return independent_colors[0];
		  } 
      return chain_colors[0];
		},
		showTip: true,
		mouseover: function (d, i) {
      d3.event.stopPropagation();
      d.text = d.key + ' (' + d3.format('%')(d.chain) + ')';
      
      var n_places = places.filter(function (d2) { return d2.neighborhood == d.key });
      update_graph(n_places);
    	d3.select('#location').text(d.key);
    	interactionSvg.selectAll('.neighborhood').each(function (d2, i) {
        var node = d3.select(this); 
        if (d2.properties[NEIGHBOORHOODS_KEY] == d.key) {
          node.attr('stroke-opacity', 1.0).attr('fill-opacity', 0.1);
        } else {
          node.attr('stroke-opacity', 0.0).attr('fill-opacity', 0.0);
        }
      }); 
		}, 
		mouseout: function (d, i) {
		}
	};
	graph = new SimpleBarChart(chartOptions); 
	graph.initialize();
}


var essayBoxShown = false;
function setupLightBox() {
	$('#showMore').click(function(e){
		e.preventDefault();
		window.location.hash = '#/description';
	    essayBoxShown = !essayBoxShown;
		if (essayBoxShown) {
			$('#essayBox').css('display', 'block');
		    $('#essayBox').animate({'opacity':1.0}, 300);
			$(this).text(' ... view map ');
		} else {
			closeEssayBox();
			$(this).text(' ... more ');
		}
  });
  
  $('#essayBox-close').click(function () {
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

function showTip(x, y, text) {
	var text = interactionSvg.select('.tip-text').text(text).attr('opacity', 1.0);
	var bbox = text.node().getBBox();
	var y_i = y -bbox.height/2 - 5; 
	interactionSvg.select('.tip').attr('transform', 'translate(' + x + ',' + y_i + ')').attr('opacity', 0.9);
	interactionSvg.select('.tip').select('rect').attr('width', bbox.width + 20).attr('height', bbox.height + 10);
}

function hideTip() {
  interactionSvg.select('.tip-text').attr('opacity', 0.0); 
  interactionSvg.select('.tip').attr('opacity', 0.0);
}
