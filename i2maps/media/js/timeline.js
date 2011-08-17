if(i2maps == undefined) i2maps = {};
i2maps.Timeline = (function() {
    function Timeline(target_, options) {
        target_ = $('#' + target_);
        var plot_target = $('<div></div>');
        var time_target = $('<p id="time" style="text-align:center; margin:0px; padding:0px; padding-top: 10px">TIME</p>');
        target_.html('');
        plot_target.height(target_.height() - 45);
        plot_target.width(target_.width() - 20);
        plot_target.css('margin', '10px');
        target_.append(time_target);
        target_.append(plot_target);
        target_ = plot_target;
        abc = target_;
        var _this = this;
        this.draw = draw;
        this.test = getTest;
        this.setData = setData;
        this.getData = getData;
        this.addDataSource = addDataSource;
        this.update = update;
        this.plot = getPlot;
        this.getPlotOptions = getPlotOptions;
        this.setPlotOptions = setPlotOptions;
        this.getTimeRange = getTimeRange;
        this.setTimeRange = setTimeRange;
        this.setDataRange = setDataRange;
        this.getDataRange = getDataRange;
        this.getCurrentValue = getCurrentValue;
        this.getCurrentTime = getCurrentTime;
        this.setCurrentTime = setCurrentTime;
        this.clear = clear;
        this.zoom = zoomChart;
        this.parseTimespan = parseTimespan;
        this.closestDataPoint = closestDataPoint;
        this.timeChangeCallbacks = [];
        
        var start_time = null;
        var end_time = null;
        var current_time;
        
        var min_value = null;
        var max_value = null;
        
        var plot;
        var plot_options;
        var timer;
        var previous_item;
        
        var data = [];
        var dataSources = null;
        var data_series;
        
        this.ONE_SECOND = 1000;
        this.ONE_MINUTE = 60 * _this.ONE_SECOND;
        this.ONE_HOUR = 60 * _this.ONE_MINUTE;
        this.ONE_DAY = 24 * _this.ONE_HOUR;
        this.ONE_WEEK = 7 * _this.ONE_DAY;
        this.ONE_MONTH = 30 * _this.ONE_DAY;
        this.ONE_YEAR = 365 * _this.ONE_DAY;
        
        // Events
        this.onChangeTime = function(time){i2maps.events.trigger("timechange", time)};
        this.onPostDraw = function(){};
        
        // initialize
        init();
        //draw();
        //updateData();
        
        function init()
        {   
            plot_options = { 
                xaxis: { 
                    mode: "time",
                    timeformat: " %b %d %H:%M",
                    min: null, //- 43200000,
                    max: null //+ 43200000
                    }, 
                yaxis: { 
                    //min: min_value,
                    //max: max_value
                    },
                xaxes: [ { position: "bottom" } ],
                yaxes: [ {}, {position: "right"} ],
                lines: { show: true, lineWidth: 1.5 },
                points: { show: false },
                selection: { mode: null },
                grid: { 
                    hoverable: true,
                    clickable: true,
                    backgroundGradient: false,
                    borderColor: null,
                    borderWidth: 0 
                    },
                timespan: _this.ONE_WEEK,
            }
            
            function apply(obj, options)
            {
                for (opt in options) {
                    if (options[opt].toString() == "[object Object]")
                    {
                        apply(obj[opt], options[opt]);
                    }
                    else
                    {
                        obj[opt] = options[opt];
                    }
                }
            }
            apply(plot_options, options);
            
            target_.mousedown(function(e){
                  start_x = e.clientX;
                  $(this).mousemove(function(e){
                        delta_x = start_x - e.clientX;
                        time_range = end_time - start_time;
                        seconds_per_pixel = time_range / 500;
                        start_time += delta_x * seconds_per_pixel;
                        end_time += delta_x * seconds_per_pixel;
                        start_x = e.clientX;
                        draw();
                      });
                });

            target_.bind('mouseup', function(e){
                  $(this).unbind("mousemove");
                  //updateData();
                });
            
            target_.mousewheel(function(e, delta){
                direction = delta > 0? 1 : -1;
                zoomChart(direction);
                return false;
                });
            
            target_.bind("plotclick", function (event, pos, item) {
                if (item) {
                    test = item;
                    current_value = item.datapoint[1].toFixed(2);
                    current_data_point = item.dataIndex;
                    if(item.datapoint[0] != current_time)
                    {
                        current_time = item.datapoint[0];
                        highlight(item);
                        time_target.html(new Date(current_time).toGMTString());
                        _this.onChangeTime(i2maps.timestampToDateString(current_time));
                    }
                }
            });
        }
        
        function draw()
        {
            if(data.length > 0)
            {
                var colors = ["black", "blue", "red", "green"];
            
                data_series = Array();
                for(var d in data)
                {
                    data_series.push({ color: colors[d], data: data[d], yaxis: parseInt(d)+1 });
                }
            
                plot_options.xaxis.min = start_time;
                plot_options.xaxis.max = end_time;
            
                //plot_options.yaxis.min = min_value;
                // plot_options.yaxis.max = max_value;
                if(end_time - start_time < _this.ONE_DAY) plot_options.xaxis.timeformat = "%H:%M:%S";
                if(end_time - start_time < 10 * _this.ONE_MINUTE) plot_options.xaxis.timeformat = "%H:%M:%S:%s";
                if(end_time - start_time > _this.ONE_DAY) plot_options.xaxis.timeformat = "%d %b %H:%M";
                if(end_time - start_time > _this.ONE_WEEK) plot_options.xaxis.timeformat = "%d %b";
                if(end_time - start_time > _this.ONE_YEAR) plot_options.xaxis.timeformat = "%d %b %y";
            
                plot = $.plot(target_, data_series, plot_options);
                if(start_time < 100)
                {
                    end_time = plot.getAxes().xaxis.datamax;
                    //start_time = plot.getAxes().xaxis.datamin;
                    var timespan = parseTimespan(plot_options.timespan);
                    start_time = end_time - timespan;
                    current_time = end_time;
                }
                if(current_time)
                {
                    for(var s_=0; s_<data_series.length; s_++)
                    {
                        data_index = closestDataPoint(s_, current_time);
                        var item = {series: s_, dataIndex: data_index};
                        highlight(item);
                    }
                }
            }
            // time_target.html(new Date(current_time).toLocaleDateString() + " " + new Date(current_time).toLocaleTimeString());
            time_target.html(new Date(current_time).toGMTString());
            
            _this.onPostDraw();
        }
        
        function parseTimespan(timespan)
        {
            var x = timespan.split(' ')[0];
            var a = timespan.split(' ')[1];
            if (a.substr(-1) == "s") a = a.slice(0,-1);
            var lookup = {"second": _this.ONE_SECOND,
                 "minute": _this.ONE_MINUTE,
                 "hour": _this.ONE_HOUR,
                 "day": _this.ONE_DAY,
                 "week": _this.ONE_WEEK,
                 "month": _this.ONE_MONTH,
                 "year": _this.ONE_YEAR
                 };
            return x * lookup[a];
        }
        
        function updateData()
        {
            for(var d in dataSources)
            {
                f = dataSources[d];
                time_range = end_time - start_time;
                t1 = Math.round(start_time - (time_range / 2));
                t2 = Math.round(end_time + (time_range / 2));
                f(t1,  t2, function(i, data){_this.setData(i, data)});
            }
        }
        
        function update(data, layer)
        {
            if(layer == undefined) layer = 0;
            // this.clear();
            var timeline_data = [];
            for(t in data)
            {
                if(t.substr(0,2) != '__') timeline_data.push({'time': t, 'value': data[t]})
            }
            if(timeline_data.length > 0) this.setData(layer, timeline_data);
        }
        
        function addDataSource(d)
        {
            dataSources.push(d);
        }
        
        function clear(d)
        {
            if(d)
            {
                data[d] = Array();
            }
            else{
                data = Array();
            }
            draw();
        }
        
        function zoomChart(direction)
        {
            // if(timer) timer = clearTimeout(timer);
            // timer = setTimeout(updateData, 500);
            time_range = end_time - start_time;
            start_time += direction * time_range * 0.25;
            end_time -= direction * time_range * 0.25;
            draw();
        }
        
        function highlight(item)
        {
            if(item)
            {
                try{
                    plot.unhighlight(previous_item.series, previous_item.dataIndex);
                }
                catch(e){}
                plot.highlight(item.series, item.dataIndex);
                previous_item = item;
            }
        }
        
        function closestDataPoint(s, t)
        {
            var minDifference = t;
            var minIndex = -1;
            for(var i=0; i < data_series[s].data.length &&  data_series[s].data[i] != null; i++)
            {
                var diff = Math.abs(t - data_series[s].data[i][0]);
                if(diff < minDifference)
                {
                    minDifference = diff;
                    minIndex = i;
                }
            }
            return minIndex;
        }
        
        function setData(series, data_array)
        {
            data_ = [];
            for(var d in data_array)
            {
                var t = dateStringToTimestamp(data_array[d].time);
                data_.push([t, parseFloat(data_array[d].value), data_array[d].time]);
            }
            data_.sort(function(a,b){return a[0] - b[0]});
            data[series] = data_;
            draw();
            draw();
        }
        
        function dateStringToTimestamp(dateString)
        {
            var d = new Date(dateString.replace(/-/g, "/"));
            var offset = d.getTimezoneOffset() * 60000;
            return Math.round(d.getTime()) - offset;
        }
        
        function getData()
        {
            return data;
        }
        
        function getCurrentTime()
        {
            return i2maps.timestampToDateString(current_time);
        }
        function setCurrentTime(time)
        {
            current_time = dateStringToTimestamp(time);
            draw();
            _this.onChangeTime(i2maps.timestampToDateString(current_time));
        }
        
        function getCurrentValue(series)
        {   
            if(series > (data.length - 1))
            {
                return false;
            }
            else
            {
                d = closestDataPoint(series, current_time);
                return data[series][d][1];
            }
        }
        
        function getPlot()
        {
            return plot;
        }
        
        function getPlotOptions()
        {
            return plot_options;
        }
        
        function setPlotOptions(options)
        {
            plot_options = options;
        }
        
        function getTest()
        {
            return test;
        }
        
        function getTimeRange()
        {
            return [start_time, end_time];
        }
        
        function setTimeRange(s,e)
        {
            start_time = s;
            end_time = e;
            draw();
        }
        
        function setDataRange(min, max)
        {
            min_value = min;
            max_value = max;
            draw();
        }
        
        function getDataRange()
        {
            return [plot.getAxes().yaxis.datamin, plot.getAxes().yaxis.datamax];
        }        
      }
    return Timeline;
})();
