//var colors = ['#5BFC73', '#57CFFF', '#E4FC5B', '#FFAB52', '#FF7D52', '#FF2B2B'];
var periods = ['2010', '2011', '2012', '2013', '2014'];
var currentPeriodIndex = 0; 
var nextIndex, prevIndex; 

var width = 1000, height = 550;

var colors = ['#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#e34a33', '#b30000'];
var hist = [0, 0, 0, 0, 0, 0];
var types; 

var hexbin = d3.hexbin()
	 .size([width, height])
	 .radius(HEX_RADIUS);
var zoomSVG, zoomProjection, zoomPath, gMap, zoomOverlay;
var addressMap;
var buildings; 
var yearsSvg; 
var neighborhoods; 
var diffColor = d3.scale.linear().domain([-0.3, 0, 0.3]).range(['#136BC2', 'white', '#E34D4D']).clamp(true);
var properties, hexagons; 
var neighborhoodData = d3.map();
var neighborhoodsSvg, nX, nY, nTip, nWidth, nHeight; 
var parkFeature = null;

var tip = d3.tip()
	.attr('class', 'd3-tip-moving')
	.offset([-10, 0])
	.direction('e')
	.html(function(d) {
		return "<div style=' max-width: 200px; font-weight: normal; text-align: center;'>" + d.text + "</div>";
	});

window.onload = function () {
	
	var mapOptions = {
		src: BOUNDARY_URL, 
		width: width, 
		height: height,
		scale: 0.98,
		svgContainer: '#mapContainer',
	}
	
	map = new D3Map(mapOptions); 
	
	map.loadGeoJSON(function () {
		queue()
			.defer(d3.csv,DATA_URL)
			.defer(d3.csv,NEIGHBORHOOD_LIST_URL)
			.defer(d3.json, NEIGHBORHOOD_SHAPES_URL)
			.await(function (errors, features, neighborhood_list, neighborhoods_features) {
				properties = features;
				neighborhoods = neighborhood_list; 
				
				properties = properties.filter(function (d, i) { return d.neighborhood != PARKS_NEIGHBORHOOD_INDEX });
        neighborhoods = neighborhoods.filter(function (d) { return d.id != PARKS_NEIGHBORHOOD_INDEX});
        
        neighborhoodsFeatures = neighborhoods_features.features.filter(function (d) {
            if (d.properties[NEIGHBORHOOD_KEY] == PARKS_NEIGHBORHOOD_NAME) {
              parkFeature = d; 
              return false;
            }
            return true;
        });  
				
				setup(features);
			});
	}); 
}

function setup(features) {
	d3.select('#mapContainer').select('.fa-spinner').remove();
  
	var path = d3.geo.path().projection(map.projection);
  
  if (parkFeature != null) {
    map.svg.append('path')
      .datum(parkFeature)
      .attr('class', 'park')
      .attr('d', path); 
  }
  
	var vertices = features.map(function (d, i) { 
		var lng = parseFloat(d.lng); 
		var lat = parseFloat(d.lat); 
 
		var pt = map.projection([d.lng, d.lat]); 
		d[0] = pt[0]; d[1] = pt[1]; 
		return d;
	});

	// not showing hexagons that skew the visual presentation
	hexagons = hexbin(vertices).filter(function (d) { return d.length >= MIN_NUM_BUILDINGS });
  
  // discard neighborhoods with too little hexagons 
  var neighborhood_ids = d3.nest()
    .key(function (d) { return d[0].neighborhood })
    .entries(hexagons)
    .filter(function (d) {
      var visible_hexagons = d.values.filter(function (d2) { return d2.length >= MIN_NUM_BUILDINGS }); 
       return visible_hexagons.length > 0; 
     })
    .map(function (d) { return d.key }); 
  neighborhood_ids = d3.set(neighborhood_ids); 
  neighborhoods = neighborhoods.filter(function (d) { return neighborhood_ids.has(d.id); }); 
  
	map.svg.append("g")
	    .attr("clip-path", "url(#clip)")
	  .selectAll(".hexagon")
	    .data(hexagons)
	  .enter().append("path")
	    .attr("class", "hexagon")
	    .attr("d", hexbin.hexagon())
			.on('mouseover', function (d) {
        var n = ''; 
        if (neighborhoodData.has(d[0].neighborhood)) {
          n = neighborhoodData.get(d[0].neighborhood).name; 
        }
				d.text = d3.format('%')(d.meanChange) + ' (' + d.length + ' properties)<br/>' + n;
				tip.show(d);
				var nhood = neighborhoodData.get(d[0].neighborhood).name; 
				map.svg.selectAll('.neighborhood').attr('opacity', function (d2, i) {
					if (nhood == d2.properties[NEIGHBORHOOD_KEY]) return 1.0; 
					return 0.0;
				}); 
				neighborhoodsSvg.selectAll('.bar').transition().attr('fill', function (d2) {
					if (nhood == d2.name) return 'purple'; 
					return d2.fill;
				});
        neighborhoodsSvg.selectAll('.bar').filter(function (d2) { return (nhood == d2.name) })
          .each(function (d2) {
            d2.text = d2.name + ' (' + d3.format('%')(d2[currentPeriodIndex]) + ')';
            nTip.show(d2,this);
          })
			})
			.on('mousemove', function (d) {
				d3.select('.d3-tip-moving')
				.style('left', (d3.event.pageX + 10)  + 'px')
				.style('top', (d3.event.pageY + 20) + 'px');
			})
			.on('mouseout', function (d) {
				tip.hide(d);
				map.svg.selectAll('.neighborhood').attr('opacity', 0.0);
				neighborhoodsSvg.selectAll('.bar').transition().attr('fill', function (d2) {return d2.fill; });
        nTip.hide();
			})
      .on('click', function (d) { xxx = d; console.log(d); })
	    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
		.attr('opacity', 0.0)
		.transition()
	    .style("fill", function(d) { 
			var meanChange = d3.median(d, function (d2) {
				var change = (parseInt(d2[periods[1]]) / parseInt(d2[periods[0]])) - 1.0
				if (!isNaN(change) && isFinite(change) && Math.abs(change) < MAX_CHANGE) {
					return change; 
				}
			}); 
			d.meanChange = meanChange;
			return diffColor(meanChange); 
		})
		.style('stroke', 'white')
		.attr('opacity', 1.0);
	
	map.svg.selectAll('.neighborhood')
		.data(neighborhoodsFeatures)
		.enter().append('path')
		.attr('class','neighborhood')
		.attr('d', path)
		.attr('opacity', 0.0); 
		
		map.svg.call(tip);
		
		drawYearsUI();
		setupPlayButton();
		createNeighborhoodsData();
		drawNeighborhoodsGraph();
    setupLightBox();
		$('html, body').delay(1000).animate({
			scrollTop: $('#yearsContainer').offset().top,
		}, 1000);
}

function createGeoJSONFromPoints(points) {
	var feature = {  "type": "FeatureCollection", "features": [] };
	
	points.forEach(function (p, i) {
		feature.features.push(p); 
	});
	return feature;
}

function setupProjectionFromPoints(feature, width, height, SCALE) {
	zoomProjection.scale(1).translate([0, 0]);
	var b = zoomPath.bounds(feature),
		s = SCALE / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
		t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
	console.log(b, s, t);
	zoomProjection.scale(s).translate(t);	 
}


function setCurrentRange() {
	if (currentPeriodIndex == 'total') {
		prevIndex = 0; nextIndex = periods.length - 1; 
	} else {
		prevIndex = currentPeriodIndex; nextIndex = currentPeriodIndex+1; 
	}
}
function showCurrentPeriod(){
	map.svg.selectAll('.hexagon')
		 .transition()
		.style('fill', function (d) {
			var meanChange = d3.median(d, function (d2) {
				var change =  (parseInt(d2[periods[nextIndex]]) / parseInt(d2[periods[prevIndex]])) - 1.0;
				if (!isNaN(change) && isFinite(change) && Math.abs(change) < MAX_CHANGE) {
					return change; 
				}
			}); 
			d.meanChange = meanChange; 
			d.text = d3.format('%')(d.meanChange) + ' (' + d.length + ' properties)';
			return diffColor(meanChange); 
		})
}

function drawYearsUI() {
	var padding = {left: 250, right: 70, top: 5}; 
	var graphWidth = width - padding.right - padding.left;
	var graphHeight = 50 - padding.top;
	
	yearsSvg = d3.select('#yearsContainer')
		.append('svg')
		.attr('width', graphWidth + padding.left + padding.right)
		.attr('height', graphHeight); 
	
	var x = d3.scale.linear().domain([0, periods.length]).range([0, graphWidth]); 
	
	var g = yearsSvg.append('g')
		.attr('transform', 'translate(' + padding.left + ', 10)'); 
	
	g.selectAll('.year-text')
		.data(periods)
		.enter().append('text')
		.attr('x', function (d, i) { return x(i); })
		.attr('y', 10)
		.attr('text-anchor', 'middle')
		.text(function (d) { return d});

	var line = d3.svg.line()
		.x(function (d) { return d[0]})
		.y(function (d) { return d[1]}); 


	g.selectAll('.year-handle-line')
		.data(d3.range(periods.length - 1))
		.enter().append('path')
		.attr('class', 'year-handle-line')
		.attr('d', function (d, i) {
			var handleData = [[x(i) + 25, 7],[x(i+1) - 25, 7]]
			return line(handleData)
		});
	
	// first year to last
	var handleData = [[x(0), 20], [x(0), 30], [x(periods.length - 1), 30], [x(periods.length - 1), 20]]; 
	
	g.append('path')
		.attr('d', line(handleData))
		.attr('class', 'year-handle-line')
		
	g.selectAll('.year-handle')
		.data(d3.range(periods.length - 1))
		.enter().append('circle')
		.attr('class', 'year-handle')
		.attr('cx', function (d, i) { return x(i+0.5)})
		.attr('cy', 7)
		.attr('r', 5)
		.attr('fill', function (d, i) {
			if (i == 0) return '#136BC2';
			return '#f0f0f0';
		})
		.on('click', function (d, i) {
			currentPeriodIndex = i; 
			setCurrentRange();
			showCurrentPeriod();
			g.selectAll('.year-handle').transition().attr('fill', '#f0f0f0'); 
			d3.select(this).transition().attr('fill', '#136BC2');
			d3.select('#neighborhoodsGraphContainer').select('svg').remove();
			drawNeighborhoodsGraph();
		});
		
	g.append('circle')
		.attr('class', 'year-handle')
		.attr('cx', x(Math.ceil((periods.length-1) / 2)))
		.attr('cy', 30)
		.attr('r', 5)
		.attr('fill', '#f0f0f0')
		.on('click', function (d) {
			currentPeriodIndex = 'total'; 
			setCurrentRange();
			showCurrentPeriod();
			g.selectAll('.year-handle').transition().attr('fill', '#f0f0f0'); 
			d3.select(this).transition().attr('fill', '#136BC2');
			d3.select('#neighborhoodsGraphContainer').select('svg').remove();
			drawNeighborhoodsGraph();
		})
}


// Todo: clean this up
function createNeighborhoodsData() {
	neighborhoods.forEach(function (d, i) {
		neighborhoodData.set(d.id, d); 
	}); 
	
	var data = d3.nest()
		.key(function(d) { return d.neighborhood})
		.entries(properties); 
	
	data.forEach(function (d) {
		if (neighborhoodData.has(d.key)) {
			for (var i = 0; i < periods.length - 1; i++) {
				var meanChange = d3.median(d.values, function (d2) {
					var change = (parseInt(d2[periods[i+1]]) / parseInt(d2[periods[i]])) - 1.0;
					if (!isNaN(change) && isFinite(change) && Math.abs(change) < MAX_CHANGE) {
						return change; 
					}
				}); 		
				neighborhoodData.get(d.key)[i] = meanChange; 
			}
		
			var overallMeanChange = d3.median(d.values, function (d2) {
				var change = (parseInt(d2[periods[periods.length-1]]) / parseInt(d2[periods[0]])) - 1.0; 
				if (!isNaN(change) && isFinite(change) && Math.abs(change) < MAX_CHANGE) {
					return change;
				}
			}); 
			neighborhoodData.get(d.key)['total'] = overallMeanChange;
		} 
	})
}

function drawNeighborhoodsGraph() {

	var data = neighborhoodData.values().sort(function (a, b) {
		return d3.descending(a[currentPeriodIndex], b[currentPeriodIndex]);
	});

	nTip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) {
			return d.text;
		});

	var margin = {top: 0, left: 60, right: 60, bottom: 0};
	nWidth = width - 30 - margin.left - margin.right;
	nHeight = 80 - margin.top - margin.bottom;

	nX = d3.scale.ordinal().domain(data.map(function (d) { return d.id})).rangeBands([0, nWidth], 0.1);
	var maxVal = d3.max(data, function (d) { return Math.abs(d[currentPeriodIndex]) });
	nY = d3.scale.linear().domain([0, maxVal]).range([nHeight/2.0, 0]);

	var svg = d3.select('#neighborhoodsGraphContainer')
			.append("svg")
		    .attr("width", width)
		    .attr("height", nHeight)
		 	.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	neighborhoodsSvg = svg;

	svg.call(nTip);

	svg.selectAll('.bar')
		.data(data)
		.enter().append('rect')
		.attr('class', 'bar')
		.attr('x', function (d, i) {
			return nX(d.id);
		})
		.attr("width", nX.rangeBand())
		// .attr('y', nHeight/2.0)
		// .attr('height', 0.0)
		// .transition()
		.attr('y', function (d, i) {
			if (d[currentPeriodIndex] > 0) {
				return nY(d[currentPeriodIndex])
			} else {
				return nHeight/2;
			}
		})
		.attr('height', function (d, i) {
			return Math.max(nHeight/2.0 - nY(Math.abs(d[currentPeriodIndex])), 2);
		})
		.attr('fill', function (d, i) {
			if (d[currentPeriodIndex] > 0) {
				 d.fill = '#E34D4D';
			 } else {
				 d.fill = '#136BC2'
			 }
			return d.fill;
		})
		.on('mouseover', function (d) {
			d.text = d.name + ' (' + d3.format('.1%')(d[currentPeriodIndex]) + ')';
			nTip.show(d, this);
			map.svg.selectAll('.neighborhood').transition().attr('opacity', function (d2, i) {
				if (d2.properties[NEIGHBORHOOD_KEY] == d.name) {
					return 1.0
				}
				return 0.0;
			});
		})
		.on('mouseout', function (d) {
			nTip.hide(d);
			map.svg.selectAll('.neighborhood').transition().attr('opacity', 0.0);
		})
    
}

function updateNeighborhoodsGrap() {
	var data = neighborhoodData.values().sort(function (a, b) {
		return d3.descending(a[currentPeriodIndex], b[currentPeriodIndex]); 
	}); 
	
	nX.domain(data.map(function (d) { return d.id})).rangeBands([0, nWidth], 0.1); 
	var maxVal = d3.max(data, function (d) { return Math.abs(d[currentPeriodIndex]) }); 
	nY.domain([0, maxVal]); 
	
	neighborhoodsSvg.selectAll('.bar')
		.data(data)
		.attr('class', 'bar')
		.attr('x', function (d, i) {
			return x(d.id); 
		})
		.attr("width", x.rangeBand())
		.transition()
		.attr('y', function (d, i) {
			if (d[currentPeriodIndex] > 0) {
				return y(d[currentPeriodIndex])
			} else {
				return nHeight/2; 
			}
		})
		.attr('height', function (d, i) {
			return nHeight/2.0 - y(Math.abs(d[currentPeriodIndex]));
		})
		.attr('fill', function (d, i) {
			if (d[currentPeriodIndex] > 0) {
				 d.fill = '#E34D4D';
			 } else {
				 d.fill = '#136BC2'
			 }
			return d.fill;
		})
		.on('mouseover', function (d) {
			d.text = d.name + ' (' + d3.format('%')(d[currentPeriodIndex]) + ')'; 
			tip.show(d); 
			map.svg.selectAll('.neighborhood').transition().attr('opacity', function (d2, i) {
				if (d2.properties[NEIGHBORHOOD_KEY] == d.name) {
					return 1.0
				}
				return 0.0;
			});
		})
		.on('mouseout', function (d) {
			tip.hide(d);
			map.svg.selectAll('.neighborhood').transition().attr('opacity', 0.0);
		})
}

function setupPlayButton() {
	d3.select('#playButton')
		.on('click', function () {
      d3.event.preventDefault();
      currentPeriodIndex = 0; 
      setCurrentRange(); 
      updateData(); 
			var callId = setInterval(function () {
				if (currentPeriodIndex + 1 < periods.length - 1) { 
  				currentPeriodIndex += 1; 
				} else {
          currentPeriodIndex = 'total'; 
					clearInterval(callId);
				}
        setCurrentRange();
        updateData()
			}, 1200);
		});
}


function updateData() {
  showCurrentPeriod();
	yearsSvg.selectAll('.year-handle')
		.attr('fill', function (d, i) {
			if (i == currentPeriodIndex || (currentPeriodIndex == 'total' && i == periods.length - 1)) {
				return '#136BC2'; 
			}
			return '#f0f0f0';
		});
		d3.select('#neighborhoodsGraphContainer').select('svg').remove();
		drawNeighborhoodsGraph();
}

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