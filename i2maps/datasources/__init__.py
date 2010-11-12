from .postgres import Postgres
from .custom import Custom
from .sqlite import Sqlite
import i2maps.settings as settings
import json
import os
import sys
def new(config):
    return {
    'postgres': Postgres,
    'custom': Custom,
    'sqlite' : Sqlite
    }.get(config['type'], fail)(config)

def get(data_source):
    ds_path = settings.I2MAPS_PATH + 'datasources/'
    try: 
        data_source_config = json.load(open(ds_path + data_source + '.json', 'r'))
        return new(data_source_config)
    except IOError, e:
        full_path = ds_path + data_source + ".py"
        path = os.path.split(full_path)[0]
        filename = os.path.split(full_path)[1]
        module = os.path.splitext(filename)[0]
        module = module[0].lower() + module[1:]
        if not sys.path.__contains__(path):
            sys.path.insert(0, path)
        m = __import__(module)
        datasource = eval('m.' + module.capitalize())
        return datasource()


def fail(config):
    raise Exception, "No datasource connectors available of type " + config['type']