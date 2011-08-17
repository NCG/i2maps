    var Map= {};
    
    Map.initialize = function(mapDiv, options){
            var map_options = {
            	div: mapDiv,
            	allOverlays: false,
            	maxExtent: new OpenLayers.Bounds.fromArray([-1120566.8344909, 6875052.0711326, -430187.59514285, 7262740.6785256]), 
            	controls: [
            	    new OpenLayers.Control.DragPan(),
            		new OpenLayers.Control.Navigation(),
            		new OpenLayers.Control.PanZoomBar(),
            		new OpenLayers.Control.ScaleLine(),
            		new OpenLayers.Control.MousePosition(),
            		new OpenLayers.Control.LayerSwitcher()
            	]
            };
            for (opt in options) {
                map_options[opt] = options[opt];
            }
            map_options.div.innerHTML = '';
            OpenLayers.Map.initialize.call(this, mapDiv, map_options);

            for(bl in map_options.baseLayers){
                this.addBaseLayer(map_options.baseLayers[bl])
            }
            this.zoomToExtent(map_options.maxExtent);
    };
    Map.addBaseLayer = function(layer_name){
        if(layer_name.contains("Google") && window['G_PHYSICAL_MAP'] == undefined){
            console.error("You must include Google Maps API v2 to use Google layers!");
            return
        }
        var base_layer_creator;
        if((base_layer_creator = i2maps.baseLayerDefinitions[layer_name])){
            var layer = base_layer_creator.call();
            this.addLayers([layer]);
            return layer;
        }
        else{
            console.error("Invalid base layer name: " + layer_name);
        }
    };
    Map.createVectorLayer = function(layer_name){
        var styleMap = new OpenLayers.StyleMap();
    	styleMap.createSymbolizer = function (feature,intent){
    	    var id = feature.attributes.id;
    	    if(feature.layer.style_function){
    	        var style_config = feature.layer.style_function(id, (intent == 'select'), feature);
    	        return new OpenLayers.Style(style_config).createSymbolizer(feature);
    	    }
    	    else{
    	        return new OpenLayers.Style().createSymbolizer(feature);
    	    }
    
    	}
    	var layer = new OpenLayers.Layer.Vector(layer_name, {styleMap: styleMap});
    	layer.events.addEventType("featureselected");
    	layer.events.addEventType("featureunselected");
    	layer.events.on({
    		"featureselected": function(e) {
    		    var id = e.feature.attributes.id;
    			if(layer.select_function) layer.select_function(id, e.feature);
    		},
    		"featureunselected": function(e) {

    		},
    	});
    	if(this.selectControl) this.removeControl(this.selectControl);
        this.selectControl = new OpenLayers.Control.SelectFeature(
        	this.layers.filter(function(l){return l.isVector})
        );
        this.selectControl.handlers.feature.stopDown = false; // hack for dragging vector layers
        this.addControl(this.selectControl);
        this.selectControl.activate();
        this.addLayers([layer]);
    	return layer;
    };
    Map.createRasterLayer = function(layer_name){
        if(this.overlay_layer == undefined){
            this.overlay_layer = map.createVectorLayer("");
            this.overlay_layer.displayInLayerSwitcher = false;
        }
        var layer = new OpenLayers.Layer.Surface(layer_name, {overlay_layer: this.overlay_layer});
    	layer.setOpacity(0.8);
    	layer.events.addEventType("init");
    	layer.events.addEventType("featureselected");
    	layer.events.addEventType("mousemove");
    	layer.events.addEventType("timechanged");
    	layer.events.on({
    		"featureselected": function(f) {
    		    if(layer.select_function) layer.select_function(f.x, f.y, f.coord.x, f.coord.y);
            },
            "mousemove": function(f) {
                if(layer.hover_function) layer.hover_function(f.pixel_y, f.pixel_x, f);
            },
    	});
    	this.addLayers([layer]);
    	return layer;
    };
    Map.CLASS_NAME = 'i2maps.Map';
    i2maps.Map = OpenLayers.Class(OpenLayers.Map, Map);
    
    
    var max_bounds = new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34);
    var baseLayerDefinitions = {
        "Google Physical": function(){
            return new OpenLayers.Layer.Google(
                        "Google Physical",
                        {type: G_PHYSICAL_MAP, sphericalMercator: true, maxExtent: max_bounds}
            );
        },
        "Google Streets": function(){
            return new OpenLayers.Layer.Google(
                    "Google Streets", // the default
                    {numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds}
            );
        },
        "Google Hybrid": function(){
            return new OpenLayers.Layer.Google(
                    "Google Hybrid",
                    {type: G_HYBRID_MAP, numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds}
            );
        },
        "Google Satellite": function(){
            return new OpenLayers.Layer.Google(
                    "Google Satellite",
                    {type: G_SATELLITE_MAP, numZoomLevels: 22, sphericalMercator: true, maxExtent: max_bounds}
            );
        },
        "Open Street Map": function(){
            return new OpenLayers.Layer.OSM("Open Street Map");
        },
        "No Base Layer": function(){
            var transparent_layer = new OpenLayers.Layer.OSM("No Base Layer")
            transparent_layer.url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==";
            transparent_layer.setOpacity(0);  
            return transparent_layer;
        }
        
    };
    baseLayerDefinitions['OSM'] = baseLayerDefinitions['Open Street Map'];
    baseLayerDefinitions['None'] = baseLayerDefinitions['No Base Layer'];
    i2maps.baseLayerDefinitions = baseLayerDefinitions;