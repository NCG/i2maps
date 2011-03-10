#!/bin/env python


import numpy as np
import os
import i2maps.contrib.krls
import i2maps.datasources
import i2maps.datasets
from i2maps.datasets import spatial_array
import i2maps.settings as settings
import django.contrib.gis.geos as geos
from datetime import datetime, timedelta



class TemperatureModeller():
    """
    A simple temperature modeller for our Irish weather example.
    It takes the data from the sensors (coordinates, elevation, temperature)
    to learn a Kernel Least Squares Regression, and predicts the temperature
    at all points of a DEM provided as a GRASS ASCII file.
    """
    
    
    def __init__(self, dict_size=100,  ald_thresh=0.01, 
        adaptive=True, forget_rate=0.0):
        """
        Initializes the temperature modeller.
        """
        self.maxsize = dict_size
        self.ald_thresh = ald_thresh
        self.adaptive = adaptive
        self.forget_rate = forget_rate
        
    def learn(self, measurements):
        """
        Trains the model using the provided data and targets.
        data is a NxM sized numpy matrix where N is the number of data points,
        and M the number of features.
        targets is a Nx1 sized numpy matrix with the N expected outcomes.
        """
        measurements = np.array(measurements)
        data = measurements[:,0:3]
        targets = measurements[:,3]
        # Rescale the data and targets between 0 and 1
        data = np.array(data)
        pts, dims = data.shape
        
        # Initialize the KRLS algorithm
        self.kp = i2maps.contrib.krls.KRLS(
            kernel=i2maps.contrib.krls.Gaussian(np.array([70000, 70000, 455.5])), 
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
        
        
    def predict(self):
        """
        Reads the DEM grid (in i2maps raster format) at dem_path, and writes
        the predicted grid to result_path as a i2maps raster.
        result_path is an existing 3-dimensional raster, where z gives
        the third dimension
        """
        # Open the DEM and the temperature rasters
        path = settings.I2MAPS_WORKING_DIRECTORY + 'datasources/example2/'
        dem = spatial_array.load(path + 'dem')
        # Loop through all pixels in the DEM raster, query our model,
        # and set the new value in the temperature raster.
        points = np.zeros((dem.shape[0]*dem.shape[1], 3))
        idx = 0
        for i in range(0, dem.shape[0]):
            for j in range(0, dem.shape[1]):
                y, x = dem.pixel_to_spatial((i,j))
                z = dem[i,j]
                points[idx] = np.array([x,y,z])
                idx +=1
        predicted = self.kp.query(points).reshape(dem.shape)
        predicted[dem == dem.nodata] = dem.nodata
        predicted_spatial_array = spatial_array.SpatialArray(predicted, dem.envelope)
        return predicted_spatial_array