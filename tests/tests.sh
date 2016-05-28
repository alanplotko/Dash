#!/bin/bash

jshint assets/js config/ models/ routes/ app.js
jscs assets/js config/ models/ routes/ app.js
csslint assets/css/
