"""
FeatureDataset
A FeatureDataset is a collection of Features, that might have or not
geometries associated. It is stored in one or two database tables. The 
FeatureDataset itself does not contain any data, everything is loaded directly
from the database.
"""

# Shapely is needed for converting and handling the geometries.
# However, without Shapely, it is still possible to extract information.
try:
	import shapely.geometry
	import shapely.wkb
	import shapely.wkt
except:
    # print "Shapely package is not installed."
    # print "You will not be able to import or modify geometries."
    # print "More about Shapely: http://trac.gispython.org/lab/wiki/Shapely"
    pass

import json

# GeoJSON is only needed for the import_geojson method.
try: 
	import geojson
except:
	print "GeoJSON package is not installed."
	print "You will be unable to import geometries from a GeoJSON file."
	
import re
import i2maps.datasources




class FeatureDataset():
	
	
	def __init__(self, fdid, datasource):
		"""
		Initializes the FeatureDataset. If no parameter is provided, a new 
		empty dataset is created.
		@paramaters
			datasource		The datasource this FeatureDataset is contained in
		"""
		
		self.fdid = fdid
		self.datasource = datasource
		
		# Create the database structure if needed.
		if self.datasource.has_table(self.fdid) == False:
			self.create_db()
			
			
			
	def __len__(self):
		"""
		Returns the numbers of features in this dataset.
		"""
		cur = self.datasource.connection.cursor()
		res = cur.execute(
			"""SELECT COUNT(*) FROM (SELECT fid FROM %s GROUP BY fid)""" 
			% self.fdid
		)
		row = res.fetchone()
		cur.close()
		return row[0]
		
		
			
	def create_db(self):
		"""
		Create the database structure for this dataset.
		"""
		
		cur = self.datasource.connection.cursor()
		res = cur.execute("""
			CREATE TABLE %(fdid)s (
				rowid INTEGER PRIMARY KEY AUTOINCREMENT,
				fid VARCHAR(255),
				t DATETIME
			)
		""" % {'fdid': self.fdid})
		
		# Create a few indexes
		res = cur.execute("""CREATE INDEX %(fdid)s_fid 
			ON %(fdid)s (fid)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s_t 
			ON %(fdid)s (t)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE UNIQUE INDEX %(fdid)s_fid_t 
			ON %(fdid)s (fid, t)""" % {'fdid': self.fdid})
			
		# Create the geometry table.
		res = cur.execute("""
			CREATE TABLE %(fdid)s__geometries (
				geomid INTEGER PRIMARY KEY AUTOINCREMENT,
				fid VARCHAR(255),
				t DATETIME, space VARCHAR(60) DEFAULT 'orig',
				generalization INTEGER DEFAULT 0,
				geom GEOMETRY, geom_json TEXT,
				xmin DOUBLE, xmax DOUBLE, ymin DOUBLE, ymax DOUBLE
			)""" % {'fdid': self.fdid})
			
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_fid 
			ON %(fdid)s__geometries (fid)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_t 
			ON %(fdid)s__geometries (t)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX 
			%(fdid)s__geometries_space ON %(fdid)s__geometries (space)""" % 
			{'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_xmin 
			ON %(fdid)s__geometries (xmin)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_xmax 
			ON %(fdid)s__geometries (xmax)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_ymin 
			ON %(fdid)s__geometries (ymin)""" % {'fdid': self.fdid})
		res = cur.execute("""CREATE INDEX %(fdid)s__geometries_ymax 
			ON %(fdid)s__geometries (ymax)""" % {'fdid': self.fdid})
			
		# Create the info table
		res = cur.execute("""CREATE TABLE %(fdid)s__info (
			key VARCHAR(100) PRIMARY KEY,
			value TEXT
		)""" % {'fdid': self.fdid})
		
		self.datasource.connection.commit()
		cur.close()
		
		
		
	def get(self, operation, options={}):
		"""
		Implements the Complex Vector Web Service protocol.
		"""
		op = {
			'getinfo': 'info',
			'getgeometrylist': 'geometry_list',
			'getgeometries': 'geometries',
			'getattributes': 'attributes',
			'gettimeseries': 'time_series'
		}[operation.lower()]
		return getattr(self, op)(options)
		
		
		
	def info(self, options):
		"""
		Describes the structure of this dataset.
		"""
		cur = self.datasource.connection.cursor()
		info = {
			'id': self.fdid,
			'name': self.name(),
			'features': self.feature_list(),
			'attributes': self.attribute_list(),
			'timeSpan': self.time_span(),
			'spaces': []
		}
		spaces = self.spaces()
		for space in spaces:
			res = cur.execute("""SELECT MIN(xmin), MAX(xmax), MIN(ymin), 
				MAX(ymax) FROM %(fdid)s__geometries WHERE 
				space='%(space)s'""" % {'fdid': self.fdid, 'space': space})
			r = res.fetchone()
			env = {'xmin': r[0], 'xmax': r[1], 'ymin': r[2], 'ymax': r[3]}
			res = cur.execute("""SELECT t, generalization 
					FROM  %(fdid)s__geometries WHERE space='%(space)s' 
					GROUP BY t, generalization""" % 
					{'fdid': self.fdid, 'space': space})
			time_generalizations = {}
			for row in res:
				if time_generalizations.has_key(row[0]) == False:
					time_generalizations[row[0]] = []
				time_generalizations[row[0]].append(row[1])
			geoms = []
			for t,gs in time_generalizations.items():
				geoms.append({
					'timeStep': t,
					'generalizations': ','.join(map(str, gs))
				})
			info['spaces'].append({
				'id': space,
				'envelope': env,
				'availableGeometries': geoms
			})
		cur.close()
		return info
		
		
	def geometry_list(self, options):
		"""
		Returns a list of all geometries for a given time moment, space and
		generalization level. The list contains the geometry ID, the feature
		ID of the parent feature, and the bounding box. It does not contain
		the geometry itself.
		"""
		cur = self.datasource.connection.cursor()
		geoms = {
			'id': self.fdid,
			'time': options['time'],
			'space': options['space'],
			'generalization': options['generalization'],
			'geometries': [],
		}
		res = cur.execute("""SELECT geomid, fid, xmin, xmax, ymin, ymax 
				FROM %(fdid)s__geometries WHERE space='%(space)s' 
				AND generalization=%(generalization)s AND t='%(time)s'""" % 
				{'fdid': self.fdid, 'space': options['space'], 
				'generalization': options['generalization'], 
				'time': options['time']})
		for row in res:
			geoms['geometries'].append({
				'id': row[0], 
				'feature': row[1], 
				'envelope': {
					'xmin': row[2],
					'xmax': row[3], 
					'ymin': row[4], 
					'ymax': row[5]
				}
			})
		cur.close()
		return geoms
		
		
	def geometries(self, options):
		"""
		Returns the requested geometries for a given time moment, space and
		generalization level. The feature IDs of the geometries might be
		specified optionally.
		"""
		cur = self.datasource.connection.cursor()
		geoms = {
			'id': self.fdid,
			'time': options['time'],
			'space': options['space'],
			'generalization': options['generalization'],
			'geometries': {},
		}
		feats_sql = ''
		if options.has_key('features') and options['features'] != '':
			try:
				features = options['features'].split(',')
			except:
				features = options['features']
			feat_list = "'" + "','".join(map(str, features)) + "'"
			feats_sql = " AND fid IN (%s) " % feat_list
		res = cur.execute("""SELECT fid, geom_json 
			FROM %(fdid)s__geometries WHERE space='%(space)s' 
			AND generalization=%(generalization)s AND t='%(time)s' 
			%(features)s""" % {'fdid': self.fdid,  'space': options['space'], 
			'generalization': options['generalization'], 
			'time': options['time'], 'features': feats_sql})
		for row in res:
			geoms['geometries'][row[0]] = row[1]
		cur.close()
		return geoms
		
		
	def attributes(self, options):
		"""
		Returns the requested attributes for a given time moment. The features
		for which the attributes should be returned can optionally be defined.
		"""
		cur = self.datasource.connection.cursor()
		opt_attrs = options.get('attributes', '')
		if opt_attrs == '*' or opt_attrs == '':
			attrList = self.attribute_list()
		else:
			attrList = [a.strip() for a in opt_attrs.split(',')]
			attrList = [self.standard_name(a) for a in attrList]
		attributes = {
			'id': self.fdid,
			'time': options['time'],
			'attributeNames': attrList,
			'attributes': {}
		}
		feats_sql = ''
		if options.has_key('features') and options['features'] != '':
			features = options['features'].split(',')
			feat_list = "'" + "','".join(map(str, features)) + "'"
			feats_sql = " AND fid IN (%s) " % feat_list
			
		res = cur.execute("""SELECT fid, %(attr)s FROM %(fdid)s 
			WHERE t='%(time)s' %(feats)s""" % {'attr': ','.join(attrList), 
			'fdid': self.fdid, 'time': options['time'], 'feats': feats_sql})
		for row in res:
			i = 1
			if (row[0] in attributes['attributes']) == False: 
				attributes['attributes'][row[0]] = {}
				for a in attrList:
					attributes['attributes'][row[0]][a] = row[i]
					i += 1
		cur.close()
		return attributes
		
		
		
		
	def time_series(self, options):
		"""
		Returns the requested attribute as a time series for the provided 
		feature.
		"""
		cur = self.datasource.connection.cursor()
		res = cur.execute("""SELECT t, %(attr)s FROM %(fdid)s
			WHERE fid='%(fid)s' ORDER BY t""" % {'attr': options['attribute'],
			'fdid': self.fdid, 'fid': options['feature']})
		values = []
		for row in res:
			values.append({'time': row[0], 'value': row[1]})
		min_date = None
		max_date = None
		if len(values) > 0:
			min_date = values[0]['time']
			max_date = values[-1]['time']
		time_series = {
			'id': self.fdid,
			'feature': options['feature'],
			'attribute': options['attribute'],
			'values': values,
			'min_date': min_date,
			'max_date': max_date
		}
		return time_series
		
		
		
	def feature(self, fid, t, space='orig', generalization=0):
		"""
		Returns a complete Feature for a given time step as a JSON string
		representing a FeatureCollection. The time step t is considered for 
		the attributes only. For the geometries, the nearest time step is 
		taken into account.
		"""
		f = self.features(t, space, generalization, fids=[fid])
		return f[0]
		
		
	def features(self, t, space='orig', generalization=0, fids=None,
		attributes=None):
		"""
		Returns all the features for the requested time step, space and
		generalization level as a JSON string representing a 
		FeatureCollection. For the geometries, the nearest time step where
		geometries for the given space and generalization level is available
		is returned. If the optional fids attribute contains a list of 
		feature IDs, only the features for these IDs is returned.
		Optionally, a list with the requested attributes can be provided.
		"""
		attr_dict = {'time': t}
		if attributes != None:
			attr_dict['attributes'] = ','.join(attributes)
		if fids != None:
			attr_dict['features'] = ','.join(fids)
		attrs = self.get('GetAttributes', attr_dict)
		geom_time_steps = self.time_steps(geoms=True)
		cur = self.datasource.connection.cursor()
		# Find the nearest time step for our geometries.
		# Note: this query will fail with PostgreSQL
		res = cur.execute("""SELECT t, MIN(ABS(t-'%(time)s')) 
			FROM %(fdid)s__geometries 
			WHERE space='%(space)s' AND generalization=%(gen)d""" % 
			{'fdid': self.fdid, 'space': space, 'gen': generalization,
				'time': t}
		)
		row = res.fetchone()
		geom_t = row[0]
		# Get the geometries for this time step
		geom_dict = {
			'time': geom_t, 'space': space, 'generalization': generalization
		}
		if fids != None:
			geom_dict['features'] = attr_dict['features']
		geoms = self.get('GetGeometries', geom_dict)
		feats = []
		for fid in geoms['geometries']:
			try:
				attr = attrs['attributes'][fid]
			except:
				attr = {}
			attr['fid'] = fid
			attr['t'] = t
			attr_str = json.dumps(attr)
			f_str = ('{"type": "Feature", "properties": %s, "geometry": %s}' % 
				(attr_str, geoms['geometries'][fid])
			)
			feats.append(f_str)
		fcoll = ('{"type": "FeatureCollection", "features": [%s]}' % 
			','.join(feats)
		)
		return fcoll
		
		
		
	def attr_calc(self, expr, where=''):
		"""
		Allows calculations on the attributes of this dataset.
		expr specifies the calculation to do.
		E.g. for calculating the value for the population density in ha into 
		the attribute pop_dens using the pop and area (in m2), the expression
		'pop_dens = pop / (area / 10000)' can be used.
		The calculation itself is handled by the database, so every SQL
		compatible expression is accepted.
		"""
		cur = self.datasource.connection.cursor()
		if where != '': where = " WHERE " + where
		res = cur.execute('UPDATE %s SET %s %s' % (self.fdid, expr, where))
		self.datasource.connection.commit()
		cur.close()
		
		
	def name(self):
		"""
		Returns a human readable name of this dataset.
		"""
		cur = self.datasource.connection.cursor()
		res = cur.execute("""SELECT value FROM %(fdid)s__info 
							WHERE key='name'""" % {'fdid': self.fdid})
		for row in res:
			return row[0]
		cur.close()
		return self.fdid
		
		
	def feature_list(self, t=None):
		"""
		Returns a list of all feature IDs available in this dataset.
		"""
		cur = self.datasource.connection.cursor()
		if t == None:
			res = cur.execute(
				"""SELECT fid FROM %s GROUP BY fid""" % self.fdid
			)
		else:
			res = cur.execute(
				"""SELECT fid FROM %s WHERE t='%s' GROUP BY fid""" % 
				(self.fdid, t)
			)
		fids = []
		for row in res:
			fids.append(row[0])
		cur.close()
		return fids
		
		
		
	def find(self, t, geom_options={}, attr_options={}):
		"""
		Returns a list of all feature IDs corresponding to the provided
		search criteria. The following options can be provided for the
		geometries (geom_options):
		envelope	the bounding box inside which a part of the geometry
					should fall inside. It should be a dictionary of format
					{'xmin': <xmin>, 'xmax': <xmax>, 
					'ymin': <ymin>, 'ymax': <ymax>}
		contains	a coordinate tuple which should be contained in the 
					returned geometries.
		bbox_only	If bbox_only is set to True, only the geometries bounding
					box is used for evaluating the criteria. This is much 
					faster, but might be unaccurate. Default is True.
		space		The space inside which the geometries should be found.
					Is 'orig' by default.
		For the attributes, the following options are available:
		where		a SQL where statement on the attributes
		"""
		# Execute first the geometry search.
		fids = []
		if len(geom_options) > 0:
			if geom_options.has_key('bbox_only'):
				bbox_only = geom_options['bbox_only']
			else:
				bbox_only = True
			if geom_options.has_key('space'):
				space = geom_options['space']
			else:
				space = 'orig'
			# Check for contains option.
			if geom_options.has_key('contains'):
				fids = self.contains(coord, t, space, bbox_only)	
			elif geom_options.has_key('envelope'):
				fids = self.intersects_envelope(
					geom_options['envelope'], t, space, bbox_only
				)
		# Execute the attribute search.
		if len(fids) == 0:
			fids = None
		if len(attr_options) > 0:
			if attr_options.has_key('where'):
				fids2 = self.where(attr_options['where'], t, fids)
			else:
				fids2 = self.where('1=1', t, fids)
			return fids2
			
		# Return all features for the requested time moment if we don't have
		# geometry nor attribute options.
		if len(geom_options) == 0 and len(attr_options) == 0:
			fids = self.feature_list(t)
			
		return fids
		
		
		
	def where(self, where, t, features=None):
		"""
		Returns a list of all feature IDs of this dataset corresponding to
		the provided where SQL statement.
		"""
		cur = self.datasource.connection.cursor()
		fids_sql = ''
		if features != None and len(features) > 0:
			fids_sql = " AND fid IN ('%s') " % "','".join(features)
		res = cur.execute("""SELECT fid FROM %(fdid)s WHERE t='%(t)s' AND 
			%(where)s %(fids)s""" % {'fdid': self.fdid, 't': t, 
			'where': where, 'fids': fids_sql})
		fids = []
		for row in res:
			fids.append(row[0])
		cur.close()
		return fids
		
		
		
	def contains(self, coord, t, space='orig', bbox_only=True):
		"""
		Returns a list of all feature IDs of this dataset containing the
		coordinate coord (a tuple). If bbox_only is True, only the bounding
		box of the coordinate is considered (much faster). Default is True.
		"""
		cur = self.datasource.connection.cursor()
		fids = []
		pt = shapely.geometry.Point(coord[0], coord[1])
		res = cur.execute("""SELECT fid, geom FROM 
			%(fdid)s__geometries WHERE xmin<=%(x)f AND xmax>=%(x)f 
			AND ymin<=%(y)f AND ymax>=%(y)f""" % {'fdid': self.fdid, 
			'x': coord[0], 'y': coord[1]})
		for row in res:
			if bbox_only == False:
				# Check if point is really inside the geometry.
				geom = shapely.wkt.loads(row[1])
				if geom.contains(pt):
					fids.append(row[0])
			else:
				fids.append(row[0])
		cur.close()
		return fids
		
		
		
	def intersects_envelope(self, env, t, space='orig', bbox_only=True):
		"""
		Returns a list of all feature IDs of this dataset intersecting the
		provided envelope (a dictionary of format {'xmin': <xmin>, 
		'xmax': <xmax>, 'ymin': <ymin>, 'ymax': <ymax>}). If bbox_only is 
		True, only the bounding box of the geometry is considered (much 
		faster). Default is True.
		"""
		cur = self.datasource.connection.cursor()
		fids = []
		poly = shapely.geometry.Polygon([
			[env['xmin'], env['ymin']], [env['xmin'], env['ymax']],
			[env['xmax'], env['ymax']], [env['xmax'], env['ymin']]
		])
		res = cur.execute("""SELECT fid, geom FROM 
			%(fdid)s__geometries WHERE xmin<=%(xmax)f AND xmax>=%(xmin)f 
			AND ymin<=%(ymax)f AND ymax>=%(ymin)f""" % {'fdid': self.fdid, 
			'xmin': env['xmin'], 'xmax': env['xmax'], 'ymin': env['ymin'],
			'ymax': env['ymax']})
		for row in res:
			if bbox_only == False:
				# Check if point is really inside the geometry.
				geom = shapely.wkt.loads(row[1])
				if geom.intersect(poly):
					fids.append(row[0])
			else:
				fids.append(row[0])
		cur.close()
		return fids
		
		
		
	def attribute_list(self):
		"""
		Returns a list of all attributes available in this dataset.
		"""
		table_info = self.datasource.columns(self.fdid)
		attrs = []
		for f in table_info.keys():
			if (f != 'rowid' and f != 'fid' and f != 't'):
				attrs.append(f)
		return attrs
		
		
		
	def time_span(self):
		"""
		Returns the maximum time span for this dataset. It is a dictionary
		containing a min and max key: {min: <minTime>, max: <maxTime>}
		"""
		cur = self.datasource.connection.cursor()
		res = cur.execute("""SELECT MIN(t), MAX(t) FROM %(fdid)s""" % 
							{'fdid': self.fdid})
		row = res.fetchone()
		cur.close()
		return {'min': row[0], 'max': row[1]}
		
		
		
	def time_steps(self, geoms=False):
		"""
		Returns a list with all time steps for the attributes.
		If geoms is True, the time steps for the geometries are returned
		instead of the attributes.
		"""
		cur = self.datasource.connection.cursor()
		if geoms == False:
			res = cur.execute("""SELECT t FROM %s GROUP BY t ORDER BY t""" 
				% self.fdid
			)
		else:
			res = cur.execute("""SELECT t FROM %s__geometries 
				GROUP BY t ORDER BY t""" % self.fdid
			)
		tsteps = []
		for row in res:
			tsteps.append(row[0])
		return tsteps
		
		
		
	def spaces(self):
		cur = self.datasource.connection.cursor()
		res = cur.execute("""SELECT space FROM %(fdid)s__geometries 
							GROUP BY space""" % {'fdid': self.fdid})
		spaces = []
		for row in res:
			spaces.append(row[0])
		cur.close()
		return spaces
		
		
	def add_attribute(self, attr_name, attr_type):
		"""
		Adds a new attribute of the given type to the dataset.
		"""
		self.add_attributes({attr_name: attr_type})
		
		
	def add_attributes(self, attrs):
		"""
		Adds a number of attributes to the dataset. It is a dictionary
		containing the attribute names as a key, and the type as value.
		Allowed data types are datetime, int, float, string. If the data type
		is not of one of these, the string value is considered as being an
		SQL statement.
		"""
		cur = self.datasource.connection.cursor()
		for k,v in attrs.items():
			if self.has_attribute(k) == False:
				stk = self.standard_name(k)
				dtype = v
				if v == 'string': dtype = 'TEXT'
				if v == 'int' or v == 'float': dtype = 'NUMERIC'
				cur.execute("""ALTER TABLE %(fdid)s 
							ADD COLUMN %(attr)s %(def)s""" %
							{'fdid': self.fdid, 'attr': stk, 'def': dtype})
		self.datasource.connection.commit()
		cur.close()
		
		
		
	def is_valid_attribute_name(self, attr_name):
		"""
		Returns True if the provided attr_name (once standardized) is valid,
		and False otherwise.
		"""
		stk = self.standard_name(attr_name)
		if (stk != 'fid' and stk != 't' and stk != 'rowid'):
			return True
		else:
			return False
			
			
			
	def has_attribute(self, attr):
		"""
		Returns True if this dataset has an attribute with name attr.
		"""
		table_info = self.datasource.columns(self.fdid)
		attr = self.standard_name(attr)
		if attr in table_info.keys():
			return True
		else:
			return False
			
		
		
	def set_geometry(self, fid, geom, t, format='json', space='orig', 
					generalization=0):
		"""
		Updates or inserts the provided geometry into the database.
		The geometry can be provided as JSON compatible dictionary ('json' or
		'geojson'), as a WKT string ('wkt'), as a WKB string ('wkb'), or as a 
		Shapely object ('shapely').
		"""
		cur = self.datasource.connection.cursor()
		# Convert the geometry.
		if format == 'json' or format == 'geojson':
			try: geom_obj = shapely.geometry.asShape(geom)
			except: 
				print("[FeatureDataset.set_geometry] Error reading the geometry (feature %s)" % fid)
				return
		elif format == 'wkt':
			try: geom_obj = shapely.wkt.loads(geom)
			except: 
				print("[FeatureDataset.set_geometry] Error reading the geometry (feature %s)" % fid)
				return
		elif format == 'wkb':
			try: geom_obj = shapely.wkb.loads(geom)
			except: 
				print("[FeatureDataset.set_geometry] Error reading the geometry (feature %s)" % fid)
				return
		elif format == 'shapely':
			geom_obj = geom
		else:
			raise Exception("Geometry format %s not recognized." % geom_format)
			
		geom_json = json.dumps(geom_obj.__geo_interface__)
		geom_wkt = geom_obj.wkt
		(xmin, ymin, xmax, ymax) = geom_obj.bounds
		
		# Check if we should update or insert.	
		res = cur.execute("""SELECT COUNT(*) FROM %(fdid)s__geometries
			WHERE fid='%(fid)s' AND t=%(time)s AND space='%(space)s' 
			AND generalization=%(gnrl)s""" %
			{'fdid': self.fdid, 'fid': fid, 'time': t, 'space': space,
			'gnrl': generalization})
		row = res.fetchone()
		if row[0] == 0:
			# We should insert.
			sql = ("""INSERT INTO %(fdid)s__geometries (fid, geom, geom_json, 
				t, space, generalization, xmin, xmax, ymin, ymax) VALUES
				('%(fid)s', '%(geom)s', '%(geom_json)s', '%(time)s', 
				'%(space)s', %(gnrl)d, %(xmin)f, %(xmax)f, %(ymin)f, %(ymax)f
				)""" % {'fdid': self.fdid, 'fid': fid, 'geom': geom_wkt, 
				'geom_json': geom_json, 'time': t, 'space': space, 
				'gnrl': generalization, 'xmin': xmin, 'xmax': xmax, 
				'ymin': ymin, 'ymax': ymax})
			res = cur.execute(sql)
		else:
			# We should update.
			sql = ("""UPDATE %(fdid)s__geometries SET geom='%(geom)s',
				geom_json='%(geom_json)s', xmin=%(xmin)f, xmax=%(xmax)f, 
				ymin=%(ymin)f, ymax=%(ymax)f
				WHERE fid='%(fid)s' AND t='%(time)s' AND space='%(space)s' 
				AND generalization=%(gnrl)d""" % {'fdid': self.fdid, 
				'fid': fid, 'time': t, 'space': space, 'geom': geom_wkt,
				'geom_json': geom_json, 'gnrl': generalization, 'xmin': xmin, 
				'xmax': xmax, 'ymin': ymin, 'ymax': ymax})
			res = cur.execute(sql)
		self.datasource.connection.commit()
		cur.close()
		
		
		
	def set_attributes(self, fid, attributes, t):
		"""
		Sets the provided attributes for the feature at the given time moment.
		"""
		cur = self.datasource.connection.cursor()
		# Try to insert a new feature for the time step t.
		# If there is already one, it will fail.
		try:
			cur.execute(
				"INSERT INTO %s (fid, t) VALUES ('%s', '%s')" % 
				(self.fdid, fid, t)
			)
		except:
			pass
		for k in attributes:
			try:
				attr_val = attributes[k]
				try: attr_val = attr_val.replace("'", "''")
				except: pass
				if attr_val != 'fid' and attr_val != 't':
					# We don't allow to change the feature ID or the time
					res = cur.execute("""UPDATE %(fdid)s 
						SET %(attr)s='%(val)s' 
						WHERE fid='%(fid)s' AND t='%(t)s'""" %
						{'fdid': self.fdid, 'attr': k, 'val': attr_val, 
						'fid': fid, 't': t}
					)
			except:
				print("Error inserting value %(val)s into attribute %(attr)s for feature %(fid)s. Ignored." % 
				{'attr': k, 'val': attributes[k], 'fid': fid})
		self.datasource.connection.commit()
				
		
		
		
	def standard_name(self, string, max_length=0):
		"""
		Returns a SQL compatible name for the provided string. Removes all 
		special characters, and put everything in lower case.
		It is possible to define a maximum length; 0 means no maximum length.
		"""
		s = string.lower().strip()
		s = re.sub(r'\W+', '_', s)
		if max_length < 1:
			return s
		else:
			return s[:max_length]
			
			
			
	def import_geojson(self, gjson, fid='fid', t=None, space='orig', 
		generalization=0, encoding='latin-1', geom_only=False, 
		attr_only=False):
		"""
		Reads an existing GeoJson representation of a Feature Collection into 
		this Feature Dataset. 
		The gjson argument can either be a string or an object with a read
		method, such as an open file pointer.
		encoding gives the character encoding if the gjson string is not a
		Unicode string.
		If a Feature with the same feature-id is already in the Feature
		Dataset, then the imported GeoJSON feature is added to the existing
		Feature.
		If the geom_only flag is set to true, only geometries are imported.
		No features are created, so they should already exist in the database.
		Is useful for loading geometries for a new space, time moment or of
		a different generalization level.
		"""
		# Try to read the GeoJson content
		jsonstr = gjson
		try: jsonstr = gjson.read()
		except: pass
		# Try to convert into a Unicode string.
		try: jsonstr = unicode(jsonstr, encoding)
		except: pass
		# Load the GeoJSON
		geodata = geojson.loads(jsonstr)
		
		# Make a list of all attributes and their type in the GeoJSON file.
		if geom_only == False:
			attrs = {}
			for f in geodata['features']:
				for k,v in f['properties'].items():
					stk = self.standard_name(k, 20)
					dtype = self.guess_type(v)
					try:
						a = attrs[stk]
						if a != dtype:
							attrs[stk] = self.omni_type([a, dtype])
					except:
						attrs[stk] = dtype
			# Add the attributes to our dataset if they don't exist.
			self.add_attributes(attrs)
			
		# Loop through all the Features of the GeoJSON.
		for f in geodata['features']:
			# Find the feature-id, if there is one
			try:
				featid = f['properties'][fid]
			except:
				# If we don't have a feature-id, we get a new unique fid.
				featid = self.unique_fid()
			# Insert or update the feature
			if geom_only == False:
				self.set_attributes(
					fid=featid, attributes=f['properties'], t=t
				)
			# Insert the geometry
			if attr_only == False:
				self.set_geometry(fid=featid, geom=f['geometry'], t=t, 
					space=space, generalization=generalization)
				
				
				
	def export_geojson(self, geojson_file, t,  space='orig', generalization=0, 
		fids=None):
		"""
		Writes a GeoJSON representation of a part of this Feature Dataset
		to a file.
		"""
		json_str = self.features(t=t, space=space, 
			generalization=generalization, fids=fids
		)
		fp = open(geojson_file, "w")
		fp.write(json_str)
		fp.close()
		
		
		
	def guess_type(self, string):
		"""
		Tries to guess the data type for a provided string.
		It can be a datetime, float, int or string.
		"""
		try:
			dt = dateutil.parser.parse(string)
			return 'datetime'
		except: pass
		try:
			fl = float(string)
			return 'float'
		except: pass
		try:
			i = int(string)
			return 'int'
		except: return 'string'
		
		
		
	def omni_type(self, types):
		"""
		Provided a list of types, returns the data type that can hold all the
		listed data types. Supported data types include datetime, float, int and
		string.
		"""
		if 'string' in types:
			return 'string'
		if 'datetime' in types and ('float' in types or 'int' in types):
			return 'string'
		if 'datetime' in types:
			return 'datetime'
		if 'float' in types:
			return 'float'
		if 'int' in types:
			return 'int'
		# None of the supported datatypes is in the data type list.
		# Raise an exception.
		raise Exception("None of the supported data types found.")
		
		
		
	def unique_fid(self):
		"""
		Returns a new unique feature-id.
		"""
		cur = self.datasource.connection
		res = cur.execute("SELECT MAX(fid) FROM %s" % self.fdid)
		row = res.fetchone()
		max_fid = row[0]
		# Try to convert it into an integer. Increase by 1 if successful.
		# Otherwise, look if there is a number at the end of the string. If 
		# yes, increase it by 1. Otherwise, add _1 to the maximum string.
		try:
			fid_int = int(max_fid)
			return str(fid_int + 1)
		except:
			pass
		try:
			rfid = max_fid[::-1]
			m = re.search('([0-9]+?)([^0-9]+)(.*)', rfid)
			if m != None:
				nbr = int(m.group(1)[::-1]) + 1
				fid = m.group(3)[::-1] + m.group(2)[::-1] + str(nbr)
				return fid
		except:
			pass
		cur.close()
		return max_fid + '_1'
		
		
		
		
	def latest_time(self):
		"""
		Returns the latest time moment found for the specified space.
		"""
		cur = self.datasource.connection
		cur.execute("SELECT MAX(t) FROM %s" % (self.fdid))
		row = res.fetchone()
		cur.close()
		return row[0]
		
		
		
