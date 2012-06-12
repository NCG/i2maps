var i2maps = {};

i2maps.getJSON = function(url, callback) {
    xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.resonseType="text";
    xhr.onload = function(e){callback(JSON.parse(this.response))};
    xhr.send(null);
};


i2maps.dateStringToTimestamp = function(dateString)
{
    if(dateString.length != 19) return false;
    var d = new Date(dateString.replace(/-/g, "/"));
    var offset = d.getTimezoneOffset() * 60000;
    return Math.round(d.getTime()) - offset;
}

i2maps.timestampToDateString = function (time){
    d = new Date(time);
    time = d.toJSON().substr(11,8);
    m = '' + (d.getMonth()+1);
    m = m.length < 2 ? '0' + m : m
    day = '' + d.getDate()
    day = day.length < 2 ? '0' + day : day
    return d.getFullYear() + '-' + m + '-' + day + ' ' + time;
}

i2maps.Map = function(mapDiv, options){
    var temp = i2maps.createMap(mapDiv, options);
    
    // Create a click control for handling single and double clicks.
    // A user will register for these events as below
    // map.click_function = function(lonlat.lon, lonlat.lat, e.xy.x, e.xy.y)
    // map.dblclick_function = function(lonlat.lon, lonlat.lat, e.xy.x, e.xy.y)
    OpenLayers.Control.Click = OpenLayers.Class
    (
        OpenLayers.Control,
        {
            defaultHandlerOptions:{'single': true, 'double': true, 'pixelTolerance': 0, 'stopSingle': false, 'stopDouble': false},
            
            initialize: function(options)
            {
                this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
                OpenLayers.Control.prototype.initialize.apply(this, arguments);
                this.handler = new OpenLayers.Handler.Click(this, {'click': this.click, 'dblclick': this.dblclick}, this.handlerOptions);
            },
            
            // Click handlers are below. For each, expand out the e into its components lon, lat, x, y. 
            // This is a much more useful interface.
            
            // Single click handler.
            click: function(e)
            {
                var lonlat = map.getLonLatFromViewPortPx(e.xy);
                if(temp.click_function) temp.click_function(lonlat.lon, lonlat.lat, e.xy.x, e.xy.y);
            },
            
            // Double click (dblclick for short) handler.
            dblclick: function(e)
            {
                var lonlat = map.getLonLatFromViewPortPx(e.xy);
                if(temp.click_function) temp.dblclick_function(lonlat.lon, lonlat.lat, e.xy.x, e.xy.y);
            }
        }
    );
    
    // Create an instance of the control and activate it on the map.
    var click = new OpenLayers.Control.Click();
    temp.addControl(click);
    click.activate();
    
    return temp;
}
 
i2maps.createMap = function(mapDiv, options){
    var map_options = {
    	div: mapDiv,
    	allOverlays: false,
        projection: new OpenLayers.Projection("EPSG:900913"),
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
    var map = new OpenLayers.Map(map_options.div, map_options);
    map.addBaseLayer = function(layer_name){
        if(layer_name.contains("Google") && window['G_PHYSICAL_MAP'] == undefined){
            console.error("You must set GOOGLE_MAPS_API_KEY to your API key to use Google Maps layers!");
            return
        }
        var base_layer_creator;
        if((base_layer_creator = i2maps.baseLayerDefinitions[layer_name])){
            var layer = base_layer_creator.call();
            this.addLayer(layer);
            return layer;
        }
        else{
            console.error("Invalid base layer name: " + layer_name);
        }
    };
    for(bl in map_options.baseLayers){
        map.addBaseLayer(map_options.baseLayers[bl])
    }
    var setup_select_control = function(e){
        var layer = e.layer;
        if(layer instanceof OpenLayers.Layer.Vector && !layer.name.startsWith("OpenLayers.Control.SelectFeature")){
            if(this.selectControl != undefined){
                this.removeLayer(this.selectControl.layer)
                this.removeControl(this.selectControl);
                delete this.selectControl;
            }
            this.selectControl = new OpenLayers.Control.SelectFeature(
                this.layers.filter(function(l){return l instanceof OpenLayers.Layer.Vector})
            );
            this.selectControl.handlers.feature.stopDown = false; // hack for dragging vector layers
            this.addControl(this.selectControl);
            this.selectControl.activate();   
        }
    };
    map.events.register("addlayer", map, setup_select_control);
    map.events.register("removelayer", map, setup_select_control);
    overlay_layer = new i2maps.VectorLayer("overlay");
    overlay_layer.displayInLayerSwitcher = false;
    map.addLayer(overlay_layer);
    map.zoomToExtent(map_options.maxExtent);
    OpenLayers.Events.prototype.includeXY = true;
    return map;
};

i2maps.VectorLayer = function(layer_name){
    var styleMap = new OpenLayers.StyleMap();
    styleMap.createSymbolizer = function (feature,intent){
        var id = feature.attributes.id;
        if(feature.layer.style_function){
            var style_config = feature.layer.style_function(id, (intent == 'select'), feature);
            var style = {};
            update(style, feature.layer.default_style);
            update(style, style_config);
            Object.keys(style).forEach(function(k) {
                if(k.contains("Color")){
                    if(style[k] != undefined){
                        if(style[k].join != undefined){
                            style[k] = hex_color(style[k]);
                        }
                    }
                    else{
                        style[k] = "";
                    }
                }
            });
            return new OpenLayers.Style(style).createSymbolizer(feature);
        }
        else{
            return new OpenLayers.Style().createSymbolizer(feature);
        }
    
    }
    var layer = new OpenLayers.Layer.Vector(layer_name, {styleMap: styleMap});
    layer.isVector = true;
    layer.events.addEventType("featureselected");
    layer.events.addEventType("featureunselected");
    layer.events.on({
    	"featureselected": function(e) {
    		if(layer.select_function) layer.select_function(e.feature.attributes.id, e.feature);
    	},
    	"featureunselected": function(e) {
            if(layer.unselect_function) layer.unselect_function(e.feature.attributes.id, e.feature);
    	},
    });
    layer.setGeometries = function(geometries, key, epsg){
        this.destroyFeatures();
        var v = values(geometries)[0];
        if(key == undefined){
            if(v['geom']) key = 'geom';
            if(v['geometry']) key = 'geometry';
        }
        if(key != undefined) v = v[key];
        var geojson = new OpenLayers.Format.GeoJSON();
        var proj_4326 = new OpenLayers.Projection("EPSG:4326");
        var proj_900913 = new OpenLayers.Projection("EPSG:900913");
        if(epsg != undefined && epsg != "900913"){
            geojson.externalProjection = new OpenLayers.Projection("EPSG:" + epsg);
            geojson.internalProjection = new OpenLayers.Projection("EPSG:900913");
        }
        var parse_geom = function(geom){
            if(geom.CLASS_NAME) return geom;
            return geojson.parseGeometry(geom);
        }
        if(geometries['type'] && (geometries['type'] == 'FeatureCollection' || geometries['type'] == 'Feature'))
        {
            var f = geojson.read(geometries);
            for(var i=0; i < f.length; i++){
                if(f[i].attributes.id == undefined) f[i].attributes.id = i;
            }
            this.addFeatures(f);
        }
        else
        {
            for(id in geometries)
            {
                // if(typeof(id) == typeof(1)) id = String(id);
                if(id.substr(0,2) == '__') continue;
                var f = new OpenLayers.Feature.Vector();
                if(key) f.geometry = geometries[id][key] = parse_geom(geometries[id][key]);
                else f.geometry = geometries[id] = parse_geom(geometries[id]);
                f.attributes.id = id;
                this.addFeatures([f]);
            }
        }
        this.features.forEach(function(f){
            var g = f.geometry;
            if(g.getCentroid().x < 180 && g.getCentroid().x > -180){
                f.geometry = g.transform(proj_4326, proj_900913);         
            }
        });
    }
    layer.default_style  = {
            'pointRadius': 8,
            'fontSize': '10px',
            'fillColor':'none',
            'strokeColor':'#000',
            'strokeWidth': 1,
            'fontColor': '#000',
            'fillOpacity': 0.8,
            'strokeOpacity': 1,
            'label': ''
    };
    return layer;
}
    
i2maps.RasterLayer = function(layer_name){
    var layer = new OpenLayers.Layer.Surface(layer_name);
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
    return layer;
};


var max_bounds = function(){return new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34);};
var baseLayerDefinitions = {
    "Google Physical": function(){
        return new OpenLayers.Layer.Google(
                    "Google Physical",
                    {type: G_PHYSICAL_MAP, sphericalMercator: true, maxExtent: max_bounds()}
        );
    },
    "Google Streets": function(){
        return new OpenLayers.Layer.Google(
                "Google Streets", // the default
                {numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds()}
        );
    },
    "Google Hybrid": function(){
        return new OpenLayers.Layer.Google(
                "Google Hybrid",
                {type: G_HYBRID_MAP, numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds()}
        );
    },
    "Google Satellite": function(){
        return new OpenLayers.Layer.Google(
                "Google Satellite",
                {type: G_SATELLITE_MAP, numZoomLevels: 22, sphericalMercator: true, maxExtent: max_bounds()}
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



i2maps.InfoBox = (function(){
    function Class(div_id, title){
        this.element = document.getElementById(div_id);
        var html = '<h3>%s</h3>'.f(title);
        html += '<div><div class="content" style=""></div></div>';
        this.element.innerHTML = html;
        this.element = document.querySelector('#' + div_id + ' div.content');
    }
    Class.prototype.update = function(obj){
        if (typeof(obj) == 'string') {
            this.element.innerHTML = obj;
        }
        else{
            var table = document.createElement("table");
            // var s = '<table style="font-size: 10px;">';
            var attributes = obj.attributes || obj;
            keys(attributes).forEach(function(a){
                var v = attributes[a] || "";
                if(typeof(v) == "string" && v.startsWith('data:image/')){
                    var dataurl = v;
                    var img = new Image();
                    img.src = dataurl;
                    img.width = 150;
                    var v = document.createElement("a");
                    v.appendChild(img);
                    v.href=img.src;
                    v.target="_blank";
                }
                if(v.CLASS_NAME != undefined) v = v.toString().substr(0, 50);
                var tr = table.appendChild(document.createElement("tr"));
                var td = tr.appendChild(document.createElement("td"));
                var h = td.appendChild(document.createElement("strong"));
                h.innerHTML = a + ":&nbsp;";
                var td = tr.appendChild(document.createElement("td"));
                try{
                    td.appendChild(v);
                }
                catch(e){
                    td.innerHTML = String(v);
                }
                // s += "<tr><td><b>" + a + ":&nbsp;</b></td><td>" + v + "</td></tr>";
            });
            // s += "<tr><td></td></tr>";
            // s += "</table>";
            // this.element.innerHTML = s;
            this.element.innerHTML = "";
            this.element.appendChild(table);
        }
    }
    return Class;
})();


i2maps.ColorBar = (function(){
    function Class(div_id, title, cm, units){
        this.element = document.getElementById(div_id);
        this.div_id = div_id;
        var html = '<h3>%s</h3>'.f(title);
        html += '<div><div class="content" style="height: 100px;"></div></div>';
        this.element.innerHTML = html;
        this.element = document.querySelector('#' + div_id + ' div.content');
        this.colormap = cm;
        this.units = units;
    
        var html = '<img src="' + make_colorbar_img(this.colormap, 0) + '" width="20" height="100px" style="float:left"/>';
        html += '<div style="font-size: 10px; position: absolute; left: 40px">';
        html += '<p style="padding-bottom:10px">Max: <span class="max"></span> ' + this.units + '</p>';
        html += '<p style="padding:5px"><span class="value">&nbsp;</span></p>';
        html += '<p style="padding-top:10px">Min: <span class="min"></span>' + this.units + '</p>';
        html += '</div>';
        this.element.innerHTML = html;
        this.update(this.colormap.min - 1);
    
    }
    Class.prototype.update = function(value){
        var div_id = this.div_id;
        document.querySelector('#' + div_id + ' img').src = make_colorbar_img(this.colormap, value);
        document.querySelector('#' + div_id + ' span.max').innerHTML = this.colormap.max;
        document.querySelector('#' + div_id + ' span.min').innerHTML = this.colormap.min;
        if(value > this.colormap.min)document.querySelector('#' + div_id + ' span.value').innerHTML = value.toFixed(1) + this.units;
    }

    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 100;
    var ctx = canvas.getContext('2d');
    var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    function make_colorbar_img(cm, value){
        var range = cm.max - cm.min;
        var s = range / 100;
        var v_y = Math.round((value - cm.min) * (100.0/range))
        for(var y=0; y < canvas.height; y++)
        {
                var v = (y * s) + cm.min;
                var idx = (canvas.height - y) * 4;
                var color = cm(v);
                if(y == v_y) color = [0,0,0];
                canvasData.data[idx + 0] = color[0]; // Red channel
                canvasData.data[idx + 1] = color[1]; // Green channel
                canvasData.data[idx + 2] = color[2]; // Blue channel
                canvasData.data[idx + 3] = 255; // Alpha channel
        }
        ctx.putImageData(canvasData, 0, 0);
        return canvas.toDataURL();
    }

    return Class;
})();

i2maps.layer_to_svg = function (vector_layer){
    var xmlFormat = new OpenLayers.Format.XML();
    var doc = vector_layer.renderer.rendererRoot.cloneNode(true);
    doc.appendChild(vector_layer.renderer.root.cloneNode(true));
    var svg = xmlFormat.write(doc);
    return s = "data:image/svg+xml," + encodeURIComponent(svg);
}

i2maps.events = {};
i2maps.events.listeners = {};
i2maps.events.register = function(event_name, func){
    if(this.listeners[event_name] == undefined) this.listeners[event_name] = [];
    this.listeners[event_name].push(func);
};
i2maps.events.trigger = function(event_name){
    if(this.listeners[event_name] != undefined){
        var parameters = [].slice.call(arguments, 1);
        this.listeners[event_name].forEach(function(x){x.apply(null, parameters)});
    }
};


partial = function(func /*, 0..n args */) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var allArguments = args.concat(Array.prototype.slice.call(arguments));
    return func.apply(this, allArguments);
  };
}

range = function(start, stop){var ret = []; for(var i=start; i < stop; i++){ret.push(i)} return ret};

values = function (object){
    var result = [];
    for (var key in object)
        result.push(object[key]);
    return result;
}
keys = function(object){
    return Object.keys(object);
}

update = function(a,b){
    for(var k in b){
        if(b[k] != undefined){
            a[k] = b[k];
        }
    }
}
String.prototype.startsWith = function(str){
    return (this.substr(0, str.length) === str);
};
String.prototype.endsWith = function(str){
    return (this.substr(str.length*-1) === str);
};
String.prototype.f = function(subs){
    var temp = this; 
    for(var i in arguments){
        temp = temp.replace("%s", arguments[i]);
    } 
    return temp
};

var lpad = function(s, len){while(s.length < len){s = '0' + s} return s};
hex_color = function(a){
    return "#" + lpad(a[0].toString(16), 2) + lpad(a[1].toString(16), 2) + lpad(a[2].toString(16), 2);
}