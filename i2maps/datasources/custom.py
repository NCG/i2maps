import os
import sys

class Custom():
    js_proxy_object = None
    
    def _as_js_proxy_object(self):
        #if self.js_proxy_object: return self.js_proxy_object
        import inspect
        methods = []
        for m in inspect.getmembers(self.__class__, inspect.ismethod):
            if not m[0].startswith('_'):
                methods.append((m[0],inspect.getargspec(m[1])[0], '@i2maps.datasources.never_cache' in inspect.getsource(m[1])))
        object_name = self.__class__.__name__
        out = "{\n"
        for method_name, parameters, never_cache in methods:
            params = parameters + ['callback']
            param_string = ', '.join(params[1:])
            out += """
            "%(method)s": function(%(params)s){
            args = Array.prototype.slice.call(arguments);
            args = args.map(function(a){return (isFinite(a) && parseFloat(a)) || a});
            if(args.slice(-1)[0] instanceof Function) callback = args.pop(-1);
            else callback = function(response){i2maps.debug(response)};
            return i2maps.datasources.call("%(class)s", "%(method)s", args, callback, %(cache)s)
            },
            \n"""%{'method': method_name, 'params': param_string, 'class': object_name.lower(), 'cache': str(not never_cache).lower()}
        out += "}\n"
        self.js_proxy_object = out
        return out
