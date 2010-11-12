import i2maps.datasources
import i2maps.datasets
import re
import json
import i2maps.settings as settings


class Example1(i2maps.datasources.Custom):
    """
    Interface between the i2maps JavaScript part and the database backend.
    This class receives the AJAX queries issued in the JavaScript code and
    returns the answer.
    """
    
    
    def __init__(self):
        # Get the example1 datasource.
        self.datasource = i2maps.datasources.new({
            "type": "sqlite",
            "database": "example1/example1.db"
        })
    
    
    def measurements(self):
        """
        Returns the list of all sensors with locations and measurements
        available currently in the database. Note that only the measurements
        for one time moment are stored in the database in this example.
        """
        # The feature_query methods of the datasource object turns a SQL
        # result table into a GeoJSON FeatureCollection.
        return self.datasource.feature_query(
            query="""SELECT 
                    sensors.id AS sensor_id,
                    sensors.name AS name,
                    sensors.geom AS geometry,
                    measurements.time AS time,
                    measurements.temperature AS value,
                    measurements.temperature AS label
                FROM sensors, measurements
                WHERE sensors.id = measurements.sensor_id""", 
            parameters={'source_srs': 4326}
        )
        
        
    def prediction_surface(self):
        """
        Returns the predicted air temperature surface.
        """
        processors_path = settings.I2MAPS_PATH + 'processors/'
        # Read the temperature raster.
        rast = i2maps.datasets.NDimRaster(processors_path + 'example1/irl_temp')
        return rast.tosurface(properties={
            'name': 'predicted_air_temperature',
            'time': '2010-05-10 15:00:00'
        })
        
        
        
