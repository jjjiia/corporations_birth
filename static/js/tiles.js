
if (typeof MAX_ZOOM == 'undefined') {
	MAX_ZOOM = 1 << 20;
}

if (typeof CL == 'undefined') {
	CL = 3; 
}

var colors = ["#C29039",
"#B55CCB",
"#F15371",
"#6EAF42",
"#E28927",
"#D54F33",
"#CD5483",
"#D942C4",
"#47A5A4",
"#7B8ECB"]

var width = 975 - 30,
    height = 550,
    prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

var tile = d3.geo.tile()
    .size([width, height]);

var projection = d3.geo.mercator()
    //.scale((1 << 21) / 2 / Math.PI)
	.scale(ZOOM_LEVEL / 2 / Math.PI)
    .translate([-width / 2, -height / 2]); // just temporary

var tileProjection = d3.geo.mercator();

var tilePath = d3.geo.path()
    .projection(tileProjection);

var zoom = d3.behavior.zoom()
    .scale(projection.scale() * 2 * Math.PI)
    .scaleExtent([MAX_ZOOM, 1 << 23])
    .translate(projection(CENTER).map(function(x) { return -x; }))
    .on("zoom", zoomed);

var map = d3.select("#mapContainer")
    .style("width", width + "px")
    .style("height", height + "px")
    .call(zoom)
    .on("mousemove", mousemoved);


var boundaryLayer = map.append('div')
	.attr('class', 'layer')
	.append('svg')
	.attr('width', width)
	.attr('height', height);
			
var layer = map.append("div")
    .attr("class", "layer");

	
var labelLayer = map.append('div')
	.attr('class', 'layer')
	.append('svg')
	.attr('width', width)
	.attr('height', height); 


var dataLayer = map.append("div")
    .attr('class', 'layer')
    .append('canvas')
    .attr('width', width)
    .attr('height', height);

var neighborhoodsLayer = map.append('div')
	.attr('class', 'layer')
	.append('svg')
	.attr('width', width)
	.attr('height', height);


var ctx = dataLayer.node().getContext('2d'); 

var info = map.append("div")
    .attr("class", "info");

var gData; 
var allData; 
var neighborhoodData, neighborhoodList, neighborhoodFeatures = [];

var currentHoverNeighbor = null;


queue()
	.defer(d3.csv, GRAFFITI_DATA_URL)
	.defer(d3.json, BOUNDARY_URL)
	.await(function (error, data, boundary) {
		d3.select('#mapContainer').selectAll('.fa-spinner').remove(); 
	    gData = data; 
		allData = data; 
	
	    data.forEach(function (d) {
	        d.lat = parseFloat(d.lat); d.lng = parseFloat(d.lng); 
			d.cstring = d.lat.toFixed(CL) + ',' + d.lng.toFixed(CL);
	    });
	
		clusteredData = d3.nest()
			.key(function (d) {
				//console.log(d.birth, d.death)
				return d.cstring; 
			})
			.entries(data); 
		var min = d3.min(clusteredData, function (d) { return d.values.length }); 
		var max = d3.max(clusteredData, function (d) { return d.values.length });
		var gColor = d3.scale.pow().exponent(0.5).domain([min, max]).range(['#C6E2FF', '#0276FD']); 
	
		clusteredData.forEach(function (d) {
			var color = gColor(d.values.length); 
			d.values.forEach(function (d2, i) {
				d2.fill = color; 
			});
		})
		//console.log(clusteredData);
	
		dataByYear = d3.nest()
			.key(function (d) {
				//console.log(new Date(d[DATA_KEY]).getFullYear())
				return (new Date(d[DATA_KEY]).getFullYear());
			})
			.entries(data);
	

		boundaryFeature = boundary;
		boundaryLayer
			.datum(boundaryLayer)
			.append('path');
			
		if (typeof NEIGHBORHOODS_URL != 'undefined') {
			d3.json(NEIGHBORHOODS_URL, function (error, nTopology) {
				neighborhoodFeatures = nTopology.features;
				neighborhoodsLayer.selectAll('path')
					.data(neighborhoodFeatures)
					.enter().append('path')
					.attr('class', 'neighborhood');
					zoomed();
			})
		} else {
			zoomed();
		}
		//zoomed();
		drawGraph(dataByYear); 
		//drawNeighborhoodsGraph();
		setupHandlers();
		$('html, body').delay(1000).animate({
			scrollTop: $('#graphContainer').offset().top,
		}, 1000)
	});
function setupHandlers() {
	setupPlayButton();
	setupLightBox();
	d3.select('#showYear')
		.on('click', function (d, i) {
			d3.event.preventDefault(); 
			gData = allData; 
			drawData();
			//graph.updateData({data: neighborhoodData});
		});
}
function zoomed() {
  var tiles = tile
      .scale(zoom.scale())
      .translate(zoom.translate())
      ();

  projection
      .scale(zoom.scale() / 2 / Math.PI)
      .translate(zoom.translate());

  var image = layer
      .style(prefix + "transform", matrix3d(tiles.scale, tiles.translate))
    .selectAll(".tile")
      .data(tiles, function(d) { return d; });

  image.exit()
      .each(function(d) { this._xhr.abort(); })
      .remove();
  
  dataLayer.selectAll('.street-label').remove(); 
  
  image.enter().append("svg")
      .attr("class", "tile")
      .style("left", function(d) { return d[0] * 256 + "px"; })
      .style("top", function(d) { return d[1] * 256 + "px"; })
      .each(function(d) {
        var svg = d3.select(this);
        this._xhr = d3.json("http://" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3] + ".tile.openstreetmap.us/vectiles-highroad/" + d[2] + "/" + d[0] + "/" + d[1] + ".json", function(error, json) {
          var k = Math.pow(2, d[2]) * 256; // size of the world in pixels
		 // console.log('zoom: ', d[2]);
          tilePath.projection()
              .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256]) // [0°,0°] in pixels
              .scale(k / 2 / Math.PI);

          svg.selectAll("path")
              .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
            .enter().append("path")
              .attr("class", function(d) { return d.properties.kind; })
              .attr("d", tilePath);
        });
		
		if (d[2] >= 14) {
	        d3.json("http://" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3] + ".tile.openstreetmap.us/vectiles-skeletron/" + d[2] + "/" + d[0] + "/" + d[1] + ".json", function(error, json) {
	          var all = svg.selectAll("g.street-label")
	              .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }));
	            //console.log(all, all.enter(), all.exit());
			
	            var k = Math.pow(2, d[2]) * 256; // size of the world in pixels

	            tilePath.projection()
	                .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256]) // [0°,0°] in pixels
	                .scale(k / 2 / Math.PI);
				
				
	            all.exit().remove();
			
				//console.log(all.enter())
				all.enter().append('g');
				all
					.attr('class', 'street-label')
					.each(function (d) {
					var g = d3.select(this); 
					g.selectAll('path').remove(); g.selectAll('text').remove(); 
					g.append('path')
						.attr('d', function (d) {
							var c1 = projection(d.geometry.coordinates[0]); 
							var c2 = projection(d.geometry.coordinates[1]);
							if (c1[0] > c2[0]) {
								d.geometry.coordinates.reverse();
							}
							return tilePath(d);
						})
						.attr('fill', 'none')
						.attr('stroke', 'none')
						.attr('id', 'l' + d.id);
					g.append('text')
						.append('textPath')
						.attr('startOffset', '30%')
						.attr("xlink:href", "#l" + d.id)
						.attr('text-achor', 'middle')
						.text(d.properties.name);
				});
	        });
		} else {
			svg.selectAll('g.street-label').remove();
		}

      });

	  drawData();
	  var path = d3.geo.path().projection(projection);
//	  neighborhoodsLayer.selectAll('.neighborhood')
//		  .data(neighborhoodFeatures)
//		  .attr('d', path)
//		  .on('mouseover', function (d) {
//			  var bar = graph.svg.selectAll('.bar')
//			  	.each(function (d2, i) { 
//					if (d.properties[NEIGHBORHOODS_KEY] == d2.key) {
//						d2.text = '<b>' + d2.key + '</b><br/>' + d2.values.length + ' Incidents';
//						graph.tip.show(d2, this);
//						d3.select(this).transition().attr('fill', 'red');
//					}
//				})
//		  })
//		  .on('mouseout', function (d) {
//			  graph.svg.selectAll('.bar').transition().attr('fill', '#ABABAB');
//			  graph.tip.hide();
//		  });
		  
	
	boundaryLayer
		.selectAll('path')
		.datum(boundaryFeature)
		.attr('d', path)
		.attr('fill', '#f0f0f0')
		// .attr('stroke', '#2C569E')
		.attr('stroke-width', 1)
		.attr('stroke-opacity', 1.0);
		
    // dataLayer.selectAll('circle')
    //     .data(data)
    //     .attr('class', 'graffiti-incident')
    //     .attr('cx', function (d) {
    //         return d.x;
    //     })
    //     .attr('cy', function (d, i) {
    //         if (isNaN(d.y)) console.log(d, i);
    //         return d.y;
    //     })
    //     .attr('r', 5)
    //     .attr('fill', function (d) {
    //         var type = d['Request Type'].toLowerCase(); 
    //         if (type.indexOf('not_offensive') >= 0) return 'purple';
    //         return '#FC634E';
    //     })
}

function drawData() {
    ctx.clearRect(0,0,width, height);
    BATCH_INDEX = 0; 
    d3.timer(function () { 
        if (BATCH_INDEX < gData.length) {
            drawDataAtBatch();
            return false;
        }
        return true;
    }, 100);
}

function drawDataAtBatch() {
    for (var i = BATCH_INDEX; i < Math.min(BATCH_INDEX + BATCH_SIZE, gData.length); i++) {
        var d = gData[i]; 
        var point = projection([d.lng, d.lat]);
		
		//ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
		ctx.fillStyle = d.fill;
		ctx.globalAlpha = 0.2;
		if (currentHoverNeighbor != null) {
			//console.log(currentHoverNeighbor, d.neighborhood);
			if (currentHoverNeighbor != d.neighborhood) {
				ctx.globalAlpha = 0.1;
				ctx.fillStyle = '#d0d0d0';
			}
		}
        drawCircle(ctx, point[0], point[1], 3);
		 ctx.globalAlpha = 0.6;
		 drawCircle(ctx, point[0], point[1], 0.5)
    }
    BATCH_INDEX += BATCH_SIZE; 
}

function setupPlayButton() {
	var i = 0;
	d3.select('#playButton')
		.on('click', function () {
			d3.event.preventDefault();
			var callId = setInterval(function () {
				gData = dataByYear[i].values; 
				drawData();
				//updateNeighborhoodsGraph();
				graphSvg.selectAll('.line-dot')
					.transition()
					.attr('fill', function (d, j) {
						if (j == i) return '#FC6262'; 
						return '#D6D6D6';
					})
					.attr('r', function (d, j) {
						if (j == i) return 5;
						return 3; 
					});
				i++; 
				if (i >= dataByYear.length) {
					i = 0; 
					clearInterval(callId);
				} 
			}, 200);
		});
}

function mousemoved() {
  info.text(formatLocation(projection.invert(d3.mouse(this)), zoom.scale()));
}

function matrix3d(scale, translate) {
  var k = scale / 256, r = scale % 1 ? Number : Math.round;
  return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
}

function prefixMatch(p) {
  var i = -1, n = p.length, s = document.body.style;
  while (++i < n) if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
  return "";
}

function formatLocation(p, k) {
  var format = d3.format("." + Math.floor(Math.log(k) / 2 - 2) + "f");
  return (p[1] < 0 ? format(-p[1]) + "°S" : format(p[1]) + "°N") + " "
       + (p[0] < 0 ? format(-p[0]) + "°W" : format(p[0]) + "°E");
}

function drawCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x,y,r, 0, 2*Math.PI);
    ctx.fill();
}

function drawGraph(data) {
	data.sort()
	console.log(data)
	
	var padding = {left: 200, right: 70, top: 5}; 
	var graphWidth = width - padding.right - padding.left;
	var graphHeight = 60 - padding.top;
	
	var svg = d3.select('#graphContainer')
		.append('svg')
		.attr('width', graphWidth + padding.left + padding.right)
		.attr('height', graphHeight)
		.append('g')
		.attr('transform', 'translate(' + padding.left + ',' + padding.top + ')');
	graphSvg = svg;
	
	
	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([0, 10])
		.direction('e')
		.html(function(d) {
			return "<div style=' max-width: 200px; font-weight: normal; text-align: center;'>" + d.text + "</div>";
		});
	svg.call(tip);

	
	var minPerYear = d3.min(data, function (d) {return d.values.length; });
	var maxPerYear = d3.max(data, function (d) { return d.values.length; });
	//var labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	var labels = [1880,2013]
	// var x = d3.scale.linear().domain([0, 11]).range([0, graphWidth]);
	console.log(maxPerYear, minPerYear)
	var y = d3.scale.linear().domain([minPerYear, maxPerYear]).range([30, 0]);
	var x = d3.scale.linear()
        .domain(labels) 
		.range([0,650])
		//.rangeRoundBands([0, graphWidth], 0.05);
	var xAxis = d3.svg.axis().scale(x);
	
	svg.append('g')
		.attr('class', 'axis')
		.attr('transform', 'translate(0,' + (graphHeight - 25) + ')')
		.call(xAxis);
	
	var line = d3.svg.line()
		.x(function (d, i) { return x(d.key) })
		.y(function (d, i) { return y(d.values.length); });
	
//	svg.append('path')
//		.datum(data)
//		.attr('class', 'line')
//		.attr('d', line);
	
	svg.selectAll('circle')
		.data(data)
		.enter().append('circle')
		.attr('class', 'line-dot')
		.attr('cx', line.x())
		.attr('cy', line.y())
		.attr('r', function(d){
			//console.log(d)
			return 3
		})
		.attr('fill', '#000')
		.on('mouseover', function (d, i) {
			d3.select(this).attr('r', 3);
			d.text = d.values.length + ' companies born in ' + d.key;
			//console.log(d)
			tip.show(d);
		})
		.on('mouseout', function (d) {
			d3.selectAll('.line-dot')
				.attr('r', function (d) {
					if (d3.select(this).attr('is-clicked') == 'true') return 1;
					return 3;
				})
			tip.hide();
		})
		.on('click', function (d) {
			d3.selectAll(".timelineArc").remove()
			
			gData = d.values; 
			var currentYear = d.key
			var currentYearLength = d.values.length
			//console.log(gData);
			//make array on click of death years for drawing arcs later
			var deathArray = [];
			var deathDict = {}
			var deathYear = null;
			var companyNameArray = []
			for( var item in d.values){
				var death = d.values[item].death
				var companyName = d.values[item].company
				var companyBirth = d.values[item].birth
				var companyDeath = d.values[item].death
				if(companyDeath == "NA"){
					companyDeath = "Present"
				}
				companyNameArray.push([companyName, companyBirth, companyDeath])
				//console.log(death)
				if(death == "NA"){
					deathArray.push(2020)		
				}else{
					deathYear = new Date(death).getFullYear();
					deathArray.push(deathYear)
				}
			}
			//console.log(deathArray)
			deathDict = countArray(currentYear, deathArray, y(currentYearLength), svg)

			
			//drawArcs(deathDict, svg)
			
			listCompanies(companyNameArray)
			
			drawData();
			//updateNeighborhoodsGraph();
			d3.selectAll('.line-dot').attr('fill', '#D6D6D6').attr('is-clicked', 'false');
			d3.select(this).attr('r', 3).attr('fill', '#FC6262').attr('is-clicked', 'true');
		});

}
function listCompanies(data){
	//console.log(data)
}

function drawArcs(Dict,svg){
	//console.log(Dict)
	var xScale = d3.scale.linear().domain([1880, 2014]).range([0,650])

	var lineFunction = d3.svg.line()
		.interpolate("cardinal")
		.x(function(d) { return xScale(d.x); })
		.y(function(d,i) { return d.y; })		
	
		
	
	var curve = svg.append("path")
		.attr("class", "timelineArc")
		.attr("d", lineFunction(Dict))
		.attr("stroke", "#aaa")
		.attr("stroke-width", 1)
		.attr("stroke-opacity", 1)
		.attr("fill", "none")
		.attr("stroke-width", function(d,i){return 1})
		
		var length = curve.node().getTotalLength();
		
		curve.attr("stroke-dasharray", length+" "+length)
		.attr("stroke-dashoffset", length)
		     .transition()
		       .duration(1250)
		       .attr("stroke-dashoffset", 0);
}

function countArray(startingYear, arr, yOrigin,svg) {
    var a = [], b = [], prev;
    var dict = []
    arr.sort();
    for ( var i = 0; i < arr.length; i++ ) {
        if ( arr[i] !== prev ) {
            a.push(arr[i]);
            b.push(1);
        } else {
            b[b.length-1]++;
        }
        prev = arr[i];
    }
    
	for(var j = 0; j<a.length; j++){
		
		var dict = []
		dict.push({"x":startingYear, "y":yOrigin})
		dict.push({"x":a[j], "y":30})
		console.log(dict)
		
		drawArcs(dict, svg)
	}
	return dict
   // return [a, b];
}

//function drawNeighborhoodsGraph() {
//	var data = d3.nest()
//		.key(function(d) { return d.neighborhood})
//		.entries(gData)
//		.sort(function (a, b) {
//			return d3.descending(a.values.length, b.values.length);
//		});
//	neighborhoodData = data; 
//	neighborhoodList = data.map(function (d, i) { return d.key; });
//	
//	
//	//console.log(data);
//	var chartOptions = {
//		margin: {top: 5, left: 200, right: 70, bottom: 0}, 
//		width: width, 
//		height: 50,
//		data: data,
//		svgContainer: '#neighborhoodsGraphContainer', 
//		xValue: function (d) { return d.key }, 
//		yValue: function (d) { return d.values.length; },
//		colorfn: '#ABABAB',
//		showTip: true,
//		mouseover: function (d, i) {
//			d.text = '<b>' + d.key + '</b><br/>' + d.values.length + ' Incidents';
//			currentHoverNeighbor = d.key; 
//			drawData();
//		}, 
//		mouseout: function (d, i) {
//			currentHoverNeighbor = null;
//			drawData();
//		}
//	};
//	graph = new SimpleBarChart(chartOptions); 
//	graph.initialize();
//}

//function updateNeighborhoodsGraph() {
//	// var data = d3.nest()
//	// 	.key(function(d) { return d.neighborhood})
//	// 	.entries(gData)
//	// 	.sort(function (a, b) {
//	// 		return d3.descending(a.values.length, b.values.length);
//	// 	});
//	var n2data = d3.map(); 
//	neighborhoodList.forEach(function (d, i) {n2data.set(d, [])}); 
//	for (var i = 0; i < gData.length; i++) {
//		var d = gData[i];
//		n2data.get(d.neighborhood).push(d); 
//	}
//	var data = neighborhoodList.map(function (name, i) {
//		return {'key': name, 'values': n2data.get(name)}; 
//	})
//	graph.updateData({data: data});
//}
//
var essayBoxShown = false;
function setupLightBox() {
	$('#showMore').click(function(e){
		e.preventDefault();
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