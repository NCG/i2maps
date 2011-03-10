import os
import sys
import datetime
import time
from multiprocessing import Process, Queue
import logging
import daemonize
import i2maps.settings as settings
import i2maps.tasks

running_tasks = {}
q = Queue()
def main():
    while True:
        while not q.empty(): 
            result = q.get_nowait()
            task = result[0]
            p = running_tasks.get(task.name)
            p.join()
            running_tasks.pop(task.name)
            print(result[1])
            i2maps.tasks.remove_task_details(task.name)
            i2maps.tasks.insert_task_details(task.__dict__)
        for task in i2maps.tasks.all():
            if not running_tasks.has_key(task.name):
                # print("%s should run now: %s"%(task.name, task._should_run_now()))
                if task._should_run_now():
                    p = Process(target=task._run, args=(q,))
                    running_tasks[task.name] = p
                    p.start()
                    print("Starting task: " + task.name)
                    task.last_run_time = task.now
                    task.successful = False
                    
        time.sleep(5)

if __name__ == "__main__":
    path = os.path.split(os.getcwd())[0]
    sys.path.insert(0, path)
    if len(sys.argv) < 2:
        print """usage:\t{cmd} start|stop|restart : for daemon mode 
or:\t{cmd} debug : for non daemon debug mode
or:\t{cmd} add Task_name : to register and enable a new task 
        """.format(cmd=sys.argv[0])
    elif sys.argv[1] == 'debug':
        print("i2maps task scheduler running in debug mode.")
        print "i2maps working directory: %s" %(settings.I2MAPS_WORKING_DIRECTORY)
        print "Quit with CTRL-C."
        main()
    elif sys.argv[1] == 'add':
        task_name = sys.argv[2]
        if len(i2maps.tasks.get_task_details(task_name)) > 0:
            print("%s already in task database"%task_name)
        else:
            d = {'name': task_name}
            try:
                t = i2maps.tasks._load(d)
                i2maps.tasks.insert_task_details(t.__dict__)
                print("%s added to tasks database"%task_name)
            except ImportError:
                print("Task '{name}' could not be found. Please make sure it is defined as '{name}' in {tasks_directory}{lower_name}.py".format(
                name=task_name, tasks_directory=i2maps.tasks.tasks_directory, lower_name=task_name[0].lower() + task_name[1:]))
    elif sys.argv[1] == 'remove':
        task_name = sys.argv[2]
        if len(i2maps.tasks.get_task_details(task_name)) < 1:
            print("%s not in task database!"%task_name)
        else:
            i2maps.tasks.remove_task_details(task_name)
            print("%s removed from tasks database"%task_name)
    elif sys.argv[1] == 'list':
        task_list = i2maps.tasks.get_task_details('%')
        print(task_list)
    elif sys.argv[1] == 'run':
        task_name = sys.argv[2]
        d = {'name': task_name}
        try:
            t = i2maps.tasks._load(d)
            result = t.run()
            print(result)
        except ImportError, e:
            print("Task '{name}' could not be imported. Please make sure it is defined as '{name}' in {tasks_directory}{lower_name}.py".format(
            name=task_name, tasks_directory=i2maps.tasks.tasks_directory, lower_name=task_name[0].lower() + task_name[1:]))
            print(e)
    else:
        daemonize.startstop(stdout='/tmp/i2maps_tasks.log', stderr='/tmp/i2maps_tasks.log', pidfile='/tmp/i2maps_tasks.pid')
        main()
