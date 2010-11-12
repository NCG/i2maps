#!/bin/env python


import numpy as np
import os
import i2maps.contrib.krls
import i2maps.datasources
import i2maps.datasets
import django.contrib.gis.geos as geos
from datetime import datetime, timedelta



class TemperatureModeller():
    """
    A simple temperature modeller for our Irish weather example.
    It takes the data from the sensors (coordinates, elevation, temperature)
    to learn a Kernel Least Squares Regression, and predicts the temperature
    at all points of a DEM provided as a GRASS ASCII file.
    """
    
    
    def __init__(self, kernel, dict_size=15,  ald_thresh=0.25, 
        adaptive=True, forget_rate=0.0):
        """
        Initializes the temperature modeller.
        """
        self.kernel = kernel
        self.maxsize = dict_size
        self.ald_thresh = ald_thresh
        self.adaptive = adaptive
        self.forget_rate = forget_rate
        
    def learn(self, datasource, from_time, to_time):
        """
        Trains the model using the provided data and targets.
        data is a NxM sized numpy matrix where N is the number of data points,
        and M the number of features.
        targets is a Nx1 sized numpy matrix with the N expected outcomes.
        """
        data = []
        targets = []
        # Execute the query; gives back an array with all results
        rows = datasource.query("""
            SELECT geom, elev, temperature
            FROM measurements, sensors
            WHERE measurements.sensor_id = sensors.id
            AND measurements.time > '%s'
            AND measurements.time < '%s'
        """ % (from_time, to_time))
        # Treat each row separately
        for row in rows:
            # The first element in the row is the point in WKT format
            # (e.g. 'POINT(-7.5 52.2)') and SRID 4326 (WGS84)
            # We need to project the point into SRID 900913 and extract
            # the coordinates
            geometry = geos.GEOSGeometry(row[0], 4326)
            # Project to SRID 900913
            geometry.transform('+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs')
            # We have now the coordinates of our point in the right SRS
            # We can insert a new row with x-coordinate, y-coordinate and
            # elevation in the data array, and the temperature into the target 
            # array.
            data.append([geometry.x, geometry.y, float(row[1])])
            targets.append([row[2]])
            
        # Rescale the data and targets between 0 and 1
        data = np.array(data)
        self.data_min = []
        self.data_max = []
        pts, dims = data.shape
        for i in range(0, dims):
            self.data_min.append(np.min(data[:,i]))
            self.data_max.append(np.max(data[:,i]))
            data[:,i] = (data[:,i] - self.data_min[i]) / (self.data_max[i] - self.data_min[i])
        targets = np.array(targets)
        self.target_min = np.min(targets)
        self.target_max = np.max(targets)
        targets = (targets - self.target_min) / (self.target_max - self.target_min)
        
        # Initialize the KRLS algorithm
        self.kp = i2maps.contrib.krls.KRLS(
            kernel=self.kernel, 
            adopt_thresh=self.ald_thresh,
            state=data[0,:],
            target=targets[0],
            maxsize=self.maxsize,
            adaptive=self.adaptive,
            forget_rate=self.forget_rate
        )
        # Learn the model (sample by sample)
        for i in range(1, len(data)):
            self.kp.update(np.array(data[i,:]), np.array(targets[i]))
        
        
    def predict(self, dem_path, result_path, level):
        """
        Reads the DEM grid (in i2maps raster format) at dem_path, and writes
        the predicted grid to result_path as a i2maps raster.
        result_path is an existing 3-dimensional raster, where z gives
        the third dimension
        """
        # Open the DEM and the temperature rasters
        dem = i2maps.datasets.NDimRaster(dem_path)
        predicted = i2maps.datasets.NDimRaster(result_path)
        # Loop through all pixels in the DEM raster, query our model,
        # and set the new value in the temperature raster.
        for i in range(0, dem.shape[0]):
            for j in range(0, dem.shape[1]):
                coord = dem.pixel_to_geo((i,j))
                x = (coord[0] - self.data_min[0]) / (self.data_max[0] - self.data_min[0])
                y = (coord[1] - self.data_min[1]) / (self.data_max[1] - self.data_min[1])
                z = (dem[i,j] - self.data_min[2]) / (self.data_max[2] - self.data_min[2])
                if dem[i,j] == dem.nodata:
                    predicted[i,j,level] = predicted.nodata
                else:
                    t = self.kp.query([x, y, z])[0,0]
                    t = t * (self.target_max - self.target_min) + self.target_min
                    predicted[i,j,level] = t
            if not i % 10:
                print("Column %d completed"  % i)


def main():
    datasource = i2maps.datasources.get('example2').datasource
    # Find out how many time steps we should estimate
    # (we make one estimate per hour, with a time window of +/- 30 minutes).
    # We store the time steps in a dictionary that we are going to write
    # to the temperature raster reference file.
    row = datasource.query("SELECT MIN(time), MAX(time) FROM measurements")[0]
    mindate = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
    maxdate = datetime.strptime(row[1], "%Y-%m-%d %H:%M:%S")
    # Round the dates to a complete hour
    if mindate.minute < 30:
        mindate -= timedelta(seconds=mindate.minute*60)
    else:
        mindate += timedelta(seconds=(60-mindate.minute)*60)
    if maxdate.minute > 30:
        maxdate += timedelta(seconds=(60-maxdate.minute)*60)
    else:
        maxdate -= timedelta(seconds=maxdate.minute*60)
    # Build an array with all time steps
    tsteps = []
    current_date = mindate
    while current_date < maxdate:
        tsteps.append(current_date)
        current_date += timedelta(seconds=3600)
    # We create now the result raster file
    # We build the file reference based on the DEM reference
    dem_path = 'irl_dem'
    result_path = 'irl_temp'
    dem = i2maps.datasets.NDimRaster(dem_path)
    ref = dem.ref.copy()
    ref['dtype'] = 'float32'
    ref['shape'].append(len(tsteps))
    ref['envelope'].append([0, len(tsteps)])
    ref['tsteps'] = map(str, tsteps)
    # Create the raster and close it again
    predicted_rast = i2maps.datasets.NDimRaster(result_path, params=ref)
    del(predicted_rast)
    # We now start the prediction process
    # First, we create a kernel that we are going to use for all predictions
    kernel = i2maps.contrib.krls.Gaussian(sigma=0.5)
    # Make a model for each time step
    for i in range(0, len(tsteps)):
        print("Computing the prediction for %s..." % str(tsteps[i]))
        model = TemperatureModeller(kernel=kernel)
        model.learn(
            datasource = datasource,
            from_time = str(tsteps[i] - timedelta(seconds=1800)), 
            to_time = str(tsteps[i] + timedelta(seconds=1800))
        )
        model.predict(
            dem_path = 'irl_dem',
            result_path = 'irl_temp',
            level = i
        )
        del(model)
    
    

if __name__ == '__main__':
    main()
    
    
    