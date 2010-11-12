import os
import sys
path = os.path.split(os.getcwd())[0]
sys.path.insert(0, path)
sys.stdout = sys.stderr # sys.stdout access restricted by mod_wsgi
os.environ['DJANGO_SETTINGS_MODULE'] = 'i2maps.settings'
import django.core.handlers.wsgi
from django.core.servers.basehttp import run, AdminMediaHandler, WSGIServerException
import i2maps.settings as settings
settings.DEVELOPMENT = True
application = django.core.handlers.wsgi.WSGIHandler()
handler = application
if len(sys.argv) > 1:
    addrport = sys.argv[1]
    addr, port = addrport.split(':')
else:
    addr = '127.0.0.1'
    port = 8000
quit_command = (sys.platform == 'win32') and 'CTRL-BREAK' or 'CONTROL-C'
print "i2maps development server is running at http://%s:%s/" % (addr, port)
print "i2maps library: %s" %(settings.PROJECT_PATH)
print "i2maps working directory: %s" %(settings.I2MAPS_WORKING_DIRECTORY)
print "Quit the server with %s." % quit_command
run(addr, int(port), handler)