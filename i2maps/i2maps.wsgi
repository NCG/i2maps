import os
import sys
from cgi import parse_qs
sys.stdout = sys.stderr # sys.stdout access restricted by mod_wsgi
os.environ['DJANGO_SETTINGS_MODULE'] = 'i2maps.settings'
os.environ['i2maps_working_directory'] = '/usr/local/i2maps_working/'
sys.path.append('/usr/local/')
import django.core.handlers.wsgi
def application(environ, start_response):
    status = '200 OK'
    d = parse_qs(environ['QUERY_STRING'])
    if d.get('reload', [''])[0] == 'true':
        if environ['mod_wsgi.process_group'] != '':
            import signal, os
            os.kill(os.getpid(), signal.SIGINT)
    wsgi_application = django.core.handlers.wsgi.WSGIHandler()
    return wsgi_application(environ, start_response)