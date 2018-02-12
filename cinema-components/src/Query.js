'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * QUERY
	 * 
	 * The Query Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the Query Component
	 * Which allows for defining a custom data point and querying
	 * a database for similar data points
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
		throw new Error("CINEMA_COMPONENTS Query module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE Query module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS Query module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the Query module");
	}

	/** @type {boolean} - Flag to indicate that the Query module has been included */
	CINEMA_COMPONENTS.QUERY_INCLUDED = true;

	/**
	 * Constructor for Query Component
	 * Represents a component for querying a database
	 * @param {DOM} parent - The DOM object to build this component inside of 
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * (Note that Query does not use a filterRegex)
	 */
	CINEMA_COMPONENTS.Query = function(parent, database) {
		var self = this;

		/***************************************
		 * SIZING
		 ***************************************/

		//Call super-constructor (will calculate size)
		CINEMA_COMPONENTS.Component.call(this,parent,database);

		/***************************************
		 * DATA
		 ***************************************/

		//override this.dimensions to include only numeric dimensions
		this.dimensions = this.dimensions.filter(function(d) {
			return !self.db.isStringDimension(d);
		});

		/** @type {number[]} Indices of the similar results to the last query */
		this.results = [];

		/** @type {CINEMA_COMPONENTS.ExtraData} The custom-defined data point */
		this.custom = new CINEMA_COMPONENTS.ExtraData({},"");
		/** @type {CINEMA_COMPONENTS.ExtraData} Approximations of the boudnaries for similar data given the threshold */
		this.upper = new CINEMA_COMPONENTS.ExtraData({},"");
		this.lower = new CINEMA_COMPONENTS.ExtraData({},"");
		// (styles will be decided by a client program)

		/***************************************
		 * EVENTS
		 ***************************************/

		/** @type {d3.dispatch} Hook for events on chart
		 * Set handlers with on() function. Ex: this.dispatch.on('query',handlerFunction(results))
		 * 'query': Triggered when a query is made
		 *     (argument is the results of the query (as an array of indices))
		 * 'customchange': Triggered when the custom-defined data point changes
		 *     (arguemnt is an array with extra data custom,upper and lower (in that order))
		*/
		this.dispatch = d3.dispatch('query','customchange');

		/***************************************
		 * SCALES
		 ***************************************/

		//Input sliders for each dimension range from 0 to 100
		//So create scales to scale a slider's value to a value in its dimension
		this.scales = {};
		this.dimensions.forEach(function(d) {
			self.scales[d] = d3.scaleLinear()
				.domain([0,100])
				.range(self.db.dimensionDomains[d]);
		});

		/***************************************
		 * DOM Content
		 ***************************************/

		//Specify that this is a Query component
		d3.select(this.container).classed('QUERY',true);

		/** @type {DOM (button)} Button to perform a query when pressed */
		this.queryButton = d3.select(this.container).append('button')
			.classed('queryButton',true)
			.text("Find Similar")
			.on('click',function() {
				var results = self.db.getSimilar(self.custom.data,self.thresholdNode.value);
				d3.select(self.readout).text(results.length+ " results found!");
				self.dispatch.call('query',self,results.slice());
			})
			.node();

		/** @type {DOM (span)} Label for Threshold input */
		this.thresholdLabel = d3.select(this.container).append('span')
			.classed('thresholdLabel',true)
			.text("Threshold:")
			.node();

		/** @type {DOM (input/number)} Number input for threshold */
		this.thresholdNode = d3.select(this.container).append('input')
			.classed('thresholdInput',true)
			.attr('type','number')
			.attr('max',this.dimensions.length)
			.attr('min',0)
			.attr('step',0.05)
			.on('change',function() {
				self.updateBounds();
				self.dispatch.call('customchange',self,[self.custom,self.upper,self.lower]);
			})
			.node();
		this.thresholdNode.value = 1.0;

		/** @type {DOM (span)} Readout for number of found results */
		this.readout = d3.select(this.container).append('span')
			.classed('readout',true)
			.node();

		/** @type {d3.selection} Input rows for each dimension */
		this.rows = d3.select(this.container).selectAll('.inputRow')
			.data(this.dimensions)
		.enter().append('div')
			.classed('inputRow',true)
			.style('position','relative');
		//Create contents of each input row
		//labels
		this.rows.append('span')
			.classed('label',true)
			.style('position','absolute')
			.text(function(d){return d;});
		//checkbox
		this.rows.append('input')
			.attr('type','checkbox')
			.style('position','absolute')
			.on('input',function(d) {
				if (this.checked) {
					var slider = d3.select(this.parentNode).select('input[type="range"]');
					self.custom.data[d] = self.scales[d](slider.node().value);
				}
				else {
					delete self.custom.data[d];
				}
				self.updateBounds();
				self.dispatch.call('customchange',self,[self.custom,self.upper,self.lower]);
			});
		//slider
		this.rows.append('input')
			.attr('type','range')
			.attr('min',0)
			.attr('max',100)
			.attr('step',1)
			.each(function(){this.value = 50;})
			.style('position','absolute')
			.on('input',function(d){
				var check = d3.select(this.parentNode).select('input[type="checkbox"]');
				if (!check.node().checked)
					check.node().checked = true;
				self.custom.data[d] = self.scales[d](this.value);
				self.updateBounds();
				self.dispatch.call('customchange',self,[self.custom,self.upper,self.lower]);
			});

	}
	//establish prototype chain
	CINEMA_COMPONENTS.Query.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.Query.prototype.constructor = CINEMA_COMPONENTS.Query;

	/**
	 * Update upper and lower data depending on custom data and current threshold value
	 */
	CINEMA_COMPONENTS.Query.prototype.updateBounds = function() {
		var self = this;
		var threshold = this.thresholdNode.value;
		//average difference along each dimension
		var avg = (threshold/d3.keys(this.custom.data).length)*100;
		this.upper.data = {};
		this.lower.data = {};
		this.dimensions.forEach(function(d) {
			if (self.custom.data[d] !== undefined) {
				var s = self.scales[d];
				self.lower.data[d] = s(Math.max(s.invert(self.custom.data[d])-avg,0));
				self.upper.data[d] = s(Math.min(s.invert(self.custom.data[d])+avg,100));
			}
		});
	}

})();