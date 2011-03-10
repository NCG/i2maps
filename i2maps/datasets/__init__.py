from .feature_dataset import FeatureDataset
from .ndim_raster import NDimRaster
# from .raster_cube import Raster_cube
import i2maps.settings as settings
import json

def get(config):
	"""
	Returns a new Feature Dataset of the provided type, id and datasource.
	"""
	return {
		'feature_dataset': FeatureDataset,
		'ndim_raster': NDimRaster
	}.get(config['type'], fail)(config['id'], config['datasource'])


def fail(config):
    raise Exception, "No dataset connector available of type " + config['type']