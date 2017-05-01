/**
 * LESS stylesheet loader plugin for RequireJS.
 *
 * Copyright (c) 2014, David Hall.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 *     1. Redistributions of source code must retain the above copyright notice, 
 *        this list of conditions and the following disclaimer.
 *     
 *     2. Redistributions in binary form must reproduce the above copyright 
 *        notice, this list of conditions and the following disclaimer in the
 *        documentation and/or other materials provided with the distribution.
 * 
 *     3. Neither the name of David Hall nor the names of its contributors may be
 *        used to endorse or promote products derived from this software without
 *        specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

define([
    "module",
    "text"
], function(
    module,
    text
) {

    "use strict";

    var moduleConfig = module.config();
    var lessPath = moduleConfig.path || "../less/";
    var lessRootPath = moduleConfig.rootPath;

    var buildMap = {};

    var style = {

        _compile: function(less, contents, options, onError, onSuccess) {
            less.render(contents, options).then(function (output) {
                onSuccess(output.css);
            }, function (error) {
                onError(new Error("LESS parse error in " + err.filename +  " on line " + err.line + ", column " + err.column + ": " + err.message));
            })
        },

        _injectCSS: function(css) {
            var style = document.createElement("style");
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        },

        _build: function(name, onload) {
            var lessUrl = require.toUrl(lessPath);
            // Check for a root path.
            if (!lessRootPath) {
                throw new Error("To use an optimizing LESS build, you must specify config.style.rootPath as an absolute URL.");
            }
            // Perform an optimizing build.
            var less = require.nodeRequire("less");
            // Load the contents.
            var url = lessUrl + name;
            text.get(url, function(contents) {
                // Compile the LESS.
                style._compile(less, contents, {
                    filename: url,
                    syncImport: true,
                    env: "production",
                    paths: [lessUrl],
                    rootpath: lessRootPath,
                    compress: true
                }, onload.error, function(css) {
                    // Store the generated CSS.
                    buildMap[name] = css;
                    onload(css);
                });
            });
        },

        _load: function(name, onload) {
            var lessUrl = require.toUrl(lessPath);
            // Perform an in-browser build.
            var url = lessUrl + name;
            require(["less"], function(less) {
                text.get(url, function(contents) {
                    style._compile(less, contents, {
                        filename: url,
                        env: "development",
                        paths: [lessUrl],
                        rootpath: lessUrl
                    }, onload.error, function(css) {
                        style._injectCSS(css);
                        onload(css);
                    });
                });
            });
        },

        load: function(name, parentRequire, onload, config) {
            if (config.isBuild) {
                style._build(name, onload);
            } else {
                style._load(name, onload);
            }
        },

        write: function (pluginName, moduleName, write) {
            if (moduleName in buildMap) {
                write("define('" + pluginName + "!" + moduleName  + "', ['" + pluginName + "'], function (style) { return style._injectCSS('" + text.jsEscape(buildMap[moduleName]) + "');});\n");
            }
        }

    };

    return style;

});
