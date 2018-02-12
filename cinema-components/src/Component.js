'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * COMPONENT
	 * 
	 * The Component module for the CINEMA_COMPONENTS library.
	 * Contiains the constructor for components (PcoordSVG,PcoordCanvas,Glyph, etc.)
	 * The object contains common methods and fields used by all components.
	 * 
	 * Also contains definitions for a few classes that may be used by components.
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

	//Require that the database module be included
	if (!CINEMA_COMPONENTS.DATABASE_INCLUDED)
		throw new Error("CINEMA_COMPONENTS Component module requires that Database"+
				" module be included. Please make sure that Database module"+
				" is included BEFORE Component module");

	/** @type {boolean} - Flag to indicate that the Component module has been included */
	CINEMA_COMPONENTS.COMPONENT_INCLUDED = true;

	/**
	 * Abstract constructor for Component.
	 * Represents a component for displaying and interacting with a database.
	 * Objects such as Pcoord and Glyph inherit from this
	 * @param {DOM} parent - The DOM object to build this component inside of (all children will be removed)
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.Component = function(parent, database, filterRegex, logscaleRegex) {
		if (this.constructor === CINEMA_COMPONENTS.Component)
			throw new Error("Cannot instantiate abstract class 'Component.'"+
				" Please use a subclass.");

		/** @type {DOM} The parent DOM object to build this component inside of */
		this.parent = parent;

		//Clear children
		this.parent.innerHTML = '';

		/** @type {CINEMA_COMPONENTS.Database} A reference to the database behind this component */
		this.db = database;
		/** @type {string[]} The filtered list of dimensions that are shown on the component */
		this.dimensions = [];

		//NOTE that this.dimensions is filtered to have only the dimensions shown on the component
		//while this.db.dimensions includes all dimensions in the database

		/** @type {RegExp} The regex used to filter out dimensions to not be shown on the component*/
		this.filter = filterRegex;

                /** @type {RegExp} The regex used to set logarithmic out dimensions to not be shown on the component*/
                this.logscale = logscaleRegex;

		//Get filtered Dimensions according to filterRegex
		this.dimensions = this.db.dimensions.filter(function(d) {
			return filterRegex ? !filterRegex.test(d) : true;
		});

		//Create DOM content
		/** @type {DOM} The whole content of the component*/
		this.container = parent.appendChild(document.createElement('div'));
		this.container.setAttribute('class','CINEMA_COMPONENT');
		this.container.style.position = 'absolute';

		CINEMA_COMPONENTS.Component.prototype.updateSize.call(this);
	};

	/**
	 * Resize this component to fit the size of its parent.
	 * This should be called every time the size of the component's
	 * parent changes.
	 */
	CINEMA_COMPONENTS.Component.prototype.updateSize = function(){
		this.margin = this.margin || new CINEMA_COMPONENTS.Margin(0,0,0,0);
		this.parentRect = this.parent.getBoundingClientRect();
		this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
		this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

		this.container.style.width = this.parentRect.width+'px';
		this.container.style.height = this.parentRect.height+'px';
	};

	/**
	 * Remove this component from the scene
	 */
	CINEMA_COMPONENTS.Component.prototype.destroy = function() {
		d3.select(this.container).remove();
	};

	/**
	 * Constructor for Margin object
	 * Defines the top,right,bottom and left margins for drawing a component.
	 * @param {number} top - top margin (in pixels)
	 * @param {number} right - right margin (in pixels)
	 * @param {number} bottom - bottom margin (in pixels)
	 * @param {number} left - left margin (in pixels)
	 */
	CINEMA_COMPONENTS.Margin = function(top,right,bottom,left) {
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.left = left;
	}

	/**
	 * Constructor for ExtraData object
	 * Defines extra, custom data that may be shown on a component.
	 * @param {Object} data - The data to show 
	 *     (in the same format as the data points in the database)
	 * @param {any} style - Object representing how to draw the data.
	 *     (the interpretation of this is up to specific components)
	 *     (for example PcoordSVG expects a CSS string and
	 *     PcoordCanvas expects an object with canvas context attributes)
	 */
	CINEMA_COMPONENTS.ExtraData = function(data, style) {
		this.data = data;
		this.style = style;
	}
})();
