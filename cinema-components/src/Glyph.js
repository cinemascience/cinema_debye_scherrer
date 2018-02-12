'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * GLYPH
	 * 
	 * The Glyph Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for a Glyph component.
	 * The Glyph component allows for viewing one data point at a time in a glyph chart
	 * 
	 * @exports CINEMA_COMPONENTS
	 * 
	 * @author Cameron Tauxe
	 */

	//If CINEMA_COMPONENTS is already defined, add to it, otherwise create it
	var CINEMA_COMPONENTS = {}
	if (window.CINEMA_COMPONENTS)
		CINEMA_COMPONENTS = window.CINEMA_COMPONENTS;
	else
		window.CINEMA_COMPONENTS = CINEMA_COMPONENTS;

	//Require that the Component module be included
	if (!CINEMA_COMPONENTS.COMPONENT_INCLUDED)
		throw new Error("CINEMA_COMPONENTS Glyph module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE Glyph module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS Glyph module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the Glyph module");
	}

	/** @type {boolean} - Flag to indicate that the Glpyph module has been included */
	CINEMA_COMPONENTS.GLYPH_INCLUDED = true;

	//Constants
	var RADTODEG = (180/Math.PI),
		DEGTORAD = (Math.PI/180);

	CINEMA_COMPONENTS.Glyph = function(parent, database, filterRegex) {
		var self = this;

		/***************************************
		 * SIZING
		 ***************************************/

		/** @type {CINEMA_COMPONENTS.Margin} Override default margin */
		this.margin = new CINEMA_COMPONENTS.Margin(50,50,50,50);
		/** @type {number} the space between the center and lowest data values on the chart */
		this.innerMargin;
		/** @type {number} The radius of the glyph */
		this.radius;

		//call super-constructor
		CINEMA_COMPONENTS.Component.call(this,parent,database,filterRegex);
		//after size is calculate in the super-constructor, set radius and innerMargin
		this.radius = Math.min(this.internalHeight,this.internalWidth)/2;
		this.innerMargin = this.radius/11;

		/***************************************
		 * DATA
		 ***************************************/

		 /** @type {number} The index of the selected data point */
		 this.selected = 0;

		/***************************************
		 * SCALES
		 ***************************************/

		/** @type {d3.scalePoint} Rotation scale. Maps dimensions to a rotation in radians */
		this.rotation = d3.scalePoint()
			.domain(this.dimensions)
			.range([0,Math.PI*2-Math.PI*2/(this.dimensions.length+1)]);
		
		/** @type {Object(d3.scale)} Scales for each dimension
		 * Maps a value to a distance from the center
		 */
		this.scales = {};
		this.dimensions.forEach(function(d) {
			//Create point scale for string dimensions
			if (self.db.isStringDimension(d))
				self.scales[d] = d3.scalePoint()
					.domain(self.db.dimensionDomains[d])
					.range([self.radius-self.innerMargin,0]);
			//Create linear scale for numeric dimensions
			else
				self.scales[d] = d3.scaleLinear()
					.domain(self.db.dimensionDomains[d])
					.range([self.radius-self.innerMargin,0]);
		});

		/***************************************
		 * DOM Content
		 ***************************************/

		//Create DOM content
		//Specify that this is a Glyph component
		d3.select(this.container).classed('GLYPH',true);

		/** @type {d3.selection (svg)} The SVG element containing all the content of the component */
		this.svg = d3.select(this.container).append('svg')
		.attr('class','glyphChart')
		.attr('viewBox',(-this.margin.right)+' '+(-this.margin.top)+' '+
						(this.parentRect.width)+' '+
						(this.parentRect.height))
		.attr('preserveAspectRatio','none')
		.attr('width','100%')
		.attr('height','100%');

		/** @type {d3.selection (path)} The path representing the selected data */
		this.path = this.svg.append('path')
			.classed('glyph',true);

		/** @type {d3.selection g} Labels for each dimension */
		this.labels = self.svg.append('g')
			.classed('labels',true)
		.selectAll('g.label')
			.data(this.dimensions)
			.enter().append('g')
				.classed('label',true)
				.attr('transform',function(d){return self.getAxisTransform(d);});
		//Add label text
		this.labels.append('text')
			.style('text-anchor','middle')
			.text(function(d){return d;})
			.attr('transform',function(d) {
				return "translate(0 -15) "
					+"rotate("+self.getTextRotation(d)+")";
			});


		/***************************************
		 * AXES
		 ***************************************/

		/** @type {d3.selection (g)} The SVG group containing all the axes */
		this.axisContainer = this.svg.append('g')
			.classed('axisContainer',true);

		/** @type {d3.selection (g)} Groups for each axis*/
		this.axes = this.axisContainer.selectAll('.axisGroup')
			.data(this.dimensions)
		.enter().append('g')
			.classed('axisGroup',true)
			.attr('transform',function(d){return self.getAxisTransform(d);});
		//Create d3 axes
		this.axes.append('g')
			.classed('axis',true)
			.each(function(d) {
				d3.select(this).call(d3.axisLeft().scale(self.scales[d]));
				d3.select(this).selectAll('text')
					.style('text-anchor','end')
					.attr('transform',"rotate("+self.getTextRotation(d)+" -15 0)");
			});

		this.redraw();
	}
	//establish prototype chain
	CINEMA_COMPONENTS.Glyph.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.Glyph.prototype.constructor = CINEMA_COMPONENTS.Glyph;

	/**
	 * Get the path (contents of the 'd' attribute) for the given data point
	 * @param {Object} p The data point
	 */
	CINEMA_COMPONENTS.Glyph.prototype.getPath = function(p) {
		var self = this;
		var path;
		var startPoint;
		this.dimensions.forEach(function(d,i) {
			var point = self.getPoint(d,p);
			if (i == 0) {
				startPoint = point;
				path = "M "+point.x+" "+point.y+" "
			}
			else if (i == self.dimensions.length-1) {
				//loop back to the start point at the end to close the path
				path += "L "+point.x+" "+point.y+" "+
						"L "+startPoint.x+" "+startPoint.y;
			}
			else {
				path += "L "+point.x+" "+point.y+" ";
			}
		});
		return path;
	}

	/**
	 * The x,y point on the chart where the given data point passes
	 * through the axis for the given dimension
	 * @param {string} d The dimension
	 * @param {Object} p The data point
	 */
	CINEMA_COMPONENTS.Glyph.prototype.getPoint = function(d,p) {
		if (isNaN(p[d]))
			//NaN values are placed in the center of the chart
			return {x: this.radius, y: this.radius};
		var len = this.radius-this.scales[d](p[d]);
		var rot = this.rotation(d)-Math.PI/2;
		var x = Math.cos(rot)*len;
		var y = Math.sin(rot)*len;
		return {x: x+this.radius, y: y+this.radius};
	}

	/**
	 * Should be called every time the size of the chart's container changes.
	 * Updates the sizing and scaling of all parts of the chart and redraws
	 */
	CINEMA_COMPONENTS.Glyph.prototype.updateSize = function() {
		var self = this;

		//Call super (will recalculate size)
		CINEMA_COMPONENTS.Component.prototype.updateSize.call(this);

		//Update radius and innerMargin
		this.radius = Math.min(this.internalHeight,this.internalWidth)/2;
		this.innerMargin = this.radius/11;

		//Rescale SVG
		this.svg.attr('viewBox',(-this.margin.right)+' '+(-this.margin.top)+' '+
				(this.parentRect.width)+' '+
				(this.parentRect.height))

		//Rescale scales
		this.dimensions.forEach(function (d) {
			self.scales[d].range([self.radius-self.innerMargin,0]);
		});

		//Re-transform axes
		this.axes.attr('transform',function(d){return self.getAxisTransform(d);})
		//Rebuild axes
		.each(function(d) {
			d3.select(this).call(d3.axisLeft().scale(self.scales[d]));
		});

		//Re-tranform labels
		this.labels.attr('transform',function(d){return self.getAxisTransform(d);});

		//Rebuild path
		this.path.attr('d',function(d) {return self.getPath(self.db.data[d]);});
	};

	/**
	 * Set the selected data point to the one with the given index
	 */
	CINEMA_COMPONENTS.Glyph.prototype.setSelected = function(index) {
		this.selected = index;
		this.redraw();

	};

	/**
	 * Redraw the glyph path
	 */
	CINEMA_COMPONENTS.Glyph.prototype.redraw = function() {
		var self = this;
		this.path.datum(this.selected)
			.transition(1000)
				.attr('d',function(d){return self.getPath(self.db.data[d]);});
	}

	/**
	 * Get the transform attribute for an axis with the given dimension
	 * @param {string} d The dimension to transform to
	 */
	CINEMA_COMPONENTS.Glyph.prototype.getAxisTransform = function(d) {
		var r = this.radius;
		var rot = this.rotation(d)*RADTODEG;
		return "translate("+r+") "+
			"rotate("+rot+" 0 "+r+")";
	};

	/**
	 * Get the rotation (in degrees) for text on an axis with the given dimension
	 * so that the text will appear right-side-up
	 * @param {string} d The dimension to rotate for
	 */
	CINEMA_COMPONENTS.Glyph.prototype.getTextRotation = function(d) {
		var rot = this.rotation(d)*(180/Math.PI);
		return (rot > 90 && rot < 270) ? 180 : 0;
	}

})();