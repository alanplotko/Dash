import re
import os
import sys

""" Global variable for tracking stages of installation """
installation = ['welcome', 'modules', 'thanks']

def getTemplate(stage):
    """ Test if an installation has begun and return the correct
    template. """
    if stage is None:
        return installation[0] # Begin new install
    else:
        return installation[stage] # Return to the last step covered

def doStep(form_vars):
    """ Get all form inputs from the user and determine what step
    the user is on and what template to use. """
    if form_vars.get('full-name') is not None:
        return {'session_vars' : prepareForInstall(form_vars)}
    elif form_vars.get('standard') is not None:
        return {'session_vars' : doInstall(form_vars)}
        
def prepareForInstall(form_vars):
    try:
        full_name = re.sub(' +', ' ', form_vars.get('full-name')).strip().split(" ")
        if len(full_name) > 2:
            return {'stage' : 0, 'installation_error' : {'message' : 'I\'ll just need your first and last name.'}}
        fname = full_name[0]
        lname = full_name[1]
    except IndexError:
        return {'stage' : 0, 'installation_error' : {'message' : 'I\'ll need your first and last name to proceed.'}}
    modules = {}
    root = 'files/modules'
    if os.path.exists(root):
        for subdir, dirs, files in os.walk(root):
            for file in files:
                modules[subdir] = os.path.join(root, file)
        for key, item in modules:
            print(key, item)
    return {'stage' : 1, 'fname' : fname, 'lname' : lname, 'modules' : modules}
 
def doInstall(form_vars):
    # Complete installation process here
    return {'stage' : 2}