#Dash

Dash keeps you updated with what's happening.

Dash is the name of the mascot character for the python program, which will allow any developer to create modules (e.g. the episode tracker project ported to work with this project) and hook them into the program. The program will utilize Bottle to create a dashboard on localhost, which can be set as the home page for the end user's browser of choice.

Upon executing the program, the dashboard will open up and provide access to a variety of information retrieved through the modules that the end user opts in to use.

#Future Plans

- User settings page
  - Change name
  - Allow automatic updates at set intervals of time
  - Change mascot image

- Modify installation process
  - Collect information via forms instead of command prompt
  - Expand compatability to beyond Windows

- Refreshing Modules
  - If files are missing (e.g. try-catch for missing settings.json file, etc.), report back the module as broken, remove the broken module from the widgets dictionary, and create a unique link to reinstall that module from the dashboard instead of having to click the 'install new module' button

- Widget Ideas (to form a foundation of widgets users can install)
  - Technology news widget.
    - Grabs recent posts from websites you choose. The user can opt for other news topics.

#Changelog

####v1.0.0 - 4/13/2014

- Initial Release
  - Bare-bones version (no modules included).

#Screenshots

##Installation Front Page

![Installation Front Page](https://s3.amazonaws.com/fvd-data/notes/166489/1397438991-umRI4o/screen.png "Installation Front Page")

##Dashboard

![Dashboard](https://s3.amazonaws.com/fvd-data/notes/166489/1397439198-dQrxeo/screen.png "Dashboard")
