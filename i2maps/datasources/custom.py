import os
import sys
class Custom():
    js_proxy_object = None
    
    def _as_js_proxy_object(self):
        if self.js_proxy_object: return self.js_proxy_object
        import inspect
        methods = []
        for m in inspect.getmembers(self.__class__, inspect.ismethod):
            if not m[0].startswith('_'):
                methods.append((m[0],inspect.getargspec(m[1])[0]))
        object_name = self.__class__.__name__
        out = "%s = {\n"%(object_name)
        for method_name, parameters in methods:
            params = parameters + ['callback']
            param_string = ', '.join(params[1:])
            out += """
            "%s": function(%s){
            args = Array.prototype.slice.call(arguments);
            callback = args.pop(-1);
            return i2maps.datasources.call("%s", "%s", args, callback)
            },
            \n"""%(method_name, param_string, object_name.lower(), method_name)
        out += "}\n"
        self.js_proxy_object = out
        return out