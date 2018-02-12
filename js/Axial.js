'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * AXIAL
	 * 
	 * The Axial Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the Axial Component
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
		throw new Error("CINEMA_COMPONENTS Axial module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE Axial module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS Axial module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the Axial module");
	}

	/** @type {boolean} - Flag to indicate that the Axial module has been included */
	CINEMA_COMPONENTS.AXIAL_INCLUDED = true;

	/**
	 * Constructor for Axial Component
	 * Represents a component for changing axes
	 * @param {DOM} parent - The DOM object to build this component inside of 
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * (Note that Axial does not use a filterRegex)
	 */
	CINEMA_COMPONENTS.Axial = function(parent, database, pcoord, ignoreRegex) {
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

		this.pcoord = pcoord;
                this.ignoreRegex = ignoreRegex;

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

		//Specify that this is a Axial component
		d3.select(this.container).classed('QUERY',true);

                // create button
                d3.select(this.container).append("input")
                    .attr("class", "customControlButton")
                    .attr("type", "button")
                    .attr("value", "Modify Columns")
                    .attr("onclick", "query.updateAxes()");

                // add table
                this.table = d3.select(this.container).append('table');
                this.thead = this.table.append('thead');
                this.tbody = this.table.append('tbody');

                // names for each column in table
                var columns = ['Dimension', 'Hide', 'Logscale']

                // add column names to header
                this.thead.append('tr')
                    .selectAll('th')
                    .data(columns).enter()
                    .append('th')
                    .text(function (column) { return column; });

                // add a row for select all
                var selectAllRow = this.tbody.append('tr').attr('class', 'selectAllRow');
                selectAllRow.append('td')
                     .text("Select/Deselect All");
                selectAllRow.append('td')
                     .append('input')
                     .attr('type', 'checkbox')
                     .on('change', function() {self.checkAll(this.checked, '.hideSelector')});
                selectAllRow.append('td')
                     .append('input')
                     .attr('type', 'checkbox')
                     .on('change', function() {self.checkAll(this.checked, '.logscaleSelector')});

                // get list of all parameters to toggle in panel
                var params = this.db.dimensions.filter(function(d) {
                        if (!RegExp(self.ignoreRegex).test(d))
                            return d;
                });
                this.ignoreDimensions = this.db.dimensions.filter(function(d) {
                        if (RegExp(self.ignoreRegex).test(d))
                            return d;
                });

                // create a row for each dimension
                var rows = this.tbody.selectAll('tr:not(.selectAllRow)')
                    .data(params)
                    .enter()
                    .append('tr').attr('class', 'customControlRow');

                // add dimension label to first column
                rows.append('td').append('span')
                    .text(function(d){return d;});

                // add checkbox for hiding dimension to next column
                rows.append('td').append('input')
                    .attr('class', 'hideSelector')
                    .attr('type','checkbox')
                    .attr('checked', function(r) {
                        if (self.pcoord.filter ? self.pcoord.filter.test(r) : true)
                            this.checked = true;
                    });

                // add checkbox for changing dimension to logscale to next column
                rows.append('td').append('input')
                   .attr('class', 'logscaleSelector')
                   .attr('type','checkbox')
                   .attr('checked', function(r) {
                        if (self.pcoord.logscale ? self.pcoord.logscale.test(r) : true)
                            this.checked = true;
                   });

	}
	//establish prototype chain
	CINEMA_COMPONENTS.Axial.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.Axial.prototype.constructor = CINEMA_COMPONENTS.Axial;

        /**
         * Checks all inputs
         */
        CINEMA_COMPONENTS.Axial.prototype.checkAll = function(checkTrue, className) {
            d3.selectAll(className)
                .each(function() {
                    if (checkTrue) {
                        this.checked = true;
                    }
                    else {
                        this.checked = false;
                    }
                });
        }

        /**
         * Update parallel-coordinates plot axes
         */
        CINEMA_COMPONENTS.Axial.prototype.updateAxes = function() {

            var self = this;

            // list of filter and logscale parameters that will be concatenated
            // to a regular expression
            var filterDimensions = [];
            var logscaleDimensions = [];

            // loop over all nodes from control panel
            d3.selectAll('.customControlRow').nodes().forEach(function(d) {

                // get name
                var param = d.textContent;

                // determine if hide checked
                if (d.children[1].children[0].checked) {
                    filterDimensions.push(param);
                }
                // determine if logscale checked
                if (d.children[2].children[0].checked) {
                    logscaleDimensions.push(param);
                }

            });

            // do not include ignore dimensions ever
            filterDimensions = filterDimensions.concat(this.ignoreDimensions);

            // FIXME: this is bad :(
            currentDbInfo.filter = filterDimensions.length > 0 ? filterDimensions.join("|") : "^$";
            currentDbInfo.logscale = logscaleDimensions.length > 0 ? logscaleDimensions.join("|") : "^$";
            load();

        }

})();
