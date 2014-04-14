import re
import os
import sys
import subprocess
# import importlib
# from collections import OrderedDict

""" Global variable for tracking stages of installation """
installation = ['welcome', 'modules', 'thanks', 'restart']

def getTemplate(stage):
    """ Test if an installation has begun and return the correct
    template. """
    if stage is None:
        return installation[0] # Begin new install
    else:
        return installation[stage] # Return to the last step covered

def doStep(request):
    """ Get all form inputs from the user and determine what step
    the user is on and what template to use. """

    if request.forms.get('full-name') is not None:
        return {'session_vars' : prepareForInstall(request.forms)}
    elif request.forms.get('dashboard') is not None:
        return {'session_vars' : loadDashboard()}
    elif request.forms.get('confirmation') is not None:
        return {'session_vars' : reinstall(request)}
    # This is last to ensure that we really did not complete the installation yet
    # because request.forms.getall('module') is never cleared
    elif request.forms.getall('module') is not None and len(request.forms.getall('module')) >= 0:
        return {'session_vars' : doInstall(request)}
        
def prepareForInstall(form_vars):
    try:
        full_name = re.sub(' +', ' ', form_vars.get('full-name')).strip().split(" ")
        if len(full_name) > 2:
            return {'stage' : 0, 'installation_error' : {'message' : 'I\'ll just need your first and last name.'}}
        fname = full_name[0]
        lname = full_name[1]
    except IndexError:
        return {'stage' : 0, 'installation_error' : {'message' : 'I\'ll need your first and last name to proceed.'}}
    
    # Check for modules
    modules = checkModules()
                        
    return {'stage' : 1, 'fname' : fname, 'lname' : lname, 'modules' : modules}

def checkModules():
    modules = {}
    root = 'files/modules'
    if os.path.exists(root):
        for dirpath, dirnames, filenames in os.walk(root):
            for filename in filenames:
                dirname = dirpath.split(os.path.sep)[-1]
                if filename == 'install.py':
                    path = root + '/' + dirname + '/' + filename
                
                    # Locate metadata
                    metadata = {'Directory' : dirname}
                    with open(path, 'r') as file:
                        for line in file.readlines():  
                            line = re.sub(r'\s+', ' ', line.strip())
                            if '# DASH' in line:
                                line = line.replace('# DASH', '').strip().split(':')
                                metadata[line[0].strip()] = line[1].strip()
                            else:
                                break
                        modules[metadata['Module']] = metadata
    return modules

def doInstall(request):
    # Complete installation process 
    all_modules = request.session['modules']
    wanted_modules = request.forms.getall('module')

    if len(wanted_modules) == 0:
        return {'stage' : 1, 'installation_error' : {'message' : 'Please select at least one module.'}}
    else:
        widgets = {}
        for name, properties in all_modules.items():
            if name in wanted_modules:
                if subprocess.call('start /wait python ' + 'files/modules/' + properties['Directory'] + '/install.py', shell=True) == 0:
                    if subprocess.call(['python', 'files/modules/' + properties['Directory'] + '/' + properties['Directory'] + '.py'], shell=False) == 0:
                        with open("files/modules/" + properties['Directory'] + "/report.txt", 'r') as file:
                            widgets[properties['Module']] = file.readlines()
                else:
                    widgets[properties['Module']] = 'An error occured during setup for this module.'
                with open("files/install/.lock", "w") as file:
                    pass
        return {'stage' : 2, 'widgets' : widgets}

def loadDashboard():
    return {'stage' : 3}

def reinstall(request):
    if os.path.exists('files/install/.lock'):
        os.remove("files/install/.lock")
    request.session.delete()