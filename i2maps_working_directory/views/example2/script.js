
// Load the example1 data source into a JavaScript object.
i2maps.datasources.load("Example2");

i2maps.setupProject( function() {
Example2 = i2maps.datasources.get("Example2");
	var context = {
		label: function(feature) {
			if (feature.attributes.label != undefined && feature.attributes.label > -99) {
				return feature.attributes.label + "°";
			} else if (feature.attributes.value != undefined && feature.attributes.value > -99) {
				return feature.attributes.value + "°";
			} else {
				return '';
			}
		},
		getColorForValue: function(feature) {
			if (feature.attributes.value != undefined && feature.attributes.value > -99 && feature.layer.min_value) {
				v = feature.attributes.value;
				c = getColor(v, feature.layer.min_value, feature.layer.max_value, "hex");
			} else {
				c = '#ffffff';
			}
			return c;
		}
	};

	default_style = new OpenLayers.Style({
		pointRadius:  13,
		fillOpacity: 0.8,
		fillColor: '${getColorForValue}',
		strokeColor: '#ff9900',
		strokeWidth: 1,
		fontWeight: "bold",
		label: '${label}',
		fontSize: "10px",
		labelAlign: "center",
		fontColor: "#000000",
		fontFamily: "Arial Narrow, Arial, sans-serif"
		}, {context: context});

	select_style = new OpenLayers.Style({
		strokeColor: '#ff0000',
		strokeWidth: 2,
		fillOpacity: 1.0
	});

	var styleMap = new OpenLayers.StyleMap({
		'default': default_style,
		'select': select_style
		}, {extendDefault: true});

	// Define a point layer containing the measurements.
	var measurements_layer = new OpenLayers.Layer.Vector("Measurements", {styleMap: styleMap});
	measurements_layer.events.addEventType("init");
	measurements_layer.events.addEventType("featureselected");
	measurements_layer.events.addEventType("timechanged");
	measurements_layer.events.on({
		"init": function(e) {
			Example2.measurements(function (response) {
				i2maps.updateVectorLayer(response, measurements_layer);
			});
		},
		"featureselected": function(e) {
			// This function is executed if the user clicks on one of the
			// sensors. We simply display a small information in our info box.
			// Updating the info box is easy: just call i2maps.updateInfoBox
			// either with the feature, a string, or a dictionary.
			// For displaying some basic information on the sensor:
			// i2maps.updateInfoBox(e.feature);
			// For displaying simply a text:
			// i2maps.updateInfoBox("My info text");
			// In our case, we are going to create a small dictionary that
			// we will display as a table in the info box. The keys of the
			// dictionary will make the labels.
			i2maps.updateInfoBox({
				'Location': e.feature.attributes.name,
				'Coordinates': Math.round(e.feature.geometry.x) + '&nbsp;/&nbsp;' + Math.round(e.feature.geometry.y),
				'Temperature': e.feature.attributes.value + ' &deg;C',
				'Date': new Date(i2maps.dateStringToTimestamp(e.feature.attributes.time)).toLocaleDateString(),
				'Time': new Date(i2maps.dateStringToTimestamp(e.feature.attributes.time)).toLocaleTimeString()
			});
			// Display the timeline for the requested sensor.
			Example2.measurements_timeline(
				e.feature.attributes.sensor_id,
				function (data) {
					data = $.map(
						data.features, 
						function (f) {
							f.time = f.properties.time.substr(0,19);
							f.value = f.properties.temperature;
							return f;
						}
					);
					timeline.setData(0, data);
				}
			);
			// Display the prediction surface at the sensor location.
			Example2.prediction_timeline(
				e.feature.geometry.x, e.feature.geometry.y,
				function (response) {
					timeline.setData(1, response.data);
				}
			);
		},
		"timechanged": function(e) {
			Example2.measurements(
				i2maps.timestampToDateString(e.time), 
				function (response) {
					i2maps.updateVectorLayer(response, measurements_layer);
				}
			);
		}
	});

	// Define a layer for the prediction points
	// (in the case a user clicks on the prediction surface)
	// We need to provide this layer to the prediction surface.
	var overlay_layer = new OpenLayers.Layer.Vector("Overlays", {styleMap: styleMap});

	// Define a layer for the prediction surface
	var prediction_layer = new OpenLayers.Layer.Surface("Prediction Surface", {overlay_layer: overlay_layer});
	prediction_layer.setOpacity(0.8);
	prediction_layer.events.addEventType("init");
	prediction_layer.events.addEventType("featureselected");
	prediction_layer.events.addEventType("mousemove");
	prediction_layer.events.addEventType("timechanged");
	prediction_layer.events.on({
		"init": function(e) {
			Example2.prediction_surface( function (response) {
				i2maps.updateSurfaceLayer(response, prediction_layer);
			});
		},
		"featureselected": function(f) {
		    i2maps.updateInfoBox({
		       'Location': 'Predicted',
		       'Coordinates':  Math.round(f.coord.x) + '&nbsp;/&nbsp;' + Math.round(f.coord.y),
		       'Temperature': (Math.round(f.value*10) / 10) + ' &deg;C',
			   'Date': new Date(i2maps.dateStringToTimestamp(f.attributes.time)).toLocaleDateString(),
			   'Time': new Date(i2maps.dateStringToTimestamp(f.attributes.time)).toLocaleTimeString()
		    });
			// Get the time line.
			Example2.prediction_timeline(
				f.coord.x, f.coord.y,
				function (response) {
					timeline.clear();
					timeline.setData(1, response.data);
				}
			);
        },
        "mousemove": function(e) {
            var html = '<img src="' + e.legend_image + '" width="20" height="80" style="float:left"/>';
            html += '<p style="font-size: 10px; position: absolute; top: 0px; left: 40px">Max: ' + e.value_range[1].toFixed(1) + ' &deg;C</p>';
            html += '<p style="font-size: 10px; position: absolute; top: 65px; left: 40px">Min: ' + e.value_range[0].toFixed(1) + " &deg;C</p>";
            if (e.value != null && e.value > -99) {
                html += '<p style="font-size: 10px; position: absolute; top: 32px; left: 40px">Prediction: ' + e.value.toFixed(1) + " &deg;C</p>";
            }
            $("#legend").html(html);
        },
		"timechanged": function(e) {
			Example2.prediction_surface(
				i2maps.timestampToDateString(e.time), 
				function (response) {
					i2maps.updateSurfaceLayer(response, prediction_layer);
				}
			);
		}
	});

	// Create the map and register with i2maps
	var map = new i2maps.Map({
		id: 'map',
		mapDiv: 'map_canvas',
		baseLayers: ["Open Street Map", "Google Physical", "Google Satellite", "Google Hybrid", "Google Streets"],
		layers: [prediction_layer, measurements_layer, overlay_layer],
		// Define the initial map extent (in Google Mercator projection)
		// The bounding box is defined with xmin, ymin, xmax, ymax
		mapExtent: new OpenLayers.Bounds(-1120000, 6750000, -430200, 7300000)
	});
	i2maps.registerMap(map);
	
	// Register the timeline with i2maps
	var timeline = $.timeline($("#chart_div"), {timespan: "1 week", lines: {lineWidth: 1.5}});
	i2maps.registerTimeline(timeline);

	// Activate the Info Box and legend Panels
	$("#info_box").panel({
		draggable: true,
		collapsible: true,
		collapsed: false,
	});
	$("#legend_box").panel({
		draggable: true,
		collapsible: true,
		collapsed: false,
	});
	
});

