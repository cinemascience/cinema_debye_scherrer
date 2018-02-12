'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * PCOORDSVG
	 * 
	 * The PcoordSVG Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the PcoordSVG component:
	 * A subclass of Pcoord which draws a Paralell Coordinates chart using SVG.
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

	//Require that the Pcoord Component be included
	if (!CINEMA_COMPONENTS.PCOORD_INCLUDED)
		throw new Error("CINEMA_COMPONENTS PcoordSVG Component requires that Pcoord"+
			" component be included. Please make sure that Pcoord component"+
			" is included BEFORE PcoordSVG module");

	/** @type {boolean} - Flag to indicate that the PcoordSVG Component has been included */
	CINEMA_COMPONENTS.PCOORDSVG_INCLUDED = true;

	/**
	 * Constructor for PcoordSVG Component
	 * Represents a component for displaying and interacting with a database on a parallel coordinates chart
	 * rendered with SVG
	 * @param {DOM} parent - The DOM object to build this component inside of
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.PcoordSVG = function(parent, database, filterRegex, logscaleRegex) {
		//call super-constructor
		CINEMA_COMPONENTS.Pcoord.call(this,parent,database,filterRegex,logscaleRegex);

		//Specify that this is a Pcoord SVG component
		d3.select(this.container).classed('SVG',true);

		//Add SVG Components to pathContainer
		this.svg = this.pathContainer.append('svg')
			.style('position','absolute')
			.style('top',this.margin.top+'px')
			.style('left',this.margin.left+'px')
			.attr('width',this.internalWidth+'px')
			.attr('height',this.internalHeight+'px');
		//Add group for selected paths
		this.selectedPaths = this.svg.append('g')
			.classed('selectedPaths',true);
		//Add group for highlighted paths
		this.highlightedPaths = this.svg.append('g')
			.classed('highlightedPaths',true);
		//Add group for overlay paths
		this.overlayPaths = this.svg.append('g')
			.classed('overlayPaths',true);

		this.redrawPaths();
	}
	//establish prototype chain
	CINEMA_COMPONENTS.PcoordSVG.prototype = Object.create(CINEMA_COMPONENTS.Pcoord.prototype);
	CINEMA_COMPONENTS.PcoordSVG.prototype.constructor = CINEMA_COMPONENTS.PcoordSVG;

	/**************************
	 * OVERRIDE METHODS
	 **************************/

	CINEMA_COMPONENTS.PcoordSVG.prototype.updateSize = function() {
		//call super
		CINEMA_COMPONENTS.Pcoord.prototype.updateSize.call(this);

		//rescale svg
		this.svg
			.attr('width',this.internalWidth+'px')
			.attr('height',this.internalHeight+'px');
	}

	/**
	 * Redraw the current selection of paths.
	 */
	CINEMA_COMPONENTS.PcoordSVG.prototype.redrawSelectedPaths = function() {
		var self = this;
		//Bind to selection and update
		var update = this.selectedPaths
			.selectAll('path').data(this.selection);
		update.enter() //ENTER
			.append('path')
		.merge(update) //ENTER + UPDATE
			.attr('index',function(d){return d;})
			.attr('d',function(d){
				return self.getPath(self.db.data[d]);
			})
			.on('mouseenter',function(d){
				self.dispatch.call("mouseover",self,d,d3.event);
			})
			.on('mouseleave',function(d){
				self.dispatch.call("mouseover",self,null,d3.event);
			})
			.on('click', function(d) {
				self.dispatch.call("click",self,d,d3.event);
			});
		update.exit() //EXIT
			.remove();
		// redraw picked paths
		this.redrawPickedPaths();
	}

	/**
	 * Redraw the currently highlighted path.
	 */
	CINEMA_COMPONENTS.PcoordSVG.prototype.redrawHighlightedPaths = function() {
		var self = this;
		//Bind to highlighted and update
		var update = this.highlightedPaths
			.selectAll('path').data(this.highlighted);
		update.enter() //ENTER
			.append('path')
		.merge(update) //ENTER + UPDATE
			.attr('index',function(d){return d;})
			.attr('d',function(d){
				return self.getPath(self.db.data[d]);
			})
                        .on('click', function(d) {
                                self.dispatch.call("click",self,d,d3.event);
                        });
		update.exit() //EXIT
			.remove();
	}

        /**
         * Redraw the currently picked paths.
         */
        CINEMA_COMPONENTS.PcoordSVG.prototype.redrawPickedPaths = function() {
                var self = this;
                //Bind to picked and update
                this.selectedPaths.selectAll('path').each(function(d) {
			if (self.picked.indexOf(d) != -1) {
				d3.select(this).style("stroke", "red");
			}
			else {
				d3.select(this).style("stroke", null);
			}
		});
        }

	/**
	 * Redraw the overlay paths.
	 */
	CINEMA_COMPONENTS.PcoordSVG.prototype.redrawOverlayPaths = function() {
		var self = this;
		//Bind to overlayData and update
		var update = this.overlayPaths
			.selectAll('path').data(this.overlayData);
		update.enter() //ENTER
			.append('path')
		.merge(update) //ENTER + UPDATE
			.attr('style',function(d){return d.style;})
			.attr('d',function(d){
				return self.getPath(d.data);
			});
		update.exit() //EXIT
			.remove();
	}

})();
