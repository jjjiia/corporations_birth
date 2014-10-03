var mdcColors = [
	"#000000", "#667b33", "#f86377", "#cfd5d3", "#d1adc7",
	"#fc712b", "#e7de3f", "#8d4b2c", "#507890", "#b79738", 
	"#7e7259", "#c39666", "#a1b3fd", "#8b1e8a", "#404ee9", 
	"#26a9e1", "#e62037", "#f255f0", "#9fc924", "#fff100", 
	"#b44ee9", "#fc7dbf", "#000000", "#929497", "#006936", 
	"#6dc066"]

var mdcToCat = {"16": 0, "17": 16, "5": 1, "6": 2, "12": 3,
				"13": 3, "10": 4, "7": 4, "11": 4, "18": 5,
				"25": 6, "21": 6, "19": 7, "8": 8, "1": 9,
				"14": 10, "4": 11, "2": 12, "3": 12, "9": 13,
				"20": 14, "23": 15, "24": 15, "15": 10,
}

var catColors = ['rgb(230, 32, 55)', 'rgb(252, 113, 43)', 'rgb(231, 222, 63)', 'rgb(161,179,253)',
				'rgb(141,75,44)', 'rgb(159, 201, 36)', 'rgb(252, 125, 191)', 'rgb(255, 241, 0)', 
				'rgb(80, 120, 144)', 'rgb(102, 123, 51)', 'rgb(64, 78, 233)', 'rgb(209, 173, 199)', 
				'rgb(248, 99, 119)', 'rgb(183, 151, 56)', 'rgb(180, 78, 233)', 'rgb(146, 148, 151)', 
				'rgb(242,85,240)'];
				

function hideAllPopovers() {
	isMenu = false;
	$('.popover').remove();
	$('#hospitalListBtn').popover('hide'); 
	$('#visTitle').popover('hide');
}

function setupHashNavigation() {
	if (window.location.hash !== '') {
		console.log(window.location.hash);
		processHash(true);
	}

	window.onhashchange = function () {
		processHash();
	}
}


function populateHospitals() {
	var hospitalIds = Object.keys(hospitalData.hospital_id_to_name); 
	hospitalIds.sort(function (a, b) {
		var nameA = hospitalData.hospital_id_to_name[a];
		var nameB = hospitalData.hospital_id_to_name[b];
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1; 
		return 0;
	});
	
	var popOverElt = '<div id="hospitalList" class="list-group">';
	popOverElt += '<a id="state" data-id="state" class="list-group-item"> New York State </a>';
	popOverElt += '<a id="city" data-id="city" class="list-group-item"> New York City </a>';

	for (var i in hospitalIds) {
		var hid = hospitalIds[i]; 
		var hname = hospitalData.hospital_id_to_name[hid];
		popOverElt += '<a id="h' + hid + '" data-id="' + hid + '" class="list-group-item">' + hname + '</a>';
	}
	popOverElt += '</div>';
	var closeBtn = $('<a>').addClass('hospital-list-close-btn')
		.html('<i class="fa fa-times"></i>')

	var closeBtnText = $('<div>').append(closeBtn).html();

	$('#hospitalListBtn').popover({
		content: popOverElt,
		html: true,
		placement: 'bottom',
		trigger: 'click',
		title: 'Visualize by Location' + closeBtnText,
	}).on('click', function (e) {
		e.stopPropagation();
		isMenu = !(isMenu);
		if (isMenu) {
			$(this).popover('show');
		} 
	}).on('shown.bs.popover', function () {
		highLightCurrentDataSource();
		$('.hospital-list-close-btn').click(function () {
			$('#hospitalListBtn').popover('hide');
			$('.list-group-item').removeClass('selected');
			$(this).addClass('selected');
		});
		$('#hospitalList .list-group-item').click(function (e) {
			e.stopPropagation();
			$('#hospitalListBtn').popover('show');
			$('.list-group-item').removeClass('active');
			$(this).addClass('active');
			var id = $(this).attr('data-id'); 
			window.location.hash = '/hospitals/' + id;
			hideAllPopovers();
			return false; 
		});

	})

	$('#hospitalListBtn').on('hidden.bs.popover', function () {
		showHospitalOnMap();
	});

	$(document).on('click', function () {
		hideAllPopovers();
	});
}

function processHash(isInitialLoad) {
	var variables =  window.location.hash.replace('#/', '').split('/');
	if (variables.length >= 2) {
		var sourceId = variables[1];
		if (isInitialLoad) {
			setTimeout(function () {
				change(sourceId);
			}, 700);
		} else {
			change(sourceId);
		}
	}
}

function highLightCurrentDataSource () {
	var selector = '#'; 
	if (currentDataId == 'state' || currentDataId == 'city') {
		selector = selector + currentDataId; 
	} else {
		selector = selector + 'h' + currentDataId; 
	}
	$(selector).addClass('selected').scrollIntoView(); 
}

function showHospitalOnMap() {
	if (currentDataId == 'state' || currentDataId == 'city') return;
	var d = hospitals[currentDataId]; 
	var lat = parseFloat(d.lat), lng = parseFloat(d.lng); 
	map.highlightLocation(lat, lng); 
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

// function setupBackButton() {
// 	window.onhashchange = function () {
// 		console.log('event', location.hash)
// 		if (location.hash == '') {
// 			closeEssayBox(); 
// 			$('#showMore').text(' ... more ');
// 		}
// 	}
// }