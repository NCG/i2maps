import os
import sys
import datetime
import i2maps.settings as settings
import i2maps.datasources

db = i2maps.datasources.sqlite.Sqlite({'database': settings.I2MAPS_PATH + 'i2maps.db'})
db.connection.row_factory = i2maps.datasources.sqlite.sqlite.Row
tasks_directory = settings.I2MAPS_PATH + 'tasks/'

def create_tasks_table():
    db.query("CREATE TABLE tasks (name text, last_run_time text, successful text)")
    print("Tasks table created")

def get(task_name):
    details = get_task_details(task_name)[0]
    task = _load(details)
    return task

def all():
    details = get_task_details('%')
    tasks = map(_load, details)
    return tasks

def get_task_details(task_name='%'):
    result = db.query("SELECT * FROM tasks WHERE name LIKE '{name}'".format(name=task_name))
    result = map(lambda row: dict(zip(row.keys(), row)), result)
    return result

def insert_task_details(task_details):
    try:
        db.query("INSERT INTO tasks VALUES ('{name}', '{last_run_time}', '{successful}')".format(**task_details))
    except i2maps.datasources.sqlite.sqlite.OperationalError, e:
        if 'no such table' in str(e):
            create_tasks_table()
            insert_task_details(task_details)

def remove_task_details(task_name):
    db.query("DELETE FROM tasks WHERE name = '{name}'".format(name = task_name))

def _load(task_details):
    task_name = task_details['name']
    path = tasks_directory
    module = task_name
    module = module[0].lower() + module[1:]
    if not sys.path.__contains__(path):
        sys.path.insert(0, path)
    m = __import__(module)
    m = reload(m)
    task = getattr(m, module.capitalize())
    return task(**task_details)
    

class Task(object):
    """i2maps Task baseclass"""
    def __init__(self, last_run_time='2000-01-01 00:00:00', successful='False', **kwargs):
        self.name = self.__class__.__name__
        self.last_run_time = datetime.datetime.strptime(last_run_time[0:19], '%Y-%m-%d %H:%M:%S')
        self.successful = successful == 'True'
        self.now = datetime.datetime.now()
    
    def _should_run_now(self):
        return self.should_run_now(self.last_run_time, self.successful, self.now)
        
    def _run(self, q):
        result = self.run()
        self.last_run_time = self.now
        self.successful = result[0]
        self.message = result[1]
        q.put([self, result[1]])
        

if not db.has_table('tasks'):
    create_tasks_table()
