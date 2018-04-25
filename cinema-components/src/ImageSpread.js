'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * IMAGESPREAD
	 * 
	 * The ImageSpread Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the ImageSpread Component
	 * Which displays image data for a set of rows in a database.
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
		throw new Error("CINEMA_COMPONENTS ImageSpread module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE ImageSpread module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS ImageSpread module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the ImageSpread module");
	}

	/** @type {boolean} - Flag to indicate that the ImageSpread module has been included */
	CINEMA_COMPONENTS.IMAGE_SPREAD_INCLUDED = true;

	/**
	 * Constructor for ImageSpread Component
	 * Represents a component for viewing a spread of images from a selection of data
	 * @param {DOM} parent - The DOM object to build this component inside of 
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * (Note that ImageSpread does not use a filterRegex)
	 */
	CINEMA_COMPONENTS.ImageSpread = function(parent, database) {
		var self = this;

		/***************************************
		 * SIZING
		 ***************************************/

		//Call super-constructor (will calculate size)
		CINEMA_COMPONENTS.Component.call(this,parent,database);

		/***************************************
		 * DATA
		 ***************************************/

		//override this.dimensions to include only FILE dimensions
		this.dimensions = this.dimensions.filter(function(d) {
			return (/^\s*FILE/).test(d);
		});
		/** @type {boolean} Whether any FILE dimensions exist in the dataset */
		this.hasFileDimensions = this.dimensions.length != 0;

		/** @type {number[]} Inidices of all the data points to display */
		this.selection = [];

		/** @type {number} The page number currently being viewed*/
		this.currentPage = 1;

		/***************************************
		 * EVENTS
		 ***************************************/

		/** @type {d3.dispatch} Hook for events on chart
		 * Set handlers with on() function. Ex: this.dispatch.on('mouseover',handlerFunction(i))
		 * 'mouseover': Triggered when a set of images is moused over
		 *     (arguments are the index of moused over data and mouse event)
		*/
		this.dispatch = d3.dispatch('mouseover');

		/***************************************
		 * DOM Content
		 ***************************************/

		//Specify that this is an ImageSpread component
		d3.select(this.container).classed('IMAGE_SPREAD',true);

		//If there are no file dimensions, place a warning and stop here
		if (!this.hasFileDimensions) {
			this.noFileWarning = d3.select(this.container).append('div')
				.classed('noFileWarning',true)
				.text("No file information to display");
			return;
		}

		//NOTHING IN THE CONSTRUCTOR AFTER THIS POINT WILL BE EXECUTED 
		//IF THERE ARE NO FILE DIMENSIONS

		/** @type {d3.selection} The header/control panel */
		this.header = d3.select(this.container).append('div')
			.classed('header',true)
			.style('position','absolute')
			.style('width','100%');

		/** @type {d3.selection} The container for all the images */
		this.imageContainer = d3.select(this.container).append('div')
			.classed('imageContainer',true)
			.style('position','absolute')
			.style('width','100%')
			.style('overflow-y','auto');

		/***************************************
		 * HEADER/CONTROLS
		 ***************************************/

		//pageSize controls
		/** @type {d3.selection} The control panel for pageSize */
		this.pageSizeContainer = this.header.append('div')
			.classed('controlPanel pageSize',true);
		this.pageSizeContainer.append('span')
			.classed('label',true)
			.text("Results Per Page:");
		this.pageSizeContainer.append('br');
		/** @type {DOM (select)} The select node controlling page size */
		this.pageSizeNode = this.pageSizeContainer.append('select')
			.on('change',function() {
				self.updatePageNav();
				self.populateResults();
			})
			.node();
		//append options
		d3.select(this.pageSizeNode).selectAll('option')
			.data([10,25,50,100])
			.enter().append('option')
				.attr('value',function(d){return d;})
				.text(function(d){return d;});
		//Select 25 as default option
		d3.select(this.pageSizeNode).select('option[value="25"]')
			.attr('selected','true');

		//sort controls
		/** @type {d3.selection} The control panel for choosing sort dimension */
		this.sortContainer = this.header.append('div')
			.classed('controlPanel sort',true);
		this.sortContainer.append('span')
			.classed('label',true)
			.text("Sort By:");
		this.sortContainer.append('br');
		/** @type {DOM (select)} The select node controlling sort dimension */
		this.sortNode = this.sortContainer.append('select')
			.on('change',function() {
				self.selection.sort(self.getSortComparator());
				self.populateResults();
			})
			.node();
		//append options
		d3.select(this.sortNode).selectAll('option')
			.data(this.db.dimensions.filter(function(d){
				return !self.db.isStringDimension(d);
			}))
			.enter().append('option')
				.attr('value',function(d){return d;})
				.text(function(d){return d;});
		
		//sortOrder controls
		/** @type {d3.selection} The control panel for toggling sort order */
		this.sortOrderContainer = this.header.append('div')
			.classed('controlPanel sortOrder',true);
		this.sortOrderContainer.append('span')
			.classed('label',true)
			.text("Reverse Sort Order:");
		this.sortOrderContainer.append('br');
		/** @type {DOM (input/checkbox)} The node for toggling sort order */
		this.sortOrderNode = this.sortOrderContainer.append('input')
			.attr('type','checkbox')
			.on('input',function() {
				self.selection.sort(self.getSortComparator());
				self.populateResults();
			})
			.node();

		//imageSize controls
		/** @type {d3.selection} The control panel for controlling image size */
		this.imageSizeContainer = this.header.append('div')
			.classed('controlPanel imageSize',true);
		this.imageSizeContainer.append('span')
			.classed('label',true)
			.text("Image Size: 150px");
		this.imageSizeContainer.append('br');
		/** @type {DOM (input/range)} The node for adjusting imageSize */
		this.imageSizeNode = this.imageSizeContainer.append('input')
			.attr('type','range')
			.attr('min','100')
			.attr('max','500')
			.on('input',function() {
				d3.select(self.container).selectAll('.display')
					.style('width',this.value+'px');
				d3.select(self.container).select('.controlPanel.imageSize .label')
					.text("Image Size: "+this.value+"px");
			})
			.node();
		this.imageSizeNode.value = 150;

		//Update size
		this.updateSize();
	}
	//establish prototype chain
	CINEMA_COMPONENTS.ImageSpread.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.ImageSpread.prototype.constructor = CINEMA_COMPONENTS.ImageSpread;

	/**
	 * Should be called every time the size of the component's container changes.
	 * Updates the sizing of the imageSpread container
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.updateSize = function() {
		//Call super
		CINEMA_COMPONENTS.Component.prototype.updateSize.call(this);

		if (this.hasFileDimensions) {
			var headerSize = this.header.node().getBoundingClientRect().height;
			this.imageContainer
				.style('top',headerSize+'px')
				.style('height',(this.parentRect.height-headerSize)+'px');
		}
	};

	/**
	 * Set the data to be shown to the data represented with the given array of indices
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.setSelection =function(indices) {
		this.selection = indices;
		this.selection.sort(this.getSortComparator());
		this.updatePageNav();
		this.populateResults();
	}

	/**
	 * Get a comparator function for sorting the selection
	 * according to selected sort dimension and the sortOrder checkbox
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.getSortComparator = function() {
		var self = this;
		var d = this.sortNode.value;
		if (this.sortOrderNode.checked)
			return function(a,b) {
				if (self.db.data[a][d] === undefined) {return 1;}
				if (self.db.data[b][d] === undefined) {return -1;}
				if (isNaN(self.db.data[a][d])) {return 1};
				if (isNaN(self.db.data[b][d])) {return -1};
				return self.db.data[b][d] - self.db.data[a][d];
			}
		else
			return function(a,b) {
				if (self.db.data[a][d] === undefined) {return -1;}
				if (self.db.data[b][d] === undefined) {return 1;}
				if (isNaN(self.db.data[a][d])) {return -1};
				if (isNaN(self.db.data[b][d])) {return 1};
				return self.db.data[a][d] - self.db.data[b][d];
			}
	}

	/**
	 * Fill the imageContainer with dataDisplays for the current page of results
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.populateResults = function() {
		var self = this;
		if (this.hasFileDimensions) {
			var pageSize = this.pageSizeNode.value;
			var pageData = this.selection.slice((this.currentPage-1)*pageSize,
											Math.min(this.currentPage*pageSize,this.selection.length));
			//Bind pageData and update dataDisplays
			var displays = this.imageContainer.selectAll('.dataDisplay')
				.data(pageData);
			displays.exit().remove(); //remove unused dataDisplays
			displays.enter() //add new dataDisplays
				.append('div').classed('dataDisplay',true)
			.merge(displays) //update
				//Set up mouse events
				.on('mouseenter',function(d) {
					self.dispatch.call('mouseover',self,d,d3.event);
				})
				.on('mouseleave',function(d) {
					self.dispatch.call('mouseover',self,null,d3.event);
				})
				//For each data display, create file displays for every file in it
				.each(function(d) {
					var files = self.dimensions.map(function(dimension) {
						return self.db.data[d][dimension];
					});
					//bind files data
					var fileDisplays = d3.select(this).selectAll('.fileDisplay')
						.data(files);
					fileDisplays.exit().remove();
					var ENTER = fileDisplays.enter().append('div')
						.classed('fileDisplay',true);
					ENTER.append('div').classed('display',true)
						.style('width',self.imageSizeNode.value+'px');
					ENTER.append('div').classed('displayLabel',true);
					var UPDATE = ENTER.merge(fileDisplays)
						//Create content of each file display
						.each(function(f,i) {
							d3.select(this).select('.display').html('');
							//Create an image in the display if the it is an image filetype
							if (isValidFiletype(getFileExtension(f)))
								d3.select(this).select('.display')
									.classed('image',true)
									.classed('text',false)
									.append('img')
										.attr('src',self.db.directory+'/'+f)
										.attr('width', '100%')
										.on('click',self.createModalImg);
							//Otherwise create an error message
							else
								d3.select(this).select('.display')
									.classed('text',true)
									.classed('image',false)
									.append('div')
										.attr('class','resultErrorText')
										.text('Cannot display file: ' + f);
							//Update label
							d3.select(this).select('.displayLabel')
								.text(self.dimensions[i]);
						});
				});
		}
	};

	/**
	 * An event handler for an image that will create a modal overlay
	 * of the image when clicked
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.createModalImg = function() {
		d3.select('body').append('div')
		.attr('class', 'modalBackground')
		.on('click', function() {
			//clicking the modal removes it
			d3.select(this).remove();
		})
		.append('img')
			.attr('class', 'modalImg')
			.attr('src',d3.select(this).attr('src'));
	}

	/**
	 * Calculate the number of pages needed to show all results and rebuild
	 * the page navigation widget.
	 */
	CINEMA_COMPONENTS.ImageSpread.prototype.updatePageNav = function() {
		var self = this;
		d3.select(this.container).select('.pageNavWrapper').remove(); //remove previous widget
		var pageSize = this.pageSizeNode.value;
		//If there are more results than can fit on one page, build a pageNav widget
		if (this.selection.length > pageSize) {
			//calculate number of pages needed
			var numPages = Math.ceil(this.selection.length/pageSize);
			//If the currently selected page is higher than the new number of pages, set to last page
			if (this.currentPage > numPages) {this.currentPage = numPages};
			//Add pageNav and buttons
			d3.select(this.container).append('div')
				.classed('pageNavWrapper',true)
			.append('ul')
				.classed('pageNav',true)
				.selectAll('li')
					//Get data for which buttons to build, then build
					.data(getPageButtons(numPages,this.currentPage))
					.enter().append('li')
						.classed('pageButton',true)
						.attr('mode', function(d) {
							return d.page == self.currentPage ? 'selected': 'default';
						})
						.text(function(d) {return d.text;})
						.on('click',function(d) {
							if (d3.select(this).attr('mode') != 'selected') {
								self.currentPage = d.page;
								if (d.do_rebuild) {
									self.updatePageNav();
									self.populateResults();
								}
								else {
									d3.select(self.container).select('.pageButton[mode="selected"]')
										.attr('mode','default');
									d3.select(this).attr('mode','selected');
									d3.select('.pageReadout').text(self.currentPage + " / " + numPages);
									self.populateResults();
								}
							}
						});
			//Add readout of currentPage/totalPages
			d3.select('.pageNavWrapper').append('div')
				.classed('pageReadout',true)
				.text(this.currentPage + " / " + numPages);
		} //end if (this.selection.length > pageSize)
		//Otherwise, don't build a widget and go to first (only) page
		else {
			this.currentPage = 1;
		}
	}

	/**
	 * Given the number of pages needed and the currently selected page, return
	 * a list of objects represented the pageNav buttons to show
	 * objects are formatted like so:
	 * {text: [button_text],
	 * page: [pageNumber to link to], 
	 * do_rebuild: [whether or not the pageNav widget should be rebuilt when this button is clicked]}
	**/
	function getPageButtons(numPages, current) {
		//If there are 7 or fewer pages, create a widget with a button for each page ([1|2|3|4|5|6|7])
		if (numPages <= 7) {
			var pageData = [];
			for (var i = 0; i < numPages; i++)
				pageData.push({text: i+1, page: i+1, do_rebuild: false});
			return pageData;
		}
		//Otherwise, create a widget with buttons for navigating relative to selected page ([|<|<<|10|20|30|>>|>|])
		else {
			//step size is one order of magnitude below the total number of pages
			var stepSize = Math.pow(10,Math.round(Math.log10(numPages)-1));
			var pageData = [];
			//Create buttons for selecting lower pages if current is not already one
			if (current != 1) {
				pageData.push({text: "|<", page: 1, do_rebuild: true});
				pageData.push({text: "<", page: current-1, do_rebuild: true});
				var prevStep = current-stepSize >= 1 ? current-stepSize : current-1;
				pageData.push({text: prevStep, page: prevStep, do_rebuild: true});
			}
			//Create button for currently selected page
			pageData.push({text: current, page: current, do_rebuild: false});
			//Create buttons for selecting higher pages if current is not already at the end
			if (current != numPages) {
				var nextStep = current+stepSize <= numPages ? current+stepSize : current+1;
				pageData.push({text: nextStep, page: nextStep, do_rebuild: true});
				pageData.push({text: ">", page: current+1, do_rebuild: true});
				pageData.push({text: ">|", page: numPages, do_rebuild: true});
			}
			return pageData;
		}
	}

	//Get if the given filetype is a valid image filetype
	function isValidFiletype(type) {
		if (!type)
			return false;
		var validFiletypes = ['JPG','JPEG','PNG','GIF'];
		type = type.trimLeft().trimRight();
		var index = validFiletypes.indexOf(type.toUpperCase()); 
	
		return (index >= 0);
	}
	
	//Get the extension/filetype of the given path
	function getFileExtension(path) {
		return path ? path.substr(path.lastIndexOf('.')+1).trimRight() : undefined;
	}

})();
