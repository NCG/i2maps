import i2maps.datasources
import i2maps.datasets
import i2maps.datasets.raster_cube
import re
import json
import i2maps.settings as settings
from datetime import datetime, timedelta
import dateutil.parser
import django.contrib.gis.geos as geos


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
        self.path = settings.I2MAPS_WORKING_DIRECTORY + 'datasources/example2/'
        filename = self.path + 'ireland_temperature'
        try:
            self.raster_cube = i2maps.datasets.raster_cube.load(filename)
        except Exception, e:
            print(e)
            print("Creating new RasterCube")
            shape = (372, 282, 24*7) #(height, width, num_timesteps)
            envelope = [[7436000.0, 6692000.0], [-1168000.0, -604000.0], [0, 0]] #[[min_y, max_y], [min_x, max_x], [min_t, max_t]]
            self.raster_cube = i2maps.datasets.raster_cube.RasterCube(filename=filename, shape=shape, envelope=envelope)
    
    
    def measurements(self, time=None, window_seconds=1800):
        """
        Returns the list of all sensors with locations and measurements
        available at the time moment time, within a time window of 
        window_seconds.
        """
        # If time is None, we extract the latest time 
        # moment from the database to estimate the two values.
        if time == None:
            time = self.datasource.query("SELECT MAX(time) FROM measurements")[0][0]
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
    
    
    def locations_measurements(self, time, window_seconds):
        time_obj = datetime.strptime(time, "%Y-%m-%d %H:%M:%S")
        from_time = str(time_obj - timedelta(seconds=window_seconds))
        to_time = str(time_obj + timedelta(seconds=window_seconds))
        result = self.datasource.query("""
            SELECT
            sensors.geom,
            sensors.elev,
            measurements.temperature
            FROM measurements, sensors
            WHERE time > '%(from_time)s'
            AND time < '%(to_time)s'
            AND measurements.sensor_id = sensors.id"""% {
                'to_time': to_time, 'from_time': from_time
            })
        locations_measurements = []
        for row in result:
            g = geos.GEOSGeometry(row[0], 4326)
            g.transform('+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs')
            r = [g.x, g.y, row[1], row[2]]
            locations_measurements.append(r)
        return locations_measurements
    
    def sensors(self):
        result = self.datasource.feature_query("SELECT id, name, elev, geom as geometry FROM sensors ORDER BY id")
        return result
    
    def insert_measurements(self, measurements):
        """
        Inserts measurements from a dict
        """
        sensors = dict(map(lambda r: (r[0].lower(), r[1]), self.datasource.query("SELECT name, id FROM sensors")))
        for sensor in measurements:
            sensor_id = sensors.get(sensor, None)
            time = measurements[sensor]['Time']
            if sensor_id:
                results = self.datasource.query("""
                SELECT * FROM measurements 
                WHERE sensor_id = {sensor_id} AND time = '{time}'""".format(sensor_id=sensor_id, time =time))
                if len(results) == 0:
                    query = """INSERT INTO measurements (sensor_id, time, temperature) 
                    VALUES ({sensor_id}, '{time}', {temperature})""".format(
                    sensor_id=sensor_id, 
                    time=time, 
                    temperature=measurements[sensor]['Air Temp'])
                    self.datasource.query(query)
    
    def measurements_timeline(self, sensor_id):
        """
        Returns all the measurements available for a given sensor.
        """
        timeline = self.datasource.feature_query("""SELECT time, temperature
                FROM measurements
                WHERE sensor_id=%d
                ORDER BY time
                """ % int(sensor_id))
        return timeline
    
    def delete_old_measurements(self, td):
         max_time = self.datasource.query("SELECT MAX(time) FROM measurements")[0][0]
         min_time = dateutil.parser.parse(max_time) - td
         self.datasource.query("""DELETE FROM measurements WHERE time < '{min_time}'""".format(min_time=min_time))
    
    def prediction_surface(self, time=None):
        """
        Returns the predicted air temperature surface.
        """
        if not time:
            times = self.raster_cube.times()
            time = times[-1]
        surface = self.raster_cube.surface(time)
        return surface
    
    
    def prediction_timeline(self, geo_x, geo_y):
        """
        Returns the predicted temperature for all time steps at a given
        location.
        """
        timeline = self.raster_cube.timeline(geo_x, geo_y)
        times = sorted(timeline.keys())
        timeline = zip(times, map(timeline.get, times))
        return timeline

