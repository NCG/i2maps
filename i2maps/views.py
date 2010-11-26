import json
import time
import datetime
import os
import sys
import i2maps.output
import i2maps.datasources
import i2maps.datasets
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseServerError, HttpResponseNotFound
from django.template import Context, RequestContext, loader
import i2maps.settings as settings

def index(request):
    return render_to_response('index.html')


def query(request):
    raise Exception("i2maps/query/ and i2maps.doQuery() are no longer supported!! Please use datasource proxy objects instead.")

def call(request):
    method = request.GET.get('method', '')
    parameters = json.loads(request.GET.get('parameters', '[]'))
    callback = request.GET.get('callback', '')
    data_source = request.GET.get('data_source', '')
    try:
        datasource = i2maps.datasources.get(data_source)
    except ImportError, e:
        raise Exception("No matching datasource class availble. You asked for %s!"%(data_source))
    if not isinstance(datasource, i2maps.datasources.Custom):
        raise Exception("You are not permitted to access the datasource you requested. You asked for %s!"%(data_source))
    try:
        results = getattr(datasource, method)(*parameters)
    except AttributeError, e:
        raise Exception("No matching method availble. You asked for %s with these parameters %s!"%(method, parameters))
    if isinstance(results, str):
        response = results
    elif isinstance(results, dict) and results.has_key('response'):
        response = results['response']
    else:
        response = i2maps.output.to_json(results)
    if callback != '':
        response = callback + '(' + response + ')'
    return HttpResponse(response)

def datasource(request):
    data_source = request.GET.get('data_source', '')
    try:
        datasource = i2maps.datasources.get(data_source)
    except ImportError, e:
        raise Exception("No matching datasource class availble. You asked for %s!"%(data_source))
    if not isinstance(datasource, i2maps.datasources.Custom):
        raise Exception("You are not permitted to access the datasource you requested. You asked for %s!"%(data_source))
    response = datasource._as_js_proxy_object()
    return HttpResponse(response)
    
def complex_vector(request, operation):
    callback = request.REQUEST.get('callback', '')
    oid = request.REQUEST.get('oid', '')
    dataset_id = request.REQUEST.get('dataset', '')
    datasource_id, dataset_id = dataset_id.split('.')
    datasource = i2maps.datasources.get(datasource_id)
    dataset = i2maps.datasets.get({
        'type': 'feature_dataset',
        'id': dataset_id,
        'datasource': datasource
    })
    results = dataset.get(operation, request.REQUEST)
    if oid != '':
        results['oid'] = oid
    response = i2maps.output.to_json(results)
    if callback != '':
        response = callback + '(' + response + ')'
    return HttpResponse(response)

def error500(request, template_name='500.html'):
    """
    500 error handler.

    Templates: `500.html`
    Context: None
    """
    import django.views.debug
    import tempfile
    path = tempfile.gettempdir() + '/'
    filename = 'error_' + str(int(time.mktime(datetime.datetime.now().timetuple()))) + '.html'
    exc_type, exc_value, tb = sys.exc_info()
    reporter = django.views.debug.ExceptionReporter(request, exc_type, exc_value, tb)
    debug_html = reporter.get_traceback_html()
    f = open(path + filename, 'w')
    f.write(debug_html)
    f.close()
    if not settings.DEVELOPMENT: filename = None
    t = loader.get_template(template_name) # You need to create a 500.html template.
    html = t.render(RequestContext(request, {'error_file': filename, 'exception': exc_value}))
    return HttpResponseServerError(html)
    
def error404(request, template_name='404.html'):
    """
    Default 404 handler.

    Templates: `404.html`
    Context:
        request_path
            The path of the requested URL (e.g., '/app/pages/bad_page/')
    """
    import django.views.static
    path = str(request.path)
    if 'projects/' in path and path.endswith('/'):
        print(request.path)
        path = path.split('projects/')[1] + 'index.html'
        return django.views.static.serve(request, path, document_root=settings.I2MAPS_PATH + 'views')
    t = loader.get_template(template_name) # You need to create a 404.html template.
    return HttpResponse(t.render(RequestContext(request, {'request_path': request.path})))   