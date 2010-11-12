import i2maps.datasources
import i2maps.datasets
import re
import json
import i2maps.settings as settings
from datetime import datetime, timedelta


class Example2(i2maps.datasources.Custom):
    """
    Interface between the i2maps JavaScript part and the database backend.
    This class receives the AJAX queries issued in the JavaScript code and
    returns the answer.
    """
    
    
    def __init__(self):
        # Get the example1 datasource.
        self.datasource = i2maps.datasources.new({
            "type": "sqlite",
            "database": "example2/example2.db"
        })
    
    
    def measurements(self, time=None, window_seconds=1800):
        """
        Returns the list of all sensors with locations and measurements
        available at the time moment time, within a time window of 
        window_seconds.
        """
        # If time is None, we extract the latest time 
        # moment from the database to estimate the two values.
        if time == None:
            cur = self.datasource.connection.cursor()
            cur.execute("SELECT MAX(time) FROM measurements")
            row = cur.fetchone()
            cur.close()
            time = row[0]
            time_obj = datetime.strptime(time, "%Y-%m-%d %H:%M:%S")
        else:
            time_obj = datetime.strptime(time, "%Y-%m-%d %H:%M:%S")
        time = str(time_obj)
        from_time = str(time_obj - timedelta(seconds=window_seconds))
        to_time = str(time_obj + timedelta(seconds=window_seconds))
        # The feature_query methods of the datasource object turns a SQL
        # result table into a GeoJSON FeatureCollection.
        # This SQL query selects the measurement that is closest to the 
        # requested time, but within a given time window.
        return self.datasource.feature_query(
            query="""SELECT 
                sensors.id AS sensor_id,
                sensors.name AS name,
                sensors.geom AS geometry,
                M.time AS time,
                M.temperature AS value,
                M.temperature AS label
            FROM sensors, 
                (SELECT 
                    id, 
                    sensor_id, 
                    MIN(strftime('%%s', '%(time)s') - strftime('%%s',time)) AS timedelta, 
                    time, 
                    temperature
                FROM measurements
                WHERE time > '%(from_time)s'
                AND time < '%(to_time)s'
                GROUP BY sensor_id) AS M
            WHERE sensors.id = M.sensor_id""" % {
                'time': time, 'to_time': to_time, 'from_time': from_time
            }, 
            parameters={'source_srs': 4326}
        )
        
        
    def measurements_timeline(self, sensor_id):
        """
        Returns all the measurements available for a given sensor.
        """
        return self.datasource.feature_query(
            query="""SELECT time, temperature
                FROM measurements
                WHERE sensor_id=%d
                ORDER BY time""" % int(sensor_id)
        )
        
        
    def prediction_surface(self, time=None):
        """
        Returns the predicted air temperature surface.
        """
        processors_path = settings.I2MAPS_PATH + 'processors/'
        rast = i2maps.datasets.NDimRaster(processors_path + 'example2/irl_temp')
        # Read the temperature raster for the required time step.
        tsteps = rast.ref['tsteps']
        if time == None:
            time = tsteps[-1]
            z = len(tsteps) - 1
        else:
            time_obj = datetime.strptime(time, "%Y-%m-%d %H:%M:%S")
            # Round the time to 1 hour
            if time_obj.minute < 30:
                time_obj -= timedelta(seconds=time_obj.minute*60)
            else:
                time_obj += timedelta(seconds=(60-time_obj.minute)*60)
            print "time_obj: ", str(time_obj)
            z = tsteps.index(str(time_obj))
        return rast.tosurface(dims=['*','*',z],
            properties={
            'name': 'predicted_air_temperature',
            'time': time
        })
        
        
    def prediction_timeline(self, x, y):
        """
        Returns the predicted temperature for all time steps at a given
        location.
        """
        processors_path = settings.I2MAPS_PATH + 'processors/'
        rast = i2maps.datasets.NDimRaster(processors_path + 'example2/irl_temp')
        tsteps = rast.ref['tsteps']
        # Convert the x and y coordinates to pixel coordinates
        px, py = rast.geo_to_pixel((x, y))
        values = rast[px,py,:].tolist()
        response = []
        for i in range(0, len(values)):
            response.append({
                'time': rast.ref['tsteps'][i], 
                'value': values[i]
            })
        return {'data': response}
        
