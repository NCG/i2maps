from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseServerError
from django.core.urlresolvers import reverse
from django.contrib.gis.geos import GEOSGeometry, Point
from django.contrib.gis.gdal import SpatialReference, CoordTransform
import urllib
import datetime
import time
import os
import re
import json
from sqlite3 import dbapi2 as sqlite
import decimal
import i2maps.settings as settings

class Sqlite():
    
    def __init__(self, config):
        ds_path = settings.I2MAPS_PATH + 'datasources/'
        db_path = config['database']
        if db_path[0] != '/': db_path = ds_path + db_path
        self.connection = sqlite.connect(database=db_path)
        
    def feature_query(self, query, parameters = {}):
        """
        Transforms a SQL query into a GeoJSON-formatted FeatureColection.
        It is possible to define a source SRS and target SRS if necessary
        by passing the keys 'source_srs' and 'target_srs' to the parameters
        dictionary. The SRS can be specified using a ESPG code integer value,
        or a PROJ.4 projection string.
        """
        def printDecimal(d):
            n = 3 # Number of decimal places
            s = str(d)
            s = s[:s.find('.') + 1 + n]
            return '|' + s + '|'
        # Define source and target SRS. If the source SRS is None (default), 
        # it is defined by the data source itself.
        s_srs = None
        if parameters.has_key('source_srs'):
            s_srs = parameters['source_srs']
        # Default target SRID is Google Mercator (EPSG 900913)
        t_srs = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs'
        if parameters.has_key('target_srs'):
            t_srs = parameters['target_srs']
        cur = self.connection.cursor()
        cur.execute(query)
        cols = cur.description
        id_col = -1
        geometry_col = -1
        for i in range(0, len(cols)):
            if cols[i][0] == 'id':
                id_col = i
            if cols[i][0] == 'geometry':
                geometry_col = i
        result = {}
        result['type'] = 'FeatureCollection'
        features = []
        for m in cur:
            feature = {}
            feature['type'] = 'Feature'
            if geometry_col > -1:
                if s_srs == None:
                    geometry = GEOSGeometry(m[geometry_col])
                else:
                    geometry = GEOSGeometry(m[geometry_col], s_srs)
                # Project if necessary
                if s_srs != t_srs:
                    geometry.transform(t_srs)
                feature['geometry'] = json.loads(geometry.json, parse_float=decimal.Decimal)
            if id_col > -1: feature['id'] = m[id_col]
            properties = {}
            for i in range(0, len(cols)):
                if i != geometry_col: properties[cols[i][0]] = str(m[i]) # this throws a UnicodeEncodeError with unicode strings
            feature['properties'] = properties
            features.append(feature)
        result['features'] = features
        properties = {}
        properties['count'] = len(features)
        result['properties'] = properties
        cur.close()
        return result
    
    def query(self, query, params=()):
        # self.connection.row_factory = sqlite.Row
        cur = self.connection.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        self.connection.commit()
        return rows
        
    def has_table(self, table):
        """
        Returns True if this SQLite database has a table with the provided
        name.
        """
        con = self.connection
        cur = con.cursor()
        res = cur.execute("""SELECT COUNT(*) FROM sqlite_master
            WHERE type='table' AND name='%s'""" % table)
        tcnt = cur.fetchall()
        cur.close()
        if tcnt[0][0] > 0:
            return True
        else:
            return False
        
    def columns(self, table):
        """
        Returns a dictionary containing the column names as keys and the
        types as values.
        """
        cur = self.connection.cursor()
        res = cur.execute("PRAGMA TABLE_INFO(%s)" % table)
        columns = {}
        for row in res:
            columns[row[1]] = row[2]
        return columns
        