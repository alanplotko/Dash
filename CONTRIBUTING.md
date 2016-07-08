#Contributing to Dash

Thanks for being interested in contributing, and checking to find out the best way to do it!

Use the following set of guidelines to help streamline the process of contributing to Dash. These aren't rules or laws, so they may not always be the best option. Feel free to propose changes to them as well.

####Table of Contents
[How to Contribute](#how-to-contribute)
  * [Reporting Bugs](#reporting-bugs)
  * [Requests](#feature-requests)
  * [Pull Requests](#pull-requests)

[Appendix](#appendix)
  * [Style Guide](#style-guide)
  * [Tags Guide](#tags-guide)

##How to Contribute

###Reporting Bugs
Please try to adhere to the following guidelines when submitting a bug report for Dash. Keeping reports clean and succinct helps us identify and solve problems quickly and effectively!

####Before Submitting a Bug Report
  * **Check to find out what branch you're on.** If you're working in the develop branch, make sure you're pulled and up to date. You shouldn't work in the master branch. Especially when Dash is out of the early development stages, master should be reserved for the stable version of Dash. New developments go in the develop branch.
  * **Don't submit duplicates.** Check through the [current open issues](https://github.com/alanplotko/Dash/issues) tagged with `bug` to see if the problem you've found has already been reported.
    * **Add more information if there is something missing.** If you find an already open bug report, feel free to comment with more information.

####Submitting a Good Bug Report
We track our bugs as [Github issues](https://guides.github.com/features/issues/). Once you've figured out which repository the bug is from, open up an issues in the repository and add as much of the following information that you can.
* **A descriptive title** to help us figure out who should be tackling the problem.
* **Describe how to reproduce the problem** in as much painstaking detail as possible. Is the issue only happening to you or is it happening for others? How often does it happen? If you can reproduce the issue, **list the steps to do so in as much detail as possible**.
* **Describe the behavior of the bug.** What did you expect to happen vs what actually did happen.
* **Screenshots or gifs are great.** A picture is worth a thousand words, so a moving one is probably worth a lot.
* **If you cant reproduce the problem** try to explain exactly what you were doing before it happened.

Include relevant details about the environment in which you're using Dash
* **What browser are you using?**
* **Your operating system.**

###Requests
Follow the guidelines when submitting requests to help move everything along.

####Before Submitting a Request
* **Make sure you're up to date.** Maybe the request has already been added!
* **Check open issues.** Look for issues tagged with `suggestion` to see if someone has already suggested it.

####Submitting a Good Request
* **Include a clear and descriptive title.**
* **Provide a step-by-step description** to demonstrate what the request is and how it works.
* **Provide specific examples** to demonstrate how your steps work.
* **Describe the current behavior** if there is any. Also explain what the new behavior should be and why.
* **Include screenshots and gifs.**
* **Link to or describe other applications** where a similar feature exists (if there is one).

###Pull Requests
* If you include changes to frontend, then you should probably include screenshots.
* Run `npm test` on your code while developing as this is what we use during our Travis Build.
* You should manually test the code you've added as well. `npm test` covers basic unit tests and code style, but it is not perfect. It's just there to help you avoid failing the Travis Build too easily. The code changes will be tested manually prior to being accepted and merged in.
* Code should not fail tests unless for a good reason. Explain the reason if there is one.
* Include helpful comments. See the [Style Guide](#style-guide) in the appendix.
* Tag it appropriately. See the [Tags Guide](#tags-guide) in the appendix.
* `# TODO ...`'s are ok, but there should probably be an issue opened for them if they are merged.

##Appendix

###Style Guide
This section has information on how the code should be styled.

####General
* 80 characters or less per line.
* Use four spaces rather than tab characters.
* Follow the style standards set in the tests (i.e. using `npm test`).
    * Feel free to contribute your own tests or make code style suggestions.

####Pet Peeves
* No whitespace inside parethesis or brackets. `foo(arg1, arg2)` instead of `foo( arg1, arg2 )`.
* No whitespace before a comma, semicolon or colon.
  * *Unless* it's acting like a binary operator like the `:` for a slice. In this case the whitespace must be the same on both sides. Less whitespace is preferred, however whitespace may be added for readability.
* No whitespace before the argument list of a function call. `foo(arg1)` rather than `foo (arg1)`.
* No extraneous whitespace around an assignment (or other) operator to align them.
```
x = 1          | x        = 1
y = 2          | y        = 2
long_var = 3   | long_var = 3
```

###Tags Guide

When creating an issue, you must select an issue type from the Issue Type table. If applicable, further categorize the issue with a category from the Issue Category table. Do **not** use any labels from **Issue State** or **Issue Timeline**. I'll be using those labels to respond to and organize issues.

For instance, if you'd like to contribute to these contributor guidelines (feel free to contribute!), then you'd be creating an issue in regards to documentation. So, you'd select `suggestion` and further categorize the issue as `documentation`. If you were suggesting a new feature, the category would instead be `new feature`. If you have a question regarding security, you should tag `question` and `security` for your issue.

####Issue Type (selected by the issue creator to describe the issue)
| Label Name | Description |
| --- | --- |
| `bug` | Confirmed bug or something that is likely a bug. |
| `question` | Community question. |
| `suggestion` | An idea or request posed to the community for consideration. Must be accompanied by **one** of the following categories: `enhancement`, `new feature`, or `new service`. |

####Issue Category (selected by the issue creator to further categorize the issue, if applicable)
| Label Name | Description |
| --- | --- |
| `crash` | Caused the app to totally crash. |
| `documentation` | Related to the documentation. |
| `enhancement` | Added along with `suggestion` to describe a request to improve an existing feature. |
| `git` | Related to git functionality (gitignore problems usually). |
| `new feature` | Added along with `suggestion` to describe a request to add a new feature. |
| `new service` | Added along with `suggestion` to describe a request to add a new service (i.e. connection). |
| `security` | Related to security. |
| `testing` | Related to unit testing. |
| `ui` | Related to frontend or user interfaces. |
| `ux` | Related to user experience in using Dash. |

####Issue State (used by myself to provide closure to specific issues)
| Label Name | Description |
| --- | --- |
| `duplicate` | Duplicate of another issue. |
| `invalid` | Issue is invalid (user error). |
| `wontfix` | Issue wont be fixed because it's working as intended or for some other reason. |

####Issue Timeline (used by myself to organize issues tagged with `suggestion`)
| Label Name | Description |
| --- | --- |
| `scheduled` | The `suggestion`-tagged issue has been accepted and is scheduled to be worked on in the future. |
