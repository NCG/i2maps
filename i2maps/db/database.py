class Database(object):
    
    def query(self, query, params=()):
        raise NotImplementedError("This method is not implemented")
     
    def dict_query(self, query, params=()):
        rows = self.query(query, params)
        result = {}
        for row in rows:
            if len(row) == 2:
                 result[row[0]] = row[1]
            else:
                d = dict(row)
                d.pop(row.keys()[0])
                result[row[0]] = d
        return result
        
    def modify(self, query, params=()):
        raise NotImplementedError("This method is not implemented")
                
    def has_table(self, table):
        raise NotImplementedError("This method is not implemented")
        
    def columns(self, table):
        raise NotImplementedError("This method is not implemented")