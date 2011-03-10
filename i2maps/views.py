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

# allowing use of i2maps/query/ and i2maps.doQuery() (JS) for backwards compatibility
def query(request):
    query = request.GET.get('query', '')
    parameters = json.loads(request.GET.get('parameters', '[]'))
    parameters = dict([(k.encode(), parameters[k]) for k in parameters])
    callback = request.GET.get('callback', '')
    data_source = request.GET.get('data_source', '')
    if data_source.startswith('{') and data_source.endswith('}'): # data source defined in request
        data_source_config = json.loads(data_source)
        datasource = i2maps.datasources.new(data_source_config)
    else: # data source referred to by name
        datasource = i2maps.datasources.get(data_source)
    if getattr(datasource, 'feature_query', None):
        results = datasource.feature_query(query, parameters)
    else:
        results = getattr(datasource, query)(**parameters)
    response = i2maps.output.to_json(results)
    if callback != "":
        response = callback + '(' + response + ')'
    return HttpResponse(response)
    
# def query(request):
#     raise Exception("i2maps/query/ and i2maps.doQuery() are no longer supported!! Please use datasource proxy objects instead.")

def call(request):
   # using request.REQUEST instead of request.GET to allow parameters to be sent by POST either
    method = request.REQUEST.get('method', '')
    parameters = json.loads(request.REQUEST.get('parameters', '[]'))
    callback = request.REQUEST.get('callback', '')
    data_source = request.REQUEST.get('data_source', '')
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
    response = "i2maps.datasources['%s'] = %s"%(data_source, datasource._as_js_proxy_object())
    return HttpResponse(response, content_type="text/javascript")
    
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
    exc_type, exc_value, tb = sys.exc_info()
    reporter = django.views.debug.ExceptionReporter(request, exc_type, exc_value, tb)
    debug_html = reporter.get_traceback_html()
    filename = settings.I2MAPS_PATH + 'errors.db'
    try:
        db = i2maps.datasources.new({"type": "sqlite", "database": filename})
        if not db.has_table('errors'):
            db.query("create table errors (id INTEGER, time TEXT, request TEXT, exception TEXT, traceback_html TEXT)")
        else:
            t = datetime.datetime.now()
            id = int(time.mktime(t.timetuple()))
            params = (id, str(t)[0:-7], str(request.path), str(exc_value), str(debug_html))
            db.query("insert into errors values (?, ?, ?, ?, ?)", params)
    except Exception, e:
        return HttpResponse(str(e) + ' ' + filename)
    if not settings.DEVELOPMENT: id = None
    t = loader.get_template(template_name) # You need to create a 500.html template.
    html = t.render(RequestContext(request, {'error_file': id, 'exception': exc_value}))
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

def errors(request, key=None):
    db = i2maps.datasources.new({"type": "sqlite", "database": settings.I2MAPS_PATH + 'errors.db'})
    if key:
        response = db.query('select traceback_html from errors where id = %s'%key)[0][0]
        return HttpResponse(response)
    else:
        errors = db.query('select * from errors order by id desc')
        t = loader.get_template('errors.html') # You need to create a 404.html template.
        return HttpResponse(t.render(RequestContext(request, {'errors': errors}))) 

# def errors(request, key=None):
#     import shelve
#     d = shelve.open(settings.I2MAPS_PATH + 'errors.db')
#     if key:
#         response = d[str(key)]['traceback_html']
#         d.close()
#         return HttpResponse(response)
#     else:
#         keys = ['time', 'request_path', 'exception']
#         errors = map(lambda e: [e] + map(lambda k: d.get(e).get(k), keys), d)
#         d.close()
#         t = loader.get_template('errors.html') # You need to create a 404.html template.
#         return HttpResponse(t.render(RequestContext(request, {'errors': errors}))) 

# def errors(request):
#     import tempfile
#     dir = tempfile.gettempdir()
#     filenames = filter(lambda f: f.startswith('error_'), os.listdir(dir))
#     filenames.sort(reverse=True)
#     dates = map(lambda f: datetime.datetime.fromtimestamp(float(f.split('.')[0].split('_')[1])).__str__(), filenames)
#     t = loader.get_template('errors.html') # You need to create a 404.html template.
#     return HttpResponse(t.render(RequestContext(request, {'filenames': zip(filenames, dates)}))) 