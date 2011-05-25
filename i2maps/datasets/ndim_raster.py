"""
NDimRaster
A N-dimensional Raster dataset is a raster layer with n dimensions stored as a
Numpy memory map in a file.
It creates a .ndrst file and a .ndref world file for storing the spatial (or
spatio-temporal) reference. The .stref file is a JSON dictionary
containing all the necessary meta-information on the .strst data file.
Note that the data file can be very big (really!).
"""

import numpy as np
import json
import os
import shutil
import tempfile



class NDimRaster():

    def __init__(self, path, params={}, mode='r+'):
        """
        Initializes the raster dataset. If the file at the given path does not
        exist, a new file is created automatically. In this case, you can 
        provide the parameters stored in the reference file through the
        params argument. For existing files, you can also provide manually
        the reference parameters.
        """
        if path[-6:] == '.ndrst':
            self.base_path = path[:-6]
        else:
            self.base_path = path
        self.rst_path = self.base_path + '.ndrst'
        self.ref_path = self.base_path + '.ndref'
        # Figure out the reference parameters
        if os.path.exists(self.ref_path):
            fp = open(self.ref_path, 'r')
            ref = fp.read()
            self.ref = json.loads(ref)
            fp.close()
        else:
            # Provide some default parameters
            self.ref = {
                'envelope': [[0.0, 100.0], [0.0, 100.0], [0.0, 2.0]],
                'shape': [100, 100, 2],
                'dtype': 'float32',
                'null': -999.0
            }
        # Overwrite the reference parameters with those provided in the
        # params argument.
        self.ref.update(params)
        # Now let's open the data file.
        self.mode = mode
        if os.path.exists(self.rst_path) == False:
            mode = 'w+'
        self.data = np.memmap(
            filename = self.rst_path,
            dtype = str(self.ref['dtype']) or 'float32',
            mode = mode,
            shape = self.shape
        )
        # Update the reference file if needed
        if os.path.exists(self.ref_path) == False or len(params) > 0:
            fp = open(self.ref_path, 'w')
            fp.write(json.dumps(self.ref))
            fp.close()

    def __del__(self):
        del(self.data)

    def __getitem__(self, idx):
        return self.data[idx]

    def __setitem__(self, idx, val):
        self.data[idx] = val

    @property
    def shape(self):
        return tuple(self.ref['shape'])

    @property
    def ndims(self):
        """
        Returns the number of dimensions.
        """
        return len(self.shape)

    @property
    def resolution(self):
        return tuple([(self.size[i] / self.shape[i]) for i in range(0, self.ndims)])

    @property
    def envelope(self):
        """
        Returns the envelope for this raster. It returns the min,max for
        each dimension as [[minx, maxx], [miny, maxy], [minz, maxz]]
        for the 3-dimensional case.
        """
        return self.ref['envelope']

    @property
    def size(self):
        """
        The size of the raster in real world coordinates for each dimension.
        """
        return tuple([float(self.envelope[i][1] - self.envelope[i][0]) for i in range(0, self.ndims)])
        
    @property
    def nodata(self):
        return (self.ref['null'] or -999.0)
        
    def set_null(self, null):
        self.ref['null'] = null
        
    def resize(self, shape):
        # Check that the number of dimensions is the same.
        if len(shape) != len(self.shape):
            raise Exception("Unable to resize to a different number of dimensions.")
        # Create first a new data file with the new shape.
        tmpdir = tempfile.mkdtemp() + os.sep
        new_data = np.memmap(
            filename = tmpdir + "data",
            dtype = self.ref['dtype'] or 'float32',
            mode = 'w+',
            shape = shape
        )
        # Copy the data
        shape_slice = []
        for i in range(0, len(shape)):
            shape_slice.append(slice(0, min(shape[i], self.shape[i])))
        new_data[tuple(shape_slice)] = self.data[tuple(shape_slice)]
        # Close the data files
        del(self.data)
        del(new_data)
        # Remove the old data file, and move the new one to this location
        os.unlink(self.rst_path)
        shutil.move(src=tmpdir + "data", dst=self.rst_path)
        shutil.rmtree(tmpdir)
        # Update the extent (the envelope)
        res = self.resolution
        new_envelope = self.envelope
        for i in range(0, self.ndims):
            new_envelope[i] = (
                new_envelope[i][0],
                new_envelope[i][0] + shape[i]*res[i]
            )
        self.ref['envelope'] = new_envelope
        # Update the shape parameter
        self.ref['shape'] = shape
        # Open the new data file
        self.data = np.memmap(
            filename = self.rst_path, 
            dtype = self.ref['dtype'] or 'float32',
            mode = self.mode,
            shape = self.shape
        )

    def pixel_to_geo(self, px):
        """
        Converts pixel coordinates to geographic space coordinates.
        Returns the coordinate at the centre of the pixel.
        """
        geo = []
        for i in range(0, min(self.ndims, len(px))):
            geo.append(((float(px[i]) + 0.5) * self.resolution[i]) + 
                self.envelope[i][0]
            )
        return tuple(geo)

    def geo_to_pixel(self, geo):
        """
        Converts real-world coordinates to pixel coordinates.
        """
        px = []
        for i in range(0, min(self.ndims, len(geo))):
            px.append(int(np.floor((geo[i] - self.envelope[i][0]) /
                self.resolution[i]))
            )
        return tuple(px)
 
    def value_at(self, coord):
        """
        Returns the pixel value at the provided coordinate.
        """
        return self[self.geo_to_pixel(coord)]
        
        
    def set_value_at(self, coord, value):
        """
        Sets the value at the provided coordinate.
        """
        self[self.geo_to_pixel(coord)] = value
        
        
    def tosurface(self, dims=['*','*'], properties={}):
        """
        Returns two dimensions of this raster as a surface.
        By default, the two first dimensions are returned, and for all
        other dimensions the first slice.
        For specifying the dimensions to retrieve, you need to pass '*' in
        the dims list at the corresponding position. For example, if you 
        would like to get the first two dimensions in a 3D raster, but
        you want the 5th slice (this is the 5th level of pixels from the
        bottom, level 5 is at index 4), you would need to write:
        ['*', '*', 4].
        You can also provide additional properties that are going to be
        inserted into the surface.
        """
        # Prepare the dimensions to retrieve. We need to be careful with
        # the y dimension of our surface, because the coordinates are 
        # inversed there.
        # Retrieve first which are our first and second dimension to retrieve.
        dim1 = 0
        dim2 = 1
        dimcnt = 0
        for idx in range(0, len(dims)):
            if dims[idx] == '*':
                if dimcnt == 0:
                    dim1 = idx
                    dimcnt += 1
                elif dimcnt == 1:
                    dim2 = idx
                    dimcnt += 1
                else:
                    raise Exception(
                        "Error. tosurface is limited to 2 dimensions."
                    )
        # Now, we prepare the slices for each dimension.
        slices = []
        for i in range(0, self.ndims):
            if i < len(dims):
                if i == dim1:
                    slices.append(slice(0, self.shape[i]))
                elif i == dim2:
                    slices.append('')
                else:
                    slices.append(int(dims[i]))
            else:
                slices.append(0)
        values = []
        # Because the y dimension in our surface is inversed, we need to 
        # go backwards through our second dimension.
        for j in range(self.shape[dim2]-1, -1, -1):
            slices[dim2] = j
            values.append(self.data[slices].tolist())
        # Now we start building the feature collection for the surface.
        # We start with the bounding box polygon.
        west = self.envelope[dim1][0]
        east = self.envelope[dim1][1]
        north = self.envelope[dim2][1]
        south = self.envelope[dim2][0]
        bbox = {
            "type": "Polygon", 
            "coordinates": [[
                [west, south], 
                [west, north], 
                [east, north], 
                [east, south], 
                [west, south]
            ]]
        }
        # We can now complete the surface and return it.
        surf = {
            'type': 'FeatureCollection',
            'features': [{
                'geometry': bbox,
                'type': 'Feature',
                'properties': {
                    'values': values
                }
            }],
            'properties': {
                'count': 1
            }
        }
        for key in properties:
            surf['features'][0]['properties'][key] = properties[key]
        return surf
        
        
        
        
def grass_ascii_to_raster(grass_raster, ndim_raster_path, dtype=None):
    """
    Reads a GRASS ASCII Raster file into a NDimRaster.
    You can overwrite the type settings from the header.
    """
    in_file = open(grass_raster, 'r')
    # First read all the header lines. The header is organised as
    # keyword: value.
    finfo = {}
    header = True
    while header:
        line = in_file.readline().strip()
        prop = line.split(':')
        if len(prop) < 2:
            header = False
        else:
            # Store the property inside our fileinfo dictionary
            finfo[prop[0].strip()] = prop[1].strip()
    # Get the type of data (can be int, or float)
    if dtype == None:
        ftype = 'float32'
        if finfo.has_key('type') and finfo['type'] == 'int':
            ftype = 'int32'
    else:
        ftype = dtype
    # Define the no data value. GRASS default is * and it is not
    # necessarily defined in the header.
    grass_nodata = '*'
    if finfo.has_key('null'):
        grass_nodata = finfo['null'].strip()
    try:
        nodata = float(grass_nodata)
    except:
        nodata = -999.0
    ndrast = NDimRaster(
        path = ndim_raster_path,
        params = {
            'envelope': [
                [float(finfo['west']), float(finfo['east'])],
                [float(finfo['south']), float(finfo['north'])]
            ],
            'shape': [int(finfo['cols']), int(finfo['rows'])],
            'dtype': ftype,
            'null': nodata
        }
    )
    # Read the GRASS ASCII data and copy it into our raster.
    # The GRASS ASCII raster starts at the NW corner. Our coordinate system
    # has its origin at the SW corner. So start filling up from down.
    j = int(finfo['rows']) - 1
    while line:
        # Separate the line in all values
        pixels = line.strip().split(' ')
        # Iterate through all pixels
        i = 0
        for p in pixels:
            if p == grass_nodata:
                ndrast[i,j] = nodata
            else:
                ndrast[i,j] = p
            i += 1
        # Read the next line
        line = in_file.readline()
        # Write the next line
        j -= 1
    in_file.close()
    return ndrast
    

