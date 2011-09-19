i2maps Javascript API Documentation
===================================

i2maps.Map
----------

.. js:class:: Map(div_id [, options])
    
    Create an OpenLayers map object with some extras.
    
   :param string div_id: The id of the placeholder div
   :param object options: an optional object of options
    
    The options object may include a baseLayers key mapped to 
    an array of base layer identifiers. addBaseLayer will be called with 
    each string included in this array.
    

.. js:function:: Map.addBaseLayer(layer_name)
    
    Add a named base layer to the map.
    
    This is a convenience function, base layers can also be created normally
     as OpenLayers layers with isBaseLayer: True and added to the map with addLayer.
    
    If you wish to use "Google" layers you must set a global variable
    GOOGLE_MAPS_API_KEY to the API key for your domain.
    
    The possible layers come from i2maps.baseLayerDefinitions.
    You may add other entries to this dictionary to add additional shortcuts.
    The "Open Street Map" layer is defined as follows:
    
    .. code-block:: javascript
    
        i2maps.baseLayerDefinitions["Open Street Map"]: function(){
            return new OpenLayers.Layer.OSM("Open Street Map");
        };
    
    
    :param string layer_name: One of "Open Street Map" or "OSM", "Google Streets", "Google Satellite", "Google Hybrid", "Google Physical", "No Base Layer".
    

i2maps.VectorLayer
------------------

.. js:class:: VectorLayer(name)
    
    Create an OpenLayers vector layer with some extras.
    Feature select events are automatically added to the layer.
    The style is set to be computed by calling the style_function.
    
   :param string name: The name of the layer (shown in the layer switcher)
    

.. js:function:: VectorLayer.style_function(id, selected)
    
    This function is called every time a vector is drawn on this layer.
    This function should be assigned such that it returns a dictionary
    of style options for the vector with the id given.
    
    .. code-block:: javascript
    
        layer.style_function = function(id, selected){
            return {'stroke': selected ? '#ff0000' : "#000000",
                    'fillColor': "#ffffff",
                    'label': some_data[id]
                    }
        };
        
    
    :param string id: the id of the vector to be styled
    :param boolean selected: true if this vector is selected, false otherwise

.. js:function:: VectorLayer.select_function(id)
    
    This function is called when a vector is selected.
    This function should be assigned such that it does something appropriate
    when the vector with the given id is selected.
    It should not return anything.
    
    .. code-block:: javascript
    
        layer.select_function = function(id){
            console.log("Vector " + id + " was selected.");
        };
        
    
    :param string id: the id of the vector that was selected
          
i2maps.RasterLayer
------------------
.. js:class:: RasterLayer(name)
    
    Create a canvas based image layer.
    The layer is designed to be drawn by assigning a color to each pixel.
    
   :param string name: The name of the layer (shown in the layer switcher)

.. js:function:: RasterLayer.setGeometry(bbox, shape)
    
    Set the bounding box and shape of this layer.
    
    :param array bbox: [left, bottom, right, top]
    :param array shape: [height, width]
    

.. js:function:: RasterLayer.draw_function(x, y)
    
    This function is called for each pixel every time this layer is drawn.
    This function should be assigned such that it returns a color
    for the pixel at the given x,y coordinate.
    
    The return value should be an array of [R, G, B, A].
    
    Typically this function is used with a colormap and some 2d data array.
    
    .. code-block:: javascript
    
        cm = i2maps.colormap.jet(0, 100);
        
        layer.draw_function = function(x, y){
            var value = data[y][x];
            return cm(value);
        };
        
    
    :param int x: the pixel coordinate on the horizontal axis
    :param int y: the pixel coordinate on the vertical axis
    
.. js:function:: RasterLayer.select_function(x, y, lat, lon)
    
    This function is called when a pixel is selected.
    This function should be assigned such that it does something appropriate
    when the pixel at the given x, y is selected.
    It should not return anything.
    
    .. code-block:: javascript
    
        layer.select_function = function(x, y, lat, lon){
            console.log("Pixel " + x + "," + y + " was selected.");
        };
        
    
    :param int x: the pixel coordinate on the horizontal axis
    :param int y: the pixel coordinate on the vertical axis
    :param float lat: the geographic latitude corresponding to the selected pixel
    :param float lon: the geographic longitude corresponding to the selected pixel
    

i2maps.Timeline
---------------

.. js:class:: Timeline(div_id [, options])
    
    Create a timeline control.
    The timeline displays time referenced numeric data on a line chart.
    The timeline may have multiple layers which can be updated independently.
    
   :param string div_id: The id of the placeholder div
   :param object options: an optional object of options
   
   :param string options.timespan: a timespan in natural language. e.g. "1 week" or "10 days". The timespan is the length of time that should be shown on the timeline at the default zoom level.
    

.. js:function:: timeline.update(data, layer)
    
    Update the timeline with the data provided.
    
    .. code-block:: javascript
    
        timeline = new i2maps.Timeline('timeline', "2 days");
        timeline.update({
          '2011-01-01 00:00': 5.0,
          '2011-01-01 12:00': 10.0,
          '2011-01-01 18:00': 20.0,
          '2011-01-02 00:00': 15.0,
          '2011-01-02 12:00': 12.0
        }, 0);
    
    
    :param object data: a mapping of timestamps to values
    :param int layer: the timeline layer that should be updated
    
.. js:function:: timeline.onChangeTime(time)
    
    This function is called when the time is changed by selecting a timepoint.
    By default this function triggers a "timechange" event.
    
    .. code-block:: javascript
    
      timeline.onChangeTime = function(time){
        i2maps.events.trigger("timechange", time)
      };
    
    :param string time: the current timestring
    

i2maps.colormap
---------------

.. js:function:: colormap.jet(min, max)
    
    Create a Jet colormap function with the given min, max.
    
    Returns a colormap_function
    
    :param int min: the minimum value of this colormap
    :param int max: the maximum value of this colormap

.. js:function:: colormap.hot(min, max)
    
    Create a Hot colormap function with the given min, max.
    
    Returns a colormap_function
    
    :param int min: the minimum value of this colormap
    :param int max: the maximum value of this colormap

.. js:function:: colormap.grays(min, max)
    
    Create a Grays colormap function with the given min, max.
    
    Returns a colormap_function
    
    :param int min: the minimum value of this colormap
    :param int max: the maximum value of this colormap
    
.. js:function:: colormap_function(value [, default])
    
    Returns the color for the specified value.
    If the value is outside the min,max range, return default
    
    The color is an array, with a .html() function which converts 
    it to the html hex string representation.
    
    :param float value: value
    :param array default: the default color. Defaults to [0,0,0,0] (fully transparent black)
    


i2maps.InfoBox
--------------

.. js:class:: InfoBox(div_id, title)
    
    Create an Information Box control.
    
   :param string div_id: The id of the placeholder div
   :param object title: the title to display in the box
    

.. js:function:: infobox.update(obj)
    
    Update the info box with the contents of obj.
    
    If obj is a String, the innerHTML of the info box will literally be obj.
    If obj is an object/dictionary, the key-value pairs will be 
    formatted as a table inside the info box.
    
    .. code-block:: javascript
    
        infobox = new i2maps.InfoBox('info_box', 'Information');
        infobox.update({
          'Name': 'Something',
          'Value': 42.0
        });
    
    
    :param object/string obj: the object to use as the contents of this info box
    

