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
                # Use the first column name as the outter dictionary key.
                key = rows.description[0][0]
                # Create a new dictionary from the entire row.
                d = dict(row)
                # Pop off the outter most key. 
                # We don't want this info to be replicated in our dictionary.
                d.pop(key)
                # Add the new dictionary to the outter dictionary using the key.
                result[row[key]] = d
	return result
        
    def modify(self, query, params=()):
        raise NotImplementedError("This method is not implemented")
                
    def has_table(self, table):
        raise NotImplementedError("This method is not implemented")
        
    def columns(self, table):
        raise NotImplementedError("This method is not implemented")
