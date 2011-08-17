

/**
 * i2maps extensions for OpenLayers.
 */



OpenLayers.Geometry.Collection.prototype.getCoords = function() {
	var coords = [];
	for(var i=0; i<this.components.length; ++i) {
		var c = this.components[i].getCoords();
		var nc = c.length;
		for (var j=0; j<nc; j++) {
			coords.push(c.shift());
		}
	}
	return coords;
};

OpenLayers.Geometry.Collection.prototype.setCoords = function(coords) {
	for(var i=0; i<this.components.length; ++i) {
		this.components[i].setCoords(coords);
	}
	return coords;
};

OpenLayers.Geometry.LinearRing.prototype.getCoords = function() {
	var coords = [];
	for(var i=0; i<this.components.length; ++i) {
		var c = this.components[i].getCoords();
		var nc = c.length;
		for (var j=0; j<nc; j++) {
			coords.push(c.shift());
		}
	}
	return coords;
};

OpenLayers.Geometry.LinearRing.prototype.setCoords = function(coords) {
	for(var i=0; i<this.components.length; ++i) {
		this.components[i].setCoords(coords);
	}
	return coords;
};

OpenLayers.Geometry.Point.prototype.getCoords = function() {
	return [this.x, this.y];
};

OpenLayers.Geometry.Point.prototype.setCoords = function(coords) {
	if (coords.length < 2) {
		return;
	}
	this.x = coords.shift();
	this.y = coords.shift();
	this.clearBounds();
};






/**
 * Extensions for OpenLayers.Layer.Vector
 */

OpenLayers.Layer.Vector.prototype.drawFeatures = function(style) {
	for (var i=0; i < this.features.length; i++) {
		this.drawFeature(this.features[i], style);
	}
};



/**
 * Extension for GeoJSON format for reading STVectors instead of Vectors.
 */
/*OpenLayers.Format.GeoJSON.prototype.parseFeature = function(obj) {
	var feature, geometry, attributes, bbox;
	attributes = (obj.properties) ? obj.properties : {};
	bbox = (obj.geometry && obj.geometry.bbox) || obj.bbox;
	try {
		geometry = this.parseGeometry(obj.geometry);
	} catch(err) {
		// deal with bad geometries
		throw err;
	}
	feature = new OpenLayers.Feature.STVector(geometry, attributes);
	if(bbox) {
		feature.bounds = OpenLayers.Bounds.fromArray(bbox);
	}
	if(obj.id) {
		feature.fid = obj.id;
	}
	return feature;
};*/






/**
 * i2maps extensions for OpenLayers.Map
 */



/**
 * Shows a message for the map.
 * Parameters:
 * msg			Contains the message string
 * type			The type of message. Can be "info" for an information,
 *				"success" for a successful operation, "error" for a problem,
 *				and "progress" for an ongoing process. Default is "info".
 */
OpenLayers.Map.prototype.showMessage = function(msg, type) {
	
	$.showMessage(msg, type);
	return;
	
	if (type == undefined) {
		type = "info";
	}
	
	// Check if the messaging mechanism is activated.
	if (this.messageBoxActive == undefined) {
		this.messageBoxActive = true;	// True by default.
	}
	if (this.messageBoxActive == false) {
		return;
	}
	
	// Increase the counter of how many calls to the show message we had
	// already. Is used to show or hide the message box.
	if (this.messageCounter == undefined) {
		this.messageCounter = 1;
	} else {
		this.messageCounter += 1;
	}
	
	// Check if there is a message div in the DOM tree or not. If not, we are
	// going to create it.
	if (this.messageDiv == undefined || this.messageDiv == null) {
		this.createMessageDiv();
	}
	
	// Create and insert the message div content.
	var html = '';
	if (type == 'progress') {
		html += '<img src="../media/images/busy_icon.gif" style="vertical-align: middle;" />&nbsp;&nbsp;&nbsp;';
	}
	this.messageDiv.set('html', '<p>' + html + msg + '</p>');
	
	// Place the message in the middle of the window.
	this.centerMessage();
	
	/*var fx = new Fx.Tween(this.messageDiv, {duration: 1000});
	var fx_bg = new Fx.Tween(this.messageDivBackground, {duration: 1000});
	fx.start('opacity', '0', '1');
	fx_bg.start('opacity', '0', '0.5');*/
	this.messageDiv.setStyle('opacity', '1');
	this.messageDivBackground.setStyle('opacity', '0.5');
};



OpenLayers.Map.prototype.hideMessage = function() {
	$.hideMessage();
	return;
	if (this.messageCounter == 0) {
		return;
	}
	
	this.messageCounter -= 1;
	
	if (this.messageCounter > 0) {
		// We still need to show our busy message, another process is going on.
		return;
	}
	
	// Hide the message
	/*var fx = new Fx.Tween(this.messageDiv, {duration: 1000});
	var fx_bg = new Fx.Tween(this.messageDivBackground, {duration: 1000});
	fx.start('opacity', '1', '0');
	fx_bg.start('opacity', '0.5', '0');*/
	if (this.messageDiv != undefined && this.messageDiv != null) {
		this.messageDiv.setStyle('opacity', '1');
	}
	if (this.messageDivBackground != undefined && this.messageDivBackground != null) {
		this.messageDivBackground.setStyle('opacity', '0.5');
	}
}



OpenLayers.Map.prototype.createMessageDiv = function() {
	this.messageDivBackground =  new Element('div', {
		'id': this.id + '_message_bg_div',
		'styles': {
			'position': 'absolute',
			'top': '0px',
			'left': '0px',
			'width': '100%',
			'height': '100%',
			'background-color': '#666',
			'opacity': '0',
			'display': 'block',
			'z-index': '999'
		}
	});
	this.messageDivBackground.inject(this.div);
	
	this.messageDiv = new Element('div', {
		'id': this.id + '_message_div',
		'styles': {
			'position': 'absolute',
			'top': '50px',
			'left': '50px',
			'width': '400px',
			'height': '100px',
			'background-color': '#fff',
			'z-index': '1500',
			'text-align': 'center',
			'display': 'table-cell', 
			'vertical-align': 'middle',
			'font-size': '24px',
			'margin': '10px',
			'opacity': '0'
		}
	});
	this.messageDiv.inject(this.div);
};



OpenLayers.Map.prototype.centerMessage = function() {
	var left = (this.getSize().w - this.messageDiv.getSize().x) / 2;
	if (left < 0) {
		left = 0;
	}
	var top = (this.getSize().h - this.messageDiv.getSize().y - 150) / 2;
	if (top < 0) {
		top = 0;
	}
	this.messageDiv.style.left = left + 'px';
	this.messageDiv.style.top = top + 'px';
}


/**
 * OpenLayers.Time utilities
 */



/**
 * Namespace: Time
 */
OpenLayers.Time = {};


/**
 * Function: dateTimeStringToNumber
 * Converts a date/time string into a sortable number.
 */
OpenLayers.Time.dateTimeStringToNumber = function(dateTimeString) {
	var dts = dateTimeString.toString().replace(/[^0-9\.]/g, '');
	return parseFloat(dts);
};






/**
 * @requires OpenLayers/Layer/Vector.js
 */

/**
 * Class: OpenLayers.Layer.ComplexVector
 * Implementation of the Complex Vector Web Service protocol.
 * It uses extensive AJAX requests for handling complex, multi-scale,
 * spatio-temporal layers, optionally with cartogram support.
 * 
 * Inherits from:
 *	- <OpenLayers.Layer.Vector>
 */
OpenLayers.Layer.ComplexVector = OpenLayers.Class(OpenLayers.Layer.Vector, {

	/**
	 * APIProperty: isBaseLayer
	 * {Boolean} ComplexVector layer is not a base layer by default. 
	 */
	isBaseLayer: false,
	
	/**
	 * APIProperty: ratio
	 * {Float} The ratio property determines the size of the serverside query
	 *	  relative to the map viewport size. By default, we load an area twice
	 *	  as big as the map, to allow for panning without immediately reload.
	 *	  Setting this to 1 will cause the area of the ComplexVector request 
	 *	  to match the map area exactly. It is recommended to set this to
	 *	  some number at least slightly larger than 1, otherwise accidental 
	 *    clicks can cause a data reload, by moving the map only 1 pixel.
	 */
	ratio: 1.2,
	
	
	
	maxNumberOfGeometryPerRequest: 50,


	/**
	 * Constructor: OpenLayers.Layer.ComplexVector
	 *
	 * Parameters:
	 * name - {String} Name of the Layer
	 * url - {String} Base URL of the Complex Vector Web Service
	 * options - {Object} Hashtable of extra options to tag onto the layer
	 */
	initialize: function(name, url, dataset, options) {
		if (options == undefined) { options = {}; }  
		
		// Turn off error reporting, browsers like Safari may work
		// depending on the setup, and we don't want an unneccesary alert.
		OpenLayers.Util.extend(options, {'reportError': false});
		
		// Initialize the superclass
		var newArguments = [];
		newArguments.push(name, options);
		OpenLayers.Layer.Vector.prototype.initialize.apply(
			this, newArguments
		);
		
		// Store the arguments in our class.
		this.url = url;
		this.datasetId = dataset;
		
		// Create a JSON decoder.
		this.jsonParser = new OpenLayers.Format.JSON();
		
		// Setup the data structure for managing the complex vector protocol.
		// The geometries and attributes are stored separately from the 
		// features as there might be values for different time steps.
		this.featureList = [];
		this.geometries = new TAFFY([]);
		this.attributes = new TAFFY([]);
		this.attributeNames = [];
		
		this.spaces = [];
		this.timeSpan = null;
		
		// An array for keeping track of which geometry lists we have already
		// requested. Don't request the same list twice.
		this.geometryLists = [];
		
		// The pattern of the date/time string to be used. If NULL, the 
		// conversion is done using the str() JavaScript function. Otherwise,
		// the conversion is done according to the pattern.
		// See http://blog.stevenlevithan.com/archives/date-time-format for
		// the available options.
		this.dateTimePattern = "yyyy-mm-dd";
		
		// Create a theme for the new dataset.
		if (options.theme != undefined && options.theme.type != 'attribute') {
			this.initTheme(options.theme);
		}
		
		// Get the dataset information through the GetInfo operation.
		var getInfoUrl = this.url.replace('${operation}', 'GetInfo');
		OpenLayers.Request.GET({
			url: getInfoUrl,
			params: {
				dataset: this.datasetId
			},
			success: this.getInfoSuccess,
			failure: this.getInfoFailure,
			scope: this
		});
	},	  
	

	/**
	 * APIMethod: destroy
	 */
	destroy: function() {
		this.ratio = null;
		this.url = null;
		this.datasetId = null;
		this.geometries = null;
		this.attributes = null;
		 OpenLayers.Layer.Vector.prototype.destroy.apply(this, arguments); 
	},
	
	
	
	moveTo: function(bounds, zoomChanged, dragging) {
		OpenLayers.Layer.Vector.prototype.moveTo.apply(this, arguments);
		if (!dragging) {
			this.getGeometries();
		}
	},
	
	
	
	setMap: function(map) {
		OpenLayers.Layer.Vector.prototype.setMap.apply(this, arguments);
		map.events.register('zoomend', this, this.onZoom);
		if (this.map != undefined && this.map != null && this.map.hideMessage != undefined) {
			this.map.showMessage('Loading...', 'Progress');
		}
	},
	
	
	// Changes the time of the map.
	setTime: function(time) {
		
		this.map.showMessage('Loading...', 'Progress');
		
		this.currentTime = this.dateTimeToString(time);
		
		if (this.theme == undefined) {
			return;
		}
		
		// Check if we have the attributes we need already in our database.
		// If not, we have to request them from the server.
		var attrsIdx = this.attributes.find({time: this.currentTime});
		if (attrsIdx.length == 0) {
			var getUrl = this.url.replace('${operation}', 'GetAttributes');
			var attrs = this.theme.attributes().join(',');
			OpenLayers.Request.GET({
				url: getUrl,
				params: {
					dataset: this.datasetId,
					attributes: attrs,
					time: this.currentTime
				},
				success: this.getAttributesSuccess,
				failure: this.getAttributesFailure,
				scope: this
			});
		} else {
			this.reloadFeatures();
			this.map.hideMessage();
		}
		
	},
	
	setSpace: function(space) {
		this.map.showMessage('Loading...', 'Progress');
		// If the space is not 'orig', check if we have the geometries we 
		// need in our database.
		this.currentSpace = space;
		this.getGeometryList();
		this.map.hideMessage();
	},
	
	onZoom: function() {
		if (this.map == undefined || this.currentTime == undefined ||
			this.currentSpace == undefined || this.currentGeneralization == undefined)
		{
			return;
		}
		
		var old_genlevel = this.getBestGenerlizationLevel({
			generalization: this.currentGeneralization
		});
		this.currentGeneralization = this.map.getZoom();
		var genlevel = this.getBestGenerlizationLevel();
		if (old_genlevel != genlevel) {
			this.getGeometryList();
		}
	},
	
	/**
	 * Method: reloadFeatures
	 * Reloads all the features from the geometries database.
	 */
	reloadFeatures: function () {
		
		var mapExtent = this.getWideExtent();
		var nearestTimeStep = this.getNearestTimeStepForGeometries();
		var genlevel = this.getBestGenerlizationLevel({
			time: nearestTimeStep, space: this.currentSpace
		});
		
		// Get the list of features that we should display.
		var geoms = this.geometries.get({
			time: nearestTimeStep,
			space: this.currentSpace,
			generalization: genlevel,
			xmin: {lt: mapExtent.right},
			xmax: {gt: mapExtent.left},
			ymin: {lt: mapExtent.top},
			ymax: {gt: mapExtent.bottom},
			geom: {"!is": null}
		});
		
		// Dress a list of the features that we are currently displaying,
		// along with the selected features.
		var features_displayed = [];
		for (var fidx in this.features) {
			features_displayed.push(this.features[fidx]);
		}
		
		// Make a list of the selected features.
		var features_selected = [];
		for (var fids in this.selectedFeatures) {
			features_selected.push(this.selectedFeatures[fids].attributes.fid);
		}
		
		// Insert the features that are currently not displayed but should be.
		var features = {};
		var features_to_insert = [];
		var current_features = {};
		for (var fidx in this.features) {
			current_features[this.features[fidx].id] = this.features[fidx];
		}
		for (var i=0; i < geoms.length; i++) {
			var f = geoms[i].geom;
			features[f.id] = f;
			if (f.id in current_features == false) {
				features_to_insert.push(f);
			}
		}
		this.addFeatures(features_to_insert);
			
		// Remove the features that should not be displayed but are currently.
		var features_to_remove = [];
		for (var fidx in features_displayed) {
			if (features_displayed[fidx].id in features == false) {
				features_to_remove.push(features_displayed[fidx]);
			}
		}
		this.removeFeatures(features_to_remove);
		
		// Give the features to be displayed the opportunity to update 
		// their theme.
		this.updateTheme();
		
		// Redraw the features.
		this.renderer.clear();
		this.drawFeatures();
	},
	
	
	
	/**
	 * Method: initTheme
	 * Builds a theme based on the provided options.
	 */
	initTheme: function(options) {
		if (options == undefined) {
			return;
		}
		if (options.source == undefined) {
			options.source = "theme";
		}
		if (options.type == undefined) {
			options.type = 'standard';
		}
		if (options.source == 'theme') {
			if (options.type == 'choropleth') {
				this.theme = new OpenLayers.Theme.ChoroplethTheme(options);
			} else {
				this.theme = new OpenLayers.Theme.StandardTheme(options);
			}
		}
	},
	
	
	/**
	 * APIMethod: updateTheme
	 * Updates the theme of the layer.
	 */
	updateTheme: function(options) {
		if (this.theme == undefined || this.theme == null) {
			return;
		}
		for (var fidx in this.features) {
			var f = this.features[fidx];
			if ((f.attributes.t != this.currentTime || f.attributes.needsUpdate == true) &&
				(this.theme != undefined && this.theme != null))
			{
				var attrs = this.attributes.get({
					fid: f.attributes.fid, time: this.currentTime
				});
				if (attrs.length > 0) {
					this.theme.updateFeature(f, attrs[0]);
				}
				f.attributes.t = this.currentTime;
				f.attributes.needsUpdate = false;
			}
		}
	},
	
	
	/**
	 * Method: getInfoSuccess
	 * Called when the Ajax request for the GetInfo operation returns a
	 * success response.
	 * 
	 * Parameters:
	 * response - {JSON object} from server
	 */
	getInfoSuccess: function(request) {
	
		// Load the information from the response into our class.
		var info = this.jsonParser.read(request.responseText);
		this.featureList = info.features;
		this.attributeNames = info.attributes;
		this.timeSpan = info.timeSpan;
		this.spaces = {};
		for (var i=0; i < info.spaces.length; i++) {
			this.spaces[info.spaces[i].id] = info.spaces[i];	
		}
		
		// Set the current space and time parameters.
		if (this.currentTime == undefined) {
			this.currentTime = this.timeSpan.max;
		}
		if (this.currentSpace == undefined) {
			this.currentSpace = 'orig';
		}
		
		// Estimate the generalization level based on the zoom level
		// if there is one.
		this.currentGeneralization = 0;
		if (this.map != undefined) {
			this.currentGeneralization = this.map.getZoom();
		}
		
		// Request the list of geometries using the GetGeometryList operation.
		this.getGeometryList();
		
		// Request the attributes that we need using the GetAttributes
		// operation.
		if (this.theme != undefined) {
			getUrl = this.url.replace('${operation}', 'GetAttributes');
			var attrs = this.theme.attributes().join(',');
			getUrl = this.url.replace('${operation}', 'GetAttributes');
			OpenLayers.Request.GET({
				url: getUrl,
				params: {
					dataset: this.datasetId,
					attributes: attrs,
					time: this.currentTime
				},
				success: this.getAttributesSuccess,
				failure: this.getAttributesFailure,
				scope: this
			});
		}
		
	},
	
	
	/**
	 * Method: getInfoFailure
	 * Called when the Ajax request for the GetInfo operation fails.
	 */
	getInfoFailure: function(request) {
	},
	
	
	/**
	 * Method: getNearestTimeStepForGeometries
	 * Returns the nearest valid time step for the geometries.
	 * It is possible to specify inside the options dictionary a 'time' and/or
	 * 'space'. If not specified, the current values are taken as default.
	 */
	getNearestTimeStepForGeometries: function(options) {
		if (options == undefined) {
			options = {};
		}
		if (options.time == undefined) {
			options.time = this.currentTime;
		}
		var tcomp = OpenLayers.Time.dateTimeStringToNumber(options.time);
		if (options.space == undefined) {
			options.space = this.currentSpace;
		}
		var available_geoms = this.spaces[options.space].availableGeometries;
		var tsteps = {};
		for (var i=0; i < available_geoms.length; i++) {
			t = OpenLayers.Time.dateTimeStringToNumber(available_geoms[i].timeStep);
			tsteps[available_geoms[i].timeStep] = t;
		}
		
		diff = null;
		diffKey = null;
		for (var k in tsteps) {
			if (diff == null || Math.abs(tsteps[k] - tcomp) < diff) {
				diff = Math.abs(tsteps[k] - tcomp);
				diffKey = k;
			}
		}
		
		return k;
	},
	
	
	
	getBestGenerlizationLevel: function(options) {
		if (options == undefined) {
			options = {};
		}
		if (options.time == undefined) {
			options.time = this.getNearestTimeStepForGeometries();
		}
		if (options.space == undefined) {
			options.space = this.currentSpace;
		}
		if (options.generalization == undefined) {
			options.generalization = this.currentGeneralization;
		}
		
		// Get all the available generalization levels.
		var geoms = this.spaces[options.space].availableGeometries;
		var levels = [];
		for (var i=0; i < geoms.length; i++) {
			if (geoms[i].timeStep == options.time) {
				levels = geoms[i].generalizations.split(',');
				i = geoms.length;
			}
		}
		if (levels.length == 0) {
			return null;
		}
		
		/*var diff = null;
		var currentLevel = null;
		levels.sort()
		for (var i=0; i < levels.length; i++) {	
			if (diff == null || Math.abs(levels[i] - this.currentGeneralization) < diff) {
				diff = Math.abs(levels[i] - this.currentGeneralization);
				currentLevel = levels[i];
			}
		}
		return currentLevel;*/
		
		levels.sort();
		for (var i=(levels.length-1); i >= 0; i--) {
			if (levels[i] <= options.generalization) {
				return levels[i];
			}
		}
		return null;
	},
	
	
	getGeometryList: function(request) {
		
		var getUrl = this.url.replace('${operation}', 'GetGeometryList');
		var nearestTimeStep = this.getNearestTimeStepForGeometries();
		var genlevel = this.getBestGenerlizationLevel({
			time: nearestTimeStep, 
			space: this.currentSpace
		});
		
		var glopts = {
			time: nearestTimeStep,
			space: this.currentSpace,
			generalization: genlevel
		};
		for (var glidx in this.geometryLists) {
			var gl = this.geometryLists[glidx];
			if (glopts.time == gl.time && 
				glopts.space == gl.space && 
				glopts.generalization == gl.generalization)
			{
				// The geometry list has already been requested.
				// We can simply return here.
				this.reloadFeatures();
				return;
			}
		}
		this.geometryLists.push(glopts);
		OpenLayers.Request.GET({
			url: getUrl,
			params: {
				dataset: this.datasetId,
				time: nearestTimeStep,
				space: this.currentSpace,
				generalization: genlevel
			},
			success: this.getGeometryListSuccess,
			failure: this.getGeometryListFailure,
			scope: this
		});
	},
	
	
	getGeometryListSuccess: function(request) {
		
		var geoms = this.jsonParser.read(request.responseText);
		
		// Insert all geometries into our database.
		for (var i=0; i < geoms.geometries.length; i++) {
			var g = geoms.geometries[i];
			if (this.geometries.find({geomid: g.id}).length > 0) {
				// Just update.
				this.geometries.update({
					time: geoms.time,
					space: geoms.space,
					generalization: geoms.generalization,
					feature: g.feature,
					xmin: g.envelope.xmin,
					xmax: g.envelope.xmax,
					ymin: g.envelope.ymin,
					ymax: g.envelope.ymax
				}, {geomid: g.id});
			} else {
				// Insert
				this.geometries.insert({
					geomid: g.id,
					time: geoms.time,
					space: geoms.space,
					generalization: geoms.generalization,
					feature: g.feature,
					geom: null,
					xmin: g.envelope.xmin,
					xmax: g.envelope.xmax,
					ymin: g.envelope.ymin,
					ymax: g.envelope.ymax
				});
			}
		}
		
		// We can now load the geomtries if we need to do so.
		this.getGeometries();
		
	},
	
	getGeometryListFailure: function(request) {
		// Hide a message if there is one.
		if (this.map != undefined && this.map != null && this.map.hideMessage != undefined) {
			this.map.hideMessage();
		}
	},
	
	
	/**
	 * Method: getGeometries
	 * Loads the needed geometries into our database and updates the 
	 * features to display.
	 */
	getGeometries: function() {
		
		if (this.map == undefined ||
			this.currentTime == undefined ||
			this.currentSpace == undefined ||
			this.currentGeneralization == undefined)
		{
			return;
		}
		
		// Get the current map extent, and adjust according to the defined 
		// ratio.
		var mapExtent = this.getWideExtent();
		
		var nearestTimeStep = this.getNearestTimeStepForGeometries();
		var genlevel = this.getBestGenerlizationLevel({
			time: nearestTimeStep, 
			space: this.currentSpace
		});
		
		var geoms = this.geometries.get({
			time: nearestTimeStep,
			space: this.currentSpace,
			generalization: genlevel,
			xmin: {lt: mapExtent.right},
			xmax: {gt: mapExtent.left},
			ymin: {lt: mapExtent.top},
			ymax: {gt: mapExtent.bottom},
			geom: null
		});
		
		var fids = [];
		//var maxGeneralization = -1;
		for (var i=0; i < geoms.length; i++) {
			fids.push(geoms[i].feature);
			//if (geoms[i].generalization > maxGeneralization) {
			//	maxGeneralization = geoms[i].generalization;
			//}
		}
		
		// Check if there are geometries to be loaded. If not, we just
		// reload the features.
		if (fids.length == 0) {
			this.reloadFeatures();
			return;
		}
		
		//var maxreq = this.maxNumberOfGeometryPerRequest;
		//var nrequests = Math.ceil(fids.length / maxreq);
		getUrl = this.url.replace('${operation}', 'GetGeometries');
		//for (var n=0; n < nrequests; n++) {
		//	var fids_subset = fids.slice(n*maxreq, (n+1)*maxreq);
			OpenLayers.Request.GET({
				url: getUrl,
				params: {
					dataset: this.datasetId,
					time: nearestTimeStep,
					space: this.currentSpace,
					generalization: genlevel,
					features: fids.join(',')
				},
				success: this.getGeometriesSuccess,
				failure: this.getGeometriesFailure,
				scope: this
			});
		//}
	},
	
	
	getGeometriesSuccess: function(request) {
		
		var geoms = this.jsonParser.read(request.responseText);
		var geoJsonParser = new OpenLayers.Format.GeoJSON();
		
		for (var fid in geoms.geometries) {
			var gobj = geoJsonParser.read(geoms.geometries[fid], "Geometry");
			var feat = new OpenLayers.Feature.Vector(gobj, {
				fid: fid,
				fillColor: '#aaa',
				t: null,
				needsUpdate: true
			});
			this.geometries.update({geom: feat}, {
				time: geoms.time,
				space: geoms.space,
				generalization: geoms.generalization,
				feature: fid
			});
		}
		
		this.reloadFeatures();
		
		if (this.map != undefined && this.map != null && this.map.hideMessage != undefined) {
			this.map.hideMessage();
		}
	},
	
	getGeometriesFailure: function(request) {
		// Hide a message if there is one.
		if (this.map != undefined && this.map != null && this.map.hideMessage != undefined) {
			this.map.hideMessage();
		}
	},
	
	getAttributesSuccess: function(request) {
		
		var attrs = this.jsonParser.read(request.responseText);
		
		for (var fid in attrs.attributes) {
			if (this.attributes.find({fid: fid, time: attrs.time}).length == 0) {
				this.attributes.insert({
					fid: fid, time: attrs.time
				});
			}
			
			this.attributes.update(attrs.attributes[fid], {
				fid: fid, time: attrs.time
			});
		}
		
		this.reloadFeatures();
		this.map.hideMessage();
	},
	
	getAttributesFailure: function(request) {
	},
	
	
	getWideExtent: function() {
		var mapExtent = this.map.getExtent();
		var w = mapExtent.getWidth();
		var h = mapExtent.getHeight();
		var w_extend = (w * (this.ratio-1.0)) / 2.0;
		var h_extend = (h * (this.ratio-1.0)) / 2.0;
		mapExtent.left -= w_extend;
		mapExtent.right += w_extend;
		mapExtent.top += h_extend;
		mapExtent.bottom -= h_extend;
		return mapExtent;
	},
	
	
	/**
	 * APIMethod: dateTimeToString
	 * Converts a JavaScript DateTime object to a string for interoperation
	 * with the database. If a specific date/time is used, this method might
	 * be overridden. However, it should work fine in most cases as it relies
	 * on the date/time pattern specified in this.dateTimePattern.
	 */
	dateTimeToString: function(dt) {
		if (this.dateTimePattern == undefined || 
			this.dateTimePattern == null ||
			this.dateTimePattern == "")
		{
			return dt.toString();
		}
		
		return dt.format(this.dateTimePattern);
	},
	

	CLASS_NAME: "OpenLayers.Layer.ComplexVector"
});


/**
 * @requires OpenLayers/Layer/Vector.js
 */

// OpenLayers Theme namespace.
OpenLayers.Theme = {};

/**
 * Class: OpenLayers.Layer.ComplexVector
 * Implementation of the Complex Vector Web Service protocol.
 * It uses extensive AJAX requests for handling complex, multi-scale,
 * spatio-temporal layers, optionally with cartogram support.
 * 
 * Inherits from:
 *	- <OpenLayers.Class>
 */
OpenLayers.Theme.StandardTheme = OpenLayers.Class({


	/**
	 * APIMethod: initialize
	 */
	initialize: function(options) {
	},
	
	
	updateFeature: function(feature, attributes) {
	},
	
	
	/**
	 * attributes
	 * Returns a list of the attributes needed for complying to this theme.
	 */
	attributes: function() {
		return [];
	},

	CLASS_NAME: "OpenLayers.Theme.StandardTheme"
});


/**
 * @requires OpenLayers/Layer/Vector.js
 */


/**
 * Class: OpenLayers.Layer.ComplexVector
 * Implementation of the Complex Vector Web Service protocol.
 * It uses extensive AJAX requests for handling complex, multi-scale,
 * spatio-temporal layers, optionally with cartogram support.
 * 
 * Inherits from:
 *	- <OpenLayers.Class>
 */
OpenLayers.Theme.ChoroplethTheme = OpenLayers.Class(OpenLayers.Theme.StandardTheme, {


	/**
	 * APIMethod: initialize
	 * Initializes a new ChoroplethTheme. Options can be the following:
	 * attribute 			for choropleth type: the theme attribute
	 * other_attributes		array of other attributes to load
	 * name					the name of the theme
	 * colors				for choropleth type: array of colors
	 * limits				for choropleth type: array of class limits
	 */
	initialize: function(options) {
		if (options == undefined || options.attribute == undefined) {
			return null;
		}
		this.attribute = options.attribute;
		
		if (options.other_attributes != undefined) {
			this.other_attributes = options.other_attributes;		
		} else {
			this.other_attributes = [];
		}
		
		if (options.name != undefined) {
			this.name = options.name;
		} else {
			this.name = this.attribute;
		}
		
		if (options.colors != undefined) {
			this.colors = options.colors;
		} else {
			this.colors = ["#aaa"];
		}
		
		if (options.limits != undefined) {
			this.limits = options.limits;
		} else {
			this.limits = [];
		}
	},
	
	
	/**
	 * APIMethod: updateFeature
	 */
	updateFeature: function(feature, attributes) {
		
		// If one of the needed parameters (colors, limits, attribute) is not
		// set, return without updating the feature. Return false.
		if (this.attribute == null || this.colors == null || 
			this.limits == null || feature == undefined || 
			attributes == undefined)
		{
			return false;
		}
		
		var attrVal = attributes[this.attribute];
		if (attrVal == undefined) {
			return false;
		}
		
		// Get the fill color according to the feature value.
		var fillColor = this.fillColor(attrVal);
		feature.attributes.fillColor = fillColor;
		return true;
	},
	
	
	/**
	 * Returns the fill color for the provided value.
	 */
	fillColor: function(value) {
		
		if (this.colors == null || this.limits == null) {
			return '#aaa';
		}
		
		// Order the limits.
		this.limits.sort(function(a,b){return a-b;});
		
		// Go through the colors and the limits to find the appropriate color.
		var colorIndex = 0;
		for (var i = 0; i < this.limits.length; i++) {
			if (parseFloat(this.limits[i]) >= parseFloat(value)) {
				return this.colors[colorIndex];
			}
			colorIndex += 1;
		}
		return this.colors[colorIndex];
		
	},
	
	
	/**
	 * attributes
	 * Returns a list of the attributes needed for complying to this theme.
	 */
	attributes: function() {
		return this.other_attributes.concat([this.attribute]);
	},

	CLASS_NAME: "OpenLayers.Theme.ChoroplethTheme"
});
/*

Software License Agreement (BSD License)
http://taffydb.com
Copyright (c) 2008
All rights reserved.
Version 1.6.1


Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following condition is met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

SUMMARY:
TAFFY takes a JavaScript object and returns a set of methods
to search, modify, and manipulate that object.

*/


// Setup TAFFY Function (nameSpace) to return an object with methods. 

if (typeof TAFFY=="undefined"||!TAFFY) {

var TAFFY = function (obj) {
	var conf = {
		template:null
	}, T = TAFFY, raw = (T.isString(obj)) ? T.JSON.parse(obj) : obj, TOb = raw, TIA = [], t = true, f=false;
	
	
	// ****************************************
    // *
    // * Create prvate mergeTemp function
    // * Loop over set of indexes and apply a template to the record
    // *
    // ****************************************
	var mergeTemp = function (rows,tmpl) {
		var tmpl = (TAFFY.isUndefined(tmpl)) ? conf.template : tmpl;
		if (!TAFFY.isNull(tmpl))
		{
			for(var x = 0; x < rows.length; x++) {
           		TOb[rows[x]] = TAFFY.mergeObj(TOb[rows[x]],tmpl);
        	}
		}
	}

	// ****************************************
    // *
    // * Create prvate bTIA function
    // * Loop over every index within the Taffy Object TOb
	// * and populate the Taffy Index Array TIA with the indexes
    // *
    // ****************************************
	var bTIA = function () {
		TIA = [];
		for(var x = 0; x < TOb.length; x++) {
           TIA[TIA.length] = x;
        }
	}
	bTIA();
	
	
	// ****************************************
    // *
    // * Create prvate findTests Object
    // * Collect all possible true/false expression used when
	// * doing lookups via the public find method.
    // * Purpose: Used to house and document all of the
	// * possible ways to match a value to a field with the
	// * TAFFY Object. Each of the contained functions does an
	// * evaluation against a value from the TAFFY Obj and a test
	// * provided by the caller of the find method. If this
	// * evaluation is true then the find method will add
	// * the TAFFY Object record to the results set.
    // *
    // ****************************************
	
							var findTests = {
								
								pickTest:function(Tt)
								{
								var m = (Tt.indexOf("!") === 0) ? f : t;
								if (!m)
								{
									Tt = Tt.substring(1,Tt.length);
								}
								return {test:(Tt == 'equal') ? 'is' : 
									   (Tt == 'notequal') ? 'not' : 
									   (Tt == 'startswith') ? 'starts' : 
									   (Tt == 'endswith') ? 'ends' : 
									   (Tt == 'greaterthan') ? 'gt' : 
									   (Tt == 'lessthan') ? 'lt' : 
									   (Tt == 'regexppass') ? 'regex' :	Tt,mode:(m) ? {s:t,f:f} : {s:f,f:t}};
								},
								run:function(s,mvalue,mtest,b) {
									return ((s=="regex") ? (mtest.test(mvalue)) :
									(s=="lt") ? (mvalue < mtest) :
									(s=="gt") ? (mvalue > mtest) :
									(s=="starts") ? (mvalue.indexOf(mtest) === 0) :
									(s=="ends") ? (mvalue.substring((mvalue.length - mtest.length)) == mtest) :
									(s=="like") ? (mvalue.indexOf(mtest) >= 0) :
									(s=="is") ? (mvalue == mtest) :
									(s=="has") ? (T.has(mvalue,mtest)) :
									(s=="hasAll") ? (T.hasAll(mvalue,mtest)) :
									(s=="length") ? (findTests.length(mvalue,mtest,b)) :
									findTests[s](mvalue,mtest)) ? b.s : b.f;
								},
								length:function (mvalue,mtest,b)
								{
									// If a value length exits and meets filter criteria
									var rlen = (!T.isUndefined(mvalue.length)) ? mvalue.length : (!T.isUndefined(mvalue.getLength)) ? mvalue.getLength() : 0;
									if (T.isObject(mtest)) {
										for(var kt in mtest)
										{
											if (mtest.hasOwnProperty(kt))
											{
												var pt = findTests.pickTest(kt);
												return findTests.run(pt.test,rlen,mtest[kt],pt.mode) ? t : f;
											}
										}
									}
									// default return
									return rlen == mtest ? b.s : b.f;
								}								
								};
	
	// Add in isObjectType checks
	(function () {
		for(var z in TAFFY)
		{
			if (TAFFY.hasOwnProperty(z) && z.indexOf("is") === 0)
			{
			(function (y) {
				findTests["is" + y] = function (mvalue,mtest,b) {
					return (TAFFY["is" + y](mvalue) == mtest) ? t : f;
				}
			}(z.substring(2,z.length)))
			}
		}
	} ()); 
	
	// ****************************************
    // *
    // * Create prvate bDexArray method
    // * Return an array of indexes
    // * Purpose: Used to create a variable that is an
	// * array that contains the indexes of the records
	// * that an action should be taken on. If a single
	// * number is passed then an array is created with that
	// * number being in postion 0. If an array is passed
	// * in then that array is returned. If no value is
	// * passed in then an array containing every index
	// * in the TAFFY Obj is returned. If an object is passed
	// * then a call to the find function is made and the
	// * resulting array of indexes returned.
    // *
    // ****************************************
    
    var bDexArray = function (iA,f) {
		var rA = [];
        if (!T.isArray(iA) && TAFFY.isNumber(iA)) 
			{
                rA[rA.length] = iA;
            } 
		else if (T.isArray(iA))
           {
               rA = iA;
                    
           }
		else if (T.isObject(iA))
		   {
				rA = f(iA);			
		   }
		else if (!T.isArray(iA) && !T.isNumber(iA))
           {
                rA = TIA;
        	}
		 return rA;
    };
    
	// ****************************************
    // *
    // * Create private toLogicalArray method
    // * return custom array for use in array.sort based on sort obj
    // * argument
    // * Purpose: This is used by the buildSortFunction function in the case
	// * of logical and logicaldesc sort types. This function splits a complex
	// * value into an array so that each array item can be compared against
	// * the item at the index in each value.
	// *
    // ****************************************
	var toLogicalArray = function (value) {
		var rArray = [0],type = "none";
		if (!T.isNull(value) && !T.isUndefined(value)) {
		for(var n = 0;n<value.length;n++)
		{
			var c = value.slice(n,(n+1));
			if (T.isNumeric(c)) {
				if (type != 'number') {
					rArray[rArray.length] = c;
					type = 'number';
				} else {
					rArray[(rArray.length-1)] = rArray[(rArray.length-1)] + "" + c;
				}
			} else {
				if (type != 'string') {
					rArray[rArray.length] = c;
					type = 'string';
				} else {
					rArray[(rArray.length-1)] = rArray[(rArray.length-1)] + c;
				}
			}
			
		}
		for(var n = 0;n<rArray.length;n++)
		{
			if (T.isNumeric(rArray[n])) {
				rArray[n] = parseFloat(rArray[n]);
			}
		}
		} else {
			rArray[rArray.length] = null;
		}
		return rArray;
	};
	
    // ****************************************
    // *
    // * Create private buildSortFunction method
    // * return custom sort function for use in array.sort based on sort obj
    // * argument
    // * Purpose: This is used by the orderBy method to create a custom sort
    // * function for use with array.sort(). This sort function will be unique
    // * based on the field list supplied in the sortobj argument.
    // *
    // ****************************************
    var buildSortFunction = function (sortobj) {
        var custO = [],localO = [];
        
        if (T.isString(sortobj))
        {
		    localO[0] = sortobj;
        } else if (T.isObject(sortobj)) {
			localO = [sortobj];
		} else {
            localO = sortobj;
        }
        
        // create the custO which contains instructions
        // for the returned sort function
        if (T.isArray(localO)) {
            for(var sa = 0; sa < localO.length; sa++) {
                if (T.isString(localO[sa]))
                    {
                    if (T.isString(TOb[0][localO[sa]]))
                        {
                            custO[custO.length] = {sortCol : localO[sa], sortDir : "asc", type : "string"};
                        } else {
                            custO[custO.length] = {sortCol : localO[sa], sortDir : "asc", type : "number"};
                        }
                    } else if (T.isObject(localO[sa])) {
						for(var sc in localO[sa])
						{
							if (localO[sa].hasOwnProperty(sc))
								{
                        	if (T.isString(TOb[0][localO[sa].sortCol]))
                        	{
                            	custO[custO.length] = {sortCol : sc, sortDir : localO[sa][sc], type : "string"};
                        	} else {
                            	custO[custO.length] = {sortCol : sc, sortDir : localO[sa][sc], type : "number"};
                        	}
								}
                        	
						}
                    }
            }
        };
        
        // Return the sort function to the calling object.
        return function (a,b) {
            var returnvar = 0,r1=a,r2=b,x,y;
            
            // loop over the custO and test each sort
            // instruction set against records x and y to see which
            // should appear first in the final array sort
            for(var sa = 0; sa < custO.length; sa++) {
                if (returnvar === 0) {
				
                x = r1[custO[sa]["sortCol"]];
                y = r2[custO[sa]["sortCol"]];
                
                if (custO[sa].type == 'string'){
                    x = (T.isString(x)) ? x.toLowerCase() : x;
                    y = (T.isString(y)) ? y.toLowerCase() : y;
                }
    
                if (custO[sa].sortDir == 'desc')
                {
					if (T.isNull(y) || T.isUndefined(y) || y < x) {
                        returnvar = -1;
                    } else if (T.isNull(x) || T.isUndefined(x) || x < y){
                        returnvar = 1;
                    }
                } else if (custO[sa].sortDir == 'logical') {
					x = toLogicalArray(x);
                    y = toLogicalArray(y);
					
					for(var z = 0;z<y.length;z++)
					{
						if (x[z] < y[z] && z < x.length) {
							returnvar = -1;
							break;
                   		} else if (x[z] > y[z]){
                        	returnvar = 1;
							break;
                    	}
					}
					if (x.length < y.length && returnvar==0)
					{
						returnvar = -1;
					} else if (x.length > y.length && returnvar==0) {
						returnvar = 1;
					}
				} else if (custO[sa].sortDir == 'logicaldesc') {
					x = toLogicalArray(x);
                    y = toLogicalArray(y);
					for(var z = 0;z<y.length;z++)
					{
						if (x[z] > y[z] && z < x.length) {
                        	returnvar = -1;
							break;
                   		} else if (x[z] < y[z]){
                        	returnvar = 1;
							break;
                    	}
					}
					if (x.length < y.length && returnvar==0)
					{
						returnvar = 1;
					} else if (x.length > y.length && returnvar==0) {
						returnvar = -1;
					}
				} else {
					if (T.isNull(x) || T.isUndefined(x) || x < y) {
                        returnvar = -1;
                    } else if (T.isNull(y) || T.isUndefined(y) || x > y){
                        returnvar = 1;
                    }
                }
                
                }
            
            };
            return returnvar;
        
        };
    
    };

	 // ****************************************
    // *
    // * Return Obj containing Methods
    // *
    // ****************************************
    return {
	
	// ****************************************
    // *
    // * This is a simple true flag to identify
	// * the returned collection as being created by
	// * TAFFY()
    // *
    // ****************************************
    TAFFY:true,
	
	// ****************************************
    // *
    // * Get the length of the TAFFY collection.
    // *
    // ****************************************
    getLength:function () {
		return TOb.length;
	},
    
	// ****************************************
    // *
    // * This is the date of the last change
	// * to the TAFFY object.
    // *
    // ****************************************
   	lastModifyDate:new Date(),
	
    // ****************************************
    // *
    // * Create public find method
    // * Returns array of index numbers for matching array values
    // * Purpose: This takes an obj that defines a set of match
    // * cases for use against the TOb. Matching indexes are
    // * added to an array and then returned to the user. This is the
    // * primary "lookup" feature of TAFFY and is how you find individual
    // * or sets of records for use in update, remove, get, etc.
    // *
    // ****************************************
    find : function (matchObj,findFilter) {
	
	
        // define findMatches array and findMatchesLoaded flag
        var findIndex = 0;
        
			// if findFilter is provided use findFilter to start findMatches array
			// otherwise use TIA which contains all indexes of the TOb 
					if (T.isArray(findFilter)) {
						var findMatches = findFilter;
					} else  {
                    	var findMatches = TIA;
					
                }
		
       // if matchObject is a function run it against every item in findMatches
		if (T.isFunction(matchObj))
		{
			var thisMatchArray = [];
                    // loop over every element in the findMatches
	                   for(var d = 0; d < findMatches.length; d++) {
					   		  // add to matched item list if function returns true
							  if (matchObj(TOb[d],d)) {
								  thisMatchArray[thisMatchArray.length] = findMatches[d];  
	                          } 
						}
			findMatches = thisMatchArray;		
		}
		else {
		 // loop over attributes in matchObj
        for (var mi in matchObj){ 
        
            // default matchType, matchValue, matchField
            var matchType = 'is',matchValue = '',matchField = mi,matchMode = {s:t,f:f},pt = {};
			
            // If the matchObj attribute is an object
            if (T.isObject(matchObj[mi]))
            {
                // loop over match field attributes
                for (var fi in matchObj[mi]){ 
                    
                    // switch over attributes, extract data
					pt = findTests.pickTest(fi);
					matchType = pt.test;
					matchMode = pt.mode;
					
      				matchValue = matchObj[mi][fi];
                }
            }
            // If the matchObj attribute is not an object
             else
            {
                // set the match value to the value provided
                matchValue = matchObj[mi];
            }                
                
                //define thisMatchArray for this find method
                var thisMatchArray = [];
                
                    // loop over every element in the findMatches
                       for(var d = 0; d < findMatches.length; d++) {
					   	
                                    // if the value is an array of values, loop rather than do 1 to 1
                                    if (T.isArray(matchValue) && matchType != 'isSameArray' && matchType != 'hasAll')
                                    {
										// call the correct filter based on matchType and add the record if the filter returns true
                                        for(var md = 0; md < matchValue.length; md++) {
                                            if (findTests.run(matchType,TOb[findMatches[d]][matchField],matchValue[md],matchMode)) {
                                                thisMatchArray[thisMatchArray.length] = findMatches[d];
                                                
                                            }
                                        }
                                    } 
									// if the value is a function call function and append index if it returns true
                                    else if (T.isFunction(matchValue) && matchValue(TOb[findMatches[d]][matchField],d)) {
										thisMatchArray[thisMatchArray.length] = findMatches[d];
									}
									// if the value is not an array but a single value
                                    // If an exact match is found then add it to the array
                                    
									else if (findTests.run(matchType,TOb[findMatches[d]][matchField],matchValue,matchMode))
                                    {
										thisMatchArray[thisMatchArray.length] = findMatches[d];
                                        
                                    }				
                    }
                
               findMatches = thisMatchArray;
        };
        }
		// Garther only unique finds
		findMatches = T.gatherUniques(findMatches);

        return findMatches;
    },
    
    // ****************************************
    // *
    // * Create public remove method
    // * Purpose: This is used to remove a record from
    // * the TOb by an index or an array of indexes.
    // *
    // ****************************************
    remove : function (dex) {
        	
            var removeIndex = bDexArray(dex,this.find);
			
            // loop over removeIndex and set each record to remove
            // this is done so all records are flagged for remove
            // before the size of the array changes do to the splice
            // function below
            for(var di = 0; di < removeIndex.length; di++) {
				if (this.onRemove != null)
				{
					this.onRemove(TOb[removeIndex[di]]);
				}
                TOb[removeIndex[di]] = 'remove';
            }
			
			// nested function find delete
			var removeRemaining = function () {
				for(var tdi = 0; tdi < TOb.length; tdi++) {
           		 	if (TOb[tdi] === 'remove') {
                    	return t;
             		}
            	}
				return f;
			};
            
            // loop over TOb and remove all rows set to remove
            while (removeRemaining()) {
				for(var tdi = 0; tdi < TOb.length; tdi++) {
	                if (TOb[tdi] === 'remove') {
	                    TOb.splice(tdi,1);
						// update lastModifyDate
						this.lastModifyDate = new Date();
	                }
	            }
			}

			// populate TIA
			bTIA();
            return removeIndex;
    } ,
    

    
    
    // ****************************************
    // *
    // * Create public insert method
    // * Purpose: this takes an obj and inserts it into
    // * the TAFFY Obj array
    // *
    // ****************************************    
    insert : function (newRecordObj) {
        
		if (this.onInsert != null)
			{
				 this.onInsert(newRecordObj);
			} 
		
		
        // Do insert
        TOb[TOb.length] = (TAFFY.isNull(conf.template)) ? newRecordObj : TAFFY.mergeObj(conf.template,newRecordObj);
		
		// update lastModifyDate
		this.lastModifyDate = new Date();

		// populate TIA
		TIA[TIA.length] = TOb.length-1;
		return [TOb.length-1];
    } ,
    
    // ****************************************
    // *
    // * Create public update method
    // * Purpose: This takes an obj of name/value
    // * pairs and then a set of 1 or more indexes
    // * and updates those records with in the TOb
    // *
    // ****************************************    
    update : function (updateObj,dex) {
        	
            var updateIndex = bDexArray(dex,this.find), updateCount=0;
			
            for(var d = 0; d < updateIndex.length; d++) {
              // set the updatedex
              var updateDex = updateIndex[d];
              
			  if (this.onUpdate != null)
				{
					this.onUpdate(updateObj,TOb[updateDex]);
				}
			            
              // Merge Objects
			  TOb[updateDex] = T.mergeObj(TOb[updateDex],updateObj);
                        
              // add the updaecount
              updateCount++;
			  
              }
        
			return updateIndex;
        } ,
        
        
    // ****************************************
    // *
    // * Create public get method
    // * Purpose: This return an array containing
    // * the rows for a set of indexes. Used to get
    // * a record set with the help of the find
    // * function. Returns an empty array if
	// * no records are found.
    // *
    // ****************************************
    
    get : function (dex) {
        
         var nT = [];
            
         var getIndex = bDexArray(dex,this.find);
                
                // loop over all of the indexes
                for(var d = 0; d < getIndex.length; d++) {
                    
                    // add the TOb to the newTAFFYArray array
                    nT[nT.length] = TOb[getIndex[d]];
                }
        return nT;
    },
	
	// ****************************************
    // *
    // * Create public first method
    // * Purpose: This returns the first row
	// * from a set of indexes. Used to get
    // * a record with the help of the find
    // * function. Returns false if no records
	// * are found.
    // *
    // ****************************************
    
    first : function (dex) {
            
         var getIndex = bDexArray(dex,this.find);
                
         return (getIndex.length > 0) ? TOb[getIndex[0]] : false;
					
    },
	
	// ****************************************
    // *
    // * Create public last method
    // * Purpose: This returns the last row
	// * from a set of indexes. Used to get
    // * a record with the help of the find
    // * function. Returns false if no records
	// * are found.
    // *
    // ****************************************
    
    last : function (dex) {
        
         var getIndex = bDexArray(dex,this.find);
                
         return (getIndex.length > 0) ? TOb[getIndex[(getIndex.length - 1)]] : false;
    },
	
	// ****************************************
    // *
    // * Create public stringify method
    // * Purpose: This returns a string JSON array
	// * from a set of indexes. Used to get records
	// * for handling by AJAX or other langauges.
    // *
    // ****************************************
    
    stringify : function (dex) {
        
        return T.JSON.stringify(this.get(dex));
    },
    
    // ****************************************
    // *
    // * Create public orderBy method
    // * Purpose: Reorder the array according
    // * to a list of fields. Very useful for
    // * ordering tables or other types of
    // * sorting.
    // *
    // ****************************************
    orderBy : function (Obj) {
        
		// Only attempt to sort if there is a length
		// to the TAFFY array
		if (TOb.length > 0) {
        // Use the private buildSortFunction method
        // to create a custom sort function
		
        var customSort = buildSortFunction(Obj);
        
        // Call JavaScript's array.sort with the custom
        // sort function
        TOb.sort(customSort);
		
		// update lastModifyDate
		this.lastModifyDate = new Date();
        
		
		}
        },
        
    // ****************************************
    // *
    // * Create public forEach method
    // * Purpose: Loop over every item in a TOb
    // * (or at least the ones passed in the forIndex)
    // * and call the provided user created function.
    // *
    // ****************************************
    forEach : function (func2call,dex) {
        
        var forIndex = bDexArray(dex,this.find);
			
        var row;
        // loop over all of the indexes
            for(var fe = 0; fe < forIndex.length; fe++) {
                // get this row from the TOb
                 row = TOb[forIndex[fe]];
                // call the function passed in to the method
				var nr = func2call(row,forIndex[fe]);
				
				// If nr is an object then set the row equal to the new object
				if (T.isObject(nr))
				{
					if (TAFFY.isSameObject(nr,TAFFY.EXIT)) {
						break;
					} else {
						this.update(nr,forIndex[fe])
					}
				}
            };
        
        },
		
	
	// ****************************************
    // *
    // * config variable object
    // *
    // ****************************************
		config:{
			// ****************************************
		    // *
		    // * Create public set method
		    // * Purpose: Set a config value
		    // *
		    // ****************************************
			set:function (n,v) {
				conf[n] = v;
				if (n == 'template' && !TAFFY.isNull(v)) {
					mergeTemp(TIA,v);
				}
			},
			// ****************************************
		    // *
		    // * Create public get method
		    // * Purpose: Get a config value
		    // *
		    // ****************************************
			get:function (n) {
				return conf[n];
			}
		},
	
	// ****************************************
    // *
    // * Create public stringify method
    // * Purpose: This returns a string JSON array
	// * from a set of indexes. Used to get records
	// * for handling by AJAX or other langauges.
    // *
    // ****************************************
    
    applyTemplate : function (tmp,dex) {
         var getIndex = bDexArray(dex,this.find);
                
         mergeTemp(getIndex,tmp);
    },
	// ****************************************
    // *
    // * Empty On Update Event - This can be replaced with a function
	// * to call a custom action as each record is updated.
    // *
    // ****************************************
		onUpdate:null,
	
	// ****************************************
    // *
    // * Empty On Remove Event - This can be replaced with a function
	// * to call a custom action as each record is removed.
    // *
    // ****************************************
		onRemove:null,
		
	// ****************************************
    // *
    // * Empty On Insert Event - This can be replaced with a function
	// * to call a custom action as each record is inserted.
    // *
    // ****************************************
		onInsert:null
    
    };
    
};
	
	// ****************************************
    // *
    // * TAFFY Public Utilities
	// * Accessed via TAFFY[methodname]()
    // *
    // ****************************************
	
	
	// ****************************************
    // *
    // * typeOf Fixed in JavaScript as public utility
    // *
    // ****************************************
	TAFFY.typeOf = function (v) {
    var s = typeof v;
    if (s === 'object') {
        if (v) {
            if (typeof v.length === 'number' &&
                    !(v.propertyIsEnumerable('length')) &&
                    typeof v.splice === 'function') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
	};
	
	
	// ****************************************
    // *
    // * JSON Object Handler / public utility
    // * See http://www.JSON.org/js.html
    // * The following JSON Object is Public Domain
	// * No warranty expressed or implied. Use at your own risk.
    // *
    // ****************************************
	
	    TAFFY.JSON = function () {
	
	        function f(n) {
	            return n < 10 ? '0' + n : n;
	        }
	
	        Date.prototype.toJSON = function () {
	
	            return this.getUTCFullYear()   + '-' +
	                 f(this.getUTCMonth() + 1) + '-' +
	                 f(this.getUTCDate())      + 'T' +
	                 f(this.getUTCHours())     + ':' +
	                 f(this.getUTCMinutes())   + ':' +
	                 f(this.getUTCSeconds())   + 'Z';
	        };
	
	
	        var m = { 
	            '\b': '\\b',
	            '\t': '\\t',
	            '\n': '\\n',
	            '\f': '\\f',
	            '\r': '\\r',
	            '"' : '\\"',
	            '\\': '\\\\'
	        };
	
	        function stringify(value, whitelist) {
	            var a,i,k,l, r = /["\\\x00-\x1f\x7f-\x9f]/g,v;
	
	            switch (typeof value) {
	            case 'string':
	
	                return r.test(value) ?
	                    '"' + value.replace(r, function (a) {
	                        var c = m[a];
	                        if (c) {
	                            return c;
	                        }
	                        c = a.charCodeAt();
	                        return '\\u00' + Math.floor(c / 16).toString(16) +
	                                                   (c % 16).toString(16);
	                    }) + '"' :
	                    '"' + value + '"';
	
	            case 'number':
	
	                return isFinite(value) ? String(value) : 'null';
	
	            case 'boolean':
	            case 'null':
	                return String(value);
	
	            case 'object':
	
	                if (!value) {
	                    return 'null';
	                }
	
	                if (typeof value.toJSON === 'function') {
	                    return stringify(value.toJSON());
	                }
	                a = [];
	                if (typeof value.length === 'number' &&
	                        !(value.propertyIsEnumerable('length'))) {
	
	                    l = value.length;
	                    for (i = 0; i < l; i += 1) {
	                        a.push(stringify(value[i], whitelist) || 'null');
	                    }
	
	                    return '[' + a.join(',') + ']';
	                }
	                if (whitelist) {
	
	                    l = whitelist.length;
	                    for (i = 0; i < l; i += 1) {
	                        k = whitelist[i];
	                        if (typeof k === 'string') {
	                            v = stringify(value[k], whitelist);
	                            if (v) {
	                                a.push(stringify(k) + ':' + v);
	                            }
	                        }
	                    }
	                } else {
	
	                    for (k in value) {
	                        if (typeof k === 'string') {
	                            v = stringify(value[k], whitelist);
	                            if (v) {
	                                a.push(stringify(k) + ':' + v);
	                            }
	                        }
	                    }
	                }
	
	                return '{' + a.join(',') + '}';
	            }
				return "";
	        }
	
	        return {
	            stringify: stringify,
	            parse: function (text, filter) {
	                var j;
	
	                function walk(k, v) {
	                    var i, n;
	                    if (v && typeof v === 'object') {
	                        for (i in v) {
	                            if (Object.prototype.hasOwnProperty.apply(v, [i])) {
	                                n = walk(i, v[i]);
	                                if (n !== undefined) {
	                                    v[i] = n;
	                                } else {
	                                    delete v[i];
	                                }
	                            }
	                        }
	                    }
	                    return filter(k, v);
	                }
	
	
	                if (/^[\],:{}\s]*$/.test(text.replace(/\\./g, '@').
	replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
	replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
	
	                    j = eval('(' + text + ')');
	
	                    return typeof filter === 'function' ? walk('', j) : j;
	                }
	
	                throw new SyntaxError('parseJSON');
	            }
	        };
	    }();
		
	
	// ****************************************
    // *
    // * End JSON Code Object Handler
    // *
    // ****************************************       
	
	// ****************************************
    // *
    // * Create public utility mergeObj method
    // * Return a new object where items from obj2
	// * have replaced or been added to the items in
	// * obj1
    // * Purpose: Used to combine objs
    // *
    // ****************************************   
	TAFFY.mergeObj = function (ob1,ob2) {
		var c = {};
		for(var n in ob1)
		{
			if (ob1.hasOwnProperty(n))
			c[n] = ob1[n];
		}
		for(var n in ob2)
		{
			if (ob2.hasOwnProperty(n))
			c[n] = ob2[n];
		}
		return c;
	};
	
	// ****************************************
    // *
    // * Create public utility getObjectKeys method
    // * Returns an array of an objects keys
    // * Purpose: Used to get the keys for an object
    // *
    // ****************************************   
	TAFFY.getObjectKeys = function (ob) {
		var kA = [];
		for(var n in ob)
		{
			if (ob.hasOwnProperty(n))
			{
				kA[kA.length] = n;
			}
		}
		kA.sort();
		return kA;
	};
	
	// ****************************************
    // *
    // * Create public utility isSameArray
    // * Returns an array of an objects keys
    // * Purpose: Used to get the keys for an object
    // *
    // ****************************************   
	TAFFY.isSameArray = function (ar1,ar2) {
		return (TAFFY.isArray(ar1) && TAFFY.isArray(ar2) && ar1.join(",") == ar2.join(",")) ? true : false;
	};
	
	// ****************************************
    // *
    // * Create public utility isSameObject method
    // * Returns true if objects contain the same
	// * material or false if they do not
    // * Purpose: Used to comare objects
    // *
    // ****************************************   
	TAFFY.isSameObject = function (ob1,ob2) {
		var T = TAFFY;
		if (T.isObject(ob1) && T.isObject(ob2)) {		
		if (T.isSameArray(T.getObjectKeys(ob1),T.getObjectKeys(ob2))) {
			for(var n in ob1)
			{
				if (ob1.hasOwnProperty(n))
				{
					if ((T.isObject(ob1[n]) && T.isObject(ob2[n]) && T.isSameObject(ob1[n],ob2[n]))
						|| (T.isArray(ob1[n]) && T.isArray(ob2[n]) && T.isSameArray(ob1[n],ob2[n]))
						|| (ob1[n] == ob2[n])) {						
					} else {
						return false;
					}
				} 
			}
		} else {
			return false;
		}
		} else {
			return false;
		}
		return true;
	};
	
	// ****************************************
    // *
    // * Create public utility has method
    // * Returns true if a complex object, array
	// * or taffy collection contains the material
	// * provided in the second argument
    // * Purpose: Used to comare objects
    // *
    // ****************************************
	TAFFY.has = function(var1, var2){
		var T = TAFFY;
		var re = true;
		if (T.isTAFFY(var1)) {
			re = var1.find(var2);
			if (re.length > 0)
			{
				return true;
			} else {
				return false;
			}
		}
		else {
			switch (T.typeOf(var1)) {
				case "object":
					if (T.isObject(var2)) {
						for (var x in var2) {
							if (re == true && var2.hasOwnProperty(x) && !T.isUndefined(var1[x]) && var1.hasOwnProperty(x)) {
								re = T.has(var1[x], var2[x]);
							} else {
								return false;
							}
						}
						return re;
					}
					else 
						if (T.isArray(var2)) {
						for (var x = 0; x < var2.length; x++) {
							re = T.has(var1, var2[x]);
							if (re == true) {
								return true;
							}
						}
						}
						else 
							if (T.isString(var2) && var1[var2] != undefined) {
								return true;
							}
					break;
				case "array":
					if (T.isObject(var2)) {
						for (var n = 0; n < var1.length; n++) {
							re = T.has(var1[n], var2);
							if (re == true) {
								return true;
							}
						}
					}
					else 
						if (T.isArray(var2)) {
						for (var x = 0; x < var2.length; x++) {
							for (var n = 0; n < var1.length; n++) {
								re = T.has(var1[n], var2[x]);
								if (re == true) {
									return true;
								}
							}						}
						}
						else 
							if (T.isString(var2)) {
								for (var n = 0; n < var1.length; n++) {
									re = T.has(var1[n], var2);
									if (re == true) {
										return true;
									}
								}
							}
					break;
				case "string":
					if (T.isString(var2) && var2 == var1) {
						return true;
					}
					break;
				default:
					if (T.typeOf(var1) == T.typeOf(var2) && var1 == var2) {
						return true;
					}
					break;
			}
		}
		return false;
	}
		
	// ****************************************
    // *
    // * Create public utility hasAll method
    // * Returns true if a complex object, array
	// * or taffy collection contains the material
	// * provided in the call - for arrays it must
	// * contain all the material in each array item
    // * Purpose: Used to comare objects
    // *
    // ****************************************
		
		TAFFY.hasAll = function (var1,var2) {
			var T = TAFFY;
			if (T.isArray(var2)) {
				var ar = true;
				for(var i = 0;i<var2.length;i++)
				{
					ar = T.has(var1,var2[i]);
					if(ar == false)
					{
						return ar;
					}
				}
				return true;
			} else {
				return T.has(var1,var2);
			}
		}
		
		// ****************************************
		// *
		// * Create public utility gatherUniques method
		// * Return a new array with only unique
		// * values from the passed array
		// * Purpose: Used to get unique indexes for find
		// *
		// ****************************************   
		TAFFY.gatherUniques = function(a){
			var uniques = [];
			for (var z = 0; z < a.length; z++) {
				var d = true;
				for (var c = 0; c < uniques.length; c++) {
					if (uniques[c] == a[z]) 
						d = false;
				}
				if (d == true) 
					uniques[uniques.length] = a[z];
			}
			return uniques;
		};
		
		// ****************************************
		// *
		// * Create public utility is[DataType] methods
		// * Return true if obj is datatype, false otherwise
		// * Purpose: Used to determine if arguments are of certain data type
		// *
		// ****************************************
		
		(function(ts){
			for (var z = 0; z < ts.length; z++) {
				(function(y){
					TAFFY["is" + y] = function(c){
						return (TAFFY.typeOf(c) == y.toLowerCase()) ? true : false;
					}
				}
(ts[z]))
			}
		}
(["String", "Number", "Object", "Array", "Boolean", "Null", "Function", "Undefined"]));
		
		// ****************************************
		// *
		// * Create public utility isNumeric method
		// * Return ture if text of sT is made up solely of numbers, false otherwise
		// * Purpose: Used to determine if arguments are numbers
		// *
		// ****************************************
		TAFFY.isNumeric = function(sT){
			var vC = "0123456789";
			var IsN = true;
			for (var i = 0; i < sT.length && IsN == true; i++) {
				if (vC.indexOf(sT.charAt(i)) == -1) 
					return false;
			}
			return IsN;
			
		};
		
		// ****************************************
		// *
		// * Create public utility isTAFFY method
		// * Return ture if obj is created by TAFFY()
		// * Purpose: Used to change behavior if oB is a TAFFY collection
		// *
		// ****************************************
		TAFFY.isTAFFY = function(oB){
			return (TAFFY.isObject(oB) && oB.TAFFY) ? true : false;
			
		};
		
		// ****************************************
		// *
		// * Create public utility EXIT object
		// * Static value
		// * Purpose: Return in a forEach function to break out of the loop
		// *
		// ****************************************
		TAFFY.EXIT = {EXIT:true};
		
}
/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 *
 * Available at: http://blog.stevenlevithan.com/archives/date-time-format
 */



var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};
