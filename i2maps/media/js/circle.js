(function($) {
    function Circle(target_, data_, options_) {
        options = options_ || {};
        target = target_,
        // dedicated to storing data for buggy standard compliance cases
        workarounds = {};
        
        this.onChangeTime = function(){};
        this.setTime = setCurrentTime;
        
        var context, context2, canvas, canvas2, status, slider, dynamic_color;
        var data;
        var min = 0;
        var max = 0;
        var min_date, max_date;
        var start_month;
        var end_month;
        var start_day;
        var x;
        var y;
        var z = options.z || 4;
        var months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var url = "temperature.txt";
        var intervals = options.intervals || 24;
        var num_days = options.num_days || 40;
        var current_time;
        
        this.draw = main;
        
        data = data_;
        // initialize
        init();
        
        function init()
        {
            target.html('');
            canvas2 = $('<canvas width="25" height="430"></canvas>').appendTo(target).get(0);
            canvas = $('<canvas width="450" height="430"></canvas>').appendTo(target).get(0);
            dynamic_color = $('<span style="display: none;"><br/>Dynamic Color Range? <input name="dynamic_color" type="checkbox"/></span>').appendTo(target);
            status = $('<div id="status"></div>').appendTo(target);
            slider = $('<div id="slider" style="width: 450px"></div>').appendTo(target);
            
            $(canvas).mousemove(function(e){
                test = e;
                var x1 = e.clientX - $(canvas).offset().left;
                var y1 = e.clientY - $(canvas).offset().top;

                ans = getTimeAndValue(x1, y1);
                status.html("Time: " + ans.time + " Value: " + ans.value);
                // main();
            });
            $(canvas).click(function(e){
                var x1 = e.clientX - $(canvas).offset().left;
                var y1 = e.clientY - $(canvas).offset().top;
                ans = getTimeAndValue(x1, y1);
                circle.onChangeTime(ans.timestamp * 60000);
                current_time = ans.timestamp;
                main();
            });
            for(i=0; i < data.length; i++)
             {
                 data[i].timestamp = dateStringToTimestamp(data[i].time);
                 data[i].value = data[i].value * 1.0;
             }
             max_time = data[0].timestamp;
             min_time = data[data.length-1].timestamp;
             slider.slider({
                 min: min_time - (1440 * 5),
                 max: max_time + (1440 * 5),
                 orientation: 'horizontal',
                 value: max_time,
                 step: 60,
                 slide: function(event, ui) {
                     max_time = ui.value;
                     main();
                 }
             });
             current_time = max_time;
             main();
        }
        
        function main()
        {      
          min = 0;
          max = 0;
          min_time = max_time - (60 * 24 * num_days);
          min_time = (min_time - (min_time % (24*60)));
          for(i=0; i < data.length; i++)
          {
             if((data[i].timestamp > min_time && data[i].timestamp < max_time) || !dynamic_color.is(":checked"))
             {
                 if(data[i].value < min) min = data[i].value;
                 if(data[i].value > max) max = data[i].value;
             }
          }
        if (canvas2.getContext){
            context2 = canvas2.getContext('2d');
            context2.clearRect(0,0,canvas2.width, canvas2.height);
            var colormapData = context2.getImageData(0, 0, canvas2.width, canvas2.height);
            for (var x1 = 0; x1 < colormapData.width; x1++)  {
            for (var y1 = 0; y1 < colormapData.height; y1++)  {
                var idx = (x1 + y1 * canvas2.width) * 4;
                c = getColor(canvas2.height - y1, 1, canvas2.height);
                colormapData.data[idx + 0] = c[0];
                colormapData.data[idx + 1] = c[1];
                colormapData.data[idx + 2] = c[2];
                colormapData.data[idx + 3] = 255;
            }   
              }
            context2.putImageData(colormapData, 0, 0);
            context2.fillStyle = '#000';
            context2.font = 'normal 10px sans-serif';
            context2.textBaseline = 'top';
            context2.fillText(max, 2, 2);
            context2.fillText(min, 2, canvas2.height-14);
        }
        if (canvas.getContext){
                x = canvas.width / 2;
                y = canvas.height / 2;
                context = canvas.getContext('2d');
                context.clearRect(0,0,canvas.width, canvas.height);
                context.fillStyle   = '#00f';
                context.strokeStyle = '#f00';
                context.lineWidth = z;
                for(i=0; i < data.length; i++)
                {
                    time = data[i].timestamp;
                    if(time > min_time && time < max_time)
                    {
                        v = data[i]['value'];
                        c = getColor(v, min, max);
                        color = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
                        r = getRadius(time);
                        d = getDegrees(time);
                        context.strokeStyle = color;
                        context.beginPath();
                        context.arc(x, y, r, radians(d), radians(d + 360/intervals), false);
                        context.stroke();
                        context.closePath();
                    }
                }
                context.fillStyle = '#aaa';
                context.font = 'bold 12px sans-serif';
                context.textBaseline = 'bottom';
                context.lineWidth   = 2;
                context.strokeStyle = '#aaa';
                for(m=start_month; m < end_month; m++)
                {
                    context.beginPath();
                    r = ((m - start_month + 1) * 31 * z);
                    context.arc(x, y, r, radians(0), radians(360), false);
                    context.stroke();
                    context.closePath();
                    x1 = x + r*Math.cos(radians(0));
                    y1 = y + r*Math.sin(radians(0));
                    context.fillText(months[m], x1, y1);   
                }
                context.strokeStyle = '#aaa';
                context.lineWidth   = 1;
                context.fillStyle = '#aaa';
                for(i=0; i < 24; i++)
                {
                    context.beginPath();
                    context.moveTo(x,y);
                    start_hour = ((min_time % (24*60))) / 60;
                    d = (i - start_hour) * 15;
                    r = (num_days + 1) * z + 30;
                    if(r < 200) r = 200;
                    x1 = x + r*Math.cos(radians(d));
                    y1 = y + r*Math.sin(radians(d));
                    context.lineTo(x1, y1);
                    context.stroke();
                    context.closePath();
                    context.fillText(i + ":00", x1, y1);
                    context.strokeStyle = '#eee';
                }
                context.strokeStyle = '#eee';
                context.lineWidth   = 2;
                context.beginPath();
                r = (num_days + 1) * z;
                context.arc(x, y, r, radians(0), radians(360), false);
                context.stroke();
                context.closePath();
                context.strokeStyle = '#f00';
                context.lineWidth   = 1;
                if(current_time > min_time)
                {
                    r =  getRadius(current_time);
                    d =  getDegrees(current_time);
                    context.beginPath();
                    context.arc(x, y, r+1, radians(d), radians(d+(360/intervals)), false);
                    context.stroke();
                    context.closePath();
                    context.beginPath();
                    context.arc(x, y, (r-z)+1, radians(d), radians(d+(360/intervals)), false);
                    context.stroke();
                    context.closePath();
                }
          }
        }
        function getColor(value, min, max)
        {
              var r = 0;
              var g = 0;
              var b = 0;
              var v = 1 - (value - min) * (1 / (max - min));
              if(v < 0.33)
              {
                  r = 208;
                  g = 131 + ((208-131) * v/0.33);
                  b = 131;
              }
              else if(v >= 0.33 && v < 0.66)
              {
                  r = 208 - ((208-131) * (v-0.33)/0.33);
                  g = 208
                  b = 131 + ((208-131) * (v-0.33)/0.33);
              }
              else //if(v >= 0.66)
              {
                  r = 131;
                  g = 208 - ((208-131) * (v-0.66)/0.33);
                  b = 208;
              }
              r = Math.floor(r);
              g = Math.floor(g);
              b = Math.floor(b);
              return [r,g,b];
        }
        function radians(degrees)
        {
            return (Math.PI/180) * (degrees - 90);
        }
        function degrees(radians)
        {
            return ((180/Math.PI) * radians);
        }
        function dateStringToTimestamp(dateString)
        {
            var d = new Date((dateString + " GMT").replace(/-/g, "/"));
            return Math.round(d.getTime())  / 60000;
        }
        function timestampToDateString(time){
            d = new Date(time);
            time = d.toUTCString().substr(16,9);
            return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + ' ' + time;
        }
        function getRadius(time)
        {
            time_diff = time - min_time;
            days = Math.floor(time_diff / (24*60));
            hours = Math.floor((time_diff - (days*24*60)) / 60);
            minutes = Math.floor(time_diff - ((days*24*60) + (hours * 60)));
            minutes = minutes - Math.floor(minutes % (1440/intervals));
            return Math.floor((days*z) + (hours / 24 * z));
        }
        function getDegrees(time)
        {
            time_diff = time - min_time;
            days = Math.floor(time_diff / (24*60));
            hours = Math.floor((time_diff - (days*24*60)) / 60);
            minutes = Math.floor(time_diff - ((days*24*60) + (hours * 60)));
            minutes = minutes - Math.floor(minutes % (1440/intervals));
            return Math.floor(hours * 15 + minutes/4);
        }
        function getTimeAndValue(x1, y1)
        {
            var r0 = Math.sqrt((x - x1)*(x - x1) + (y - y1)*(y - y1));
            x0 = x;
            y0 = Math.floor(y - r0);
            d = degrees(Math.acos(((x0 - x)*(x1 - x) + (y0 - y)*(y1 - y)) / (Math.sqrt((x0 - x)*(x0 - x) + (y0 - y)*(y0 - y)) * Math.sqrt((x1 - x)*(x1 - x) + (y1 - y)*(y1 - y)))));
            if(x1 < x) d = (d * -1) + 360;
            var d0 = d - (d % (360/intervals));
            // current_time = min_time + (Math.floor(r0 / z) * 60 * 24) + (d/15)*60;
            r0 = r0 - (r0 % z);
            for(i=0; i < data.length; i++)
            {
               r1 = getRadius(data[i].timestamp);
               r1 = r1 - (r1 % z);
               d1 = getDegrees(data[i].timestamp);
               if(r1 == Math.floor(r0) && d1 == Math.floor(d0))
               {
                   return data[i];
               }
            }
            return {time: "", value: 0};
        }
        function setCurrentTime(time)
        {
            time = time / 60000;
            if(time < min_time || time > max_time)
            {
                max_time = time;
            }
            current_time = time;
            main();
        }
        
      }
    
    $.circle = function(target, data, options) {
         var circle = new Circle(target, data, options);
         return circle;
    }
})(jQuery);