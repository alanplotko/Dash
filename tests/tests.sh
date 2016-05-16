#!/bin/bash

jshint config/ models/ routes/ app.js
jscs config/ models/ routes/ app.js
csslint assets/css/
