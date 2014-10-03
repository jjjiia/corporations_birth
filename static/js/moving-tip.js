var tooltip = function (options) {
	
	this.tip = null;
	 
	this.container = 'body'; 
	
	if (typeof options !== 'undefined') {
		if (typeof options.container !== 'undefined') this.container = options.container; 
	}
	
	var tooltip = this;
	
	this.show = function (text) {
		this.tip.css('display', 'inline-block').text(text);
	}
	
	this.setText = function (text) {
		this.tip.html(text)
	}
	
	this.hide = function () {
		
	}
	
	this.initialize = function () {
		this.tip = $('<div></div>').addClass('tooltip2')
			.css({
				'display': 'inline-block',
				'position': 'absolute',
				'left': '0',
				'top': '0', 
				'transition': 'translate 50ms;'
			})
			.appendTo('body')
			.text('hello');
		
		$(this.containter).on('mouseenter', function (e) {
			tooltip.show('Hello There');
		});
		
		$(this.container).on('mousemove', function (e) {
			var mouseX = e.pageX + 10; 
			var mouseY = e.pageY + 20; 
			console.log(mouseX, mouseY, 'translate(' + mouseX + ',' + mouseY + ')')
			//tooltip.tip.css({left: mouseX, top: mouseY});
			tooltip.tip.css('transform', 'translate(' + mouseX + 'px,' + mouseY + 'px)');
		});
	}
}