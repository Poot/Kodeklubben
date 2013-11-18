if ( typeof String.prototype.startsWith != 'function' ) {
	String.prototype.startsWith = function( str ) {
		return str.length > 0 && this.substring( 0, str.length ) === str;
	}
};

if ( typeof String.prototype.endsWith != 'function' ) {
	String.prototype.endsWith = function( str ) {
		return str.length > 0 && this.substring( this.length - str.length, this.length ) === str;
	}
};

String.prototype.replaceAll = function (toReplace, replacement) {
    var result = this.split(toReplace).join(replacement);
    return result;
};

String.prototype.toCamelCase = function () {
    var result = this.charAt(0).toLowerCase() + this.substring(1);
    result = result.replaceAll("-", "");
    return result;
};

String.prototype.toPascalCase = function () {
    var result = this.charAt(0).toUpperCase() + this.substring(1);
    result = result.replaceAll("-", "");
    return result;
};

var Bifrost = Bifrost || {};
(function(global, undefined) {
	Bifrost.extend = function extend(destination, source) {
    	return $.extend(destination, source);
	};
})(window);
var Bifrost = Bifrost || {};
Bifrost.namespace = function (ns, content) {

    // Todo: this should not be needed, it is a symptom of something using it being wrong!!! Se issue #232 on GitHub (http://github.com/dolittle/Bifrost/issues/232)
    ns = ns.replaceAll("..", ".");
    if (ns.endsWith(".")) ns = ns.substr(0, ns.length - 1);
    if (ns.startsWith(".")) ns = ns.substr(1);

    var parent = window;
    var name = "";
    var parts = ns.split('.');
    $.each(parts, function (index, part) {
        if (name.length > 0) {
            name += ".";
        }
        name += part;
        if (!Object.prototype.hasOwnProperty.call(parent, part)) {
            parent[part] = {};
            parent[part].parent = parent;
            parent[part].name = name;
        }
        parent = parent[part];
    });

    if (typeof content === "object") {
        Bifrost.namespace.current = parent;

        Bifrost.extend(parent, content);

        for (var property in parent) {
            if (parent.hasOwnProperty(property)) {
                parent[property]._namespace = parent;
                parent[property]._name = property;
            }
        }
        Bifrost.namespace.current = null;
    }

    return parent;
};
Bifrost.namespace("Bifrost.execution", {
    Promise: function () {
        var self = this;

        this.signalled = false;
        this.callback = null;
        this.error = null;
        this.hasFailed = false;
        this.failedCallback = null;

        function onSignal() {
            if (self.callback != null && typeof self.callback !== "undefined") {
                if (typeof self.signalParameter !== "undefined") {
                    self.callback(self.signalParameter, Bifrost.execution.Promise.create());
                } else {
                    self.callback(Bifrost.execution.Promise.create());
                }
            }
        }

        this.fail = function (error) {
            if (self.failedCallback != null) self.failedCallback(error);
            self.hasFailed = true;
            self.error = error;
            throw error;
        };

        this.onFail = function (callback) {
            if (self.hasFailed) {
                callback(self.error);
            } else {
                self.failedCallback = callback;
            }
        };


        this.signal = function (parameter) {
            self.signalled = true;
            self.signalParameter = parameter;
            onSignal();
        };

        this.continueWith = function (callback) {
            var nextPromise = Bifrost.execution.Promise.create();
            this.callback = callback;
            if (self.signalled === true) onSignal();
            return nextPromise;
        };
    }
});

Bifrost.execution.Promise.create = function() {
	var promise = new Bifrost.execution.Promise();
	return promise;
};
Bifrost.namespace("Bifrost", {
    isNumber: function (number) {
        return !isNaN(parseFloat(number)) && isFinite(number);
    }
});
Bifrost.namespace("Bifrost", {
	isArray : function(o) {
		return Object.prototype.toString.call(o) === '[object Array]';
	}
});
Bifrost.namespace("Bifrost", {
	isObject : function(o) {
		return Object.prototype.toString.call(o) === '[object Object]';
	}
});
Bifrost.namespace("Bifrost", {
    path: {
        makeRelative: function (fullPath) {
            if (fullPath.indexOf("/") == 0) return fullPath.substr(1);

            return fullPath;
        },
        getPathWithoutFilename: function (fullPath) {
            var lastIndex = fullPath.lastIndexOf("/");
            return fullPath.substr(0, lastIndex);
        },
        getFilename: function (fullPath) {
            var lastIndex = fullPath.lastIndexOf("/");
            return fullPath.substr(lastIndex+1);
        },
        getFilenameWithoutExtension: function (fullPath) {
            var filename = this.getFilename(fullPath);
            var lastIndex = filename.lastIndexOf(".");
            return filename.substr(0,lastIndex);
        },
        hasExtension: function (path) {
            if (path.indexOf("?") > 0) path = path.substr(0, path.indexOf("?"));
            var lastIndex = path.lastIndexOf(".");
            return lastIndex > 0;
        },
        changeExtension: function (fullPath, newExtension) {
            if (fullPath.indexOf("?") > 0) fullPath = fullPath.substr(0, fullPath.indexOf("?"));
            var lastIndex = fullPath.lastIndexOf(".");
            if (lastIndex > 0) {
                return fullPath.substr(0, lastIndex) + "." + newExtension;
            }
            return fullPath + "." + newExtension;
        }
    }
});
Bifrost.namespace("Bifrost", {
	functionParser: {
		parse: function(func) {
			var result = [];
			
            var match = func.toString ().match (/function\w*\s*\((.*?)\)/);
			var arguments = match[1].split (/\s*,\s*/);
			$.each(arguments, function(index, item) {
				if( item.trim().length > 0 ) {
					result.push({
						name:item
					});
				}
			});
			
			return result;
		}
	}
});
Bifrost.namespace("Bifrost", {
    assetsManager: {
        initialize: function () {
            var promise = Bifrost.execution.Promise.create();
            if (typeof Bifrost.assetsManager.scripts === "undefined" ||
                Bifrost.assetsManager.scripts.length == 0) {

                $.get("/Bifrost/AssetsManager", { extension: "js" }, function (result) {
                    Bifrost.assetsManager.scripts = result;
                    Bifrost.namespaces.create().initialize();
                    promise.signal();
                }, "json");
            } else {
                promise.signal();
            }
            return promise;
        },
        initializeFromAssets: function(assets) {
            Bifrost.assetsManager.scripts = assets;
            Bifrost.namespaces.create().initialize();
        },
        getScripts: function () {
            return Bifrost.assetsManager.scripts;
        },
        hasScript: function(script) {
            var found = false;
            $.each(Bifrost.assetsManager.scripts, function (index, scriptInSystem) {
                if (scriptInSystem === script) {
                    found = true;
                    return;
                }
            });

            return found;
        },
        getScriptPaths: function () {
            var paths = [];

            $.each(Bifrost.assetsManager.scripts, function (index, fullPath) {
                var path = Bifrost.path.getPathWithoutFilename(fullPath);
                if (paths.indexOf(path) == -1) {
                    paths.push(path);
                }
            });
            return paths;
        }
    }
});
//Bifrost.WellKnownTypesDependencyResolver.types.assetsManager = Bifrost.commands.commandCoordinator;
Bifrost.namespace("Bifrost", {
    dependencyResolver: (function () {
        function resolveImplementation(namespace, name) {
            var resolvers = Bifrost.dependencyResolvers.getAll();
            var resolvedSystem = null;
            $.each(resolvers, function (index, resolver) {
                if (resolvedSystem != null) return;
                var canResolve = resolver.canResolve(namespace, name);
                if (canResolve) {
                    resolvedSystem = resolver.resolve(namespace, name);
                    return;
                }
            });

            return resolvedSystem;
        }

        function handleSystemInstance(system) {
            if (system != null &&
                system._super !== null &&
                typeof system._super !== "undefined" &&
                system._super === Bifrost.Type) {
                return system.create();
            }
            return system;
        }

        function beginHandleSystemInstance(system) {
            var promise = Bifrost.execution.Promise.create();

            if (system != null &&
                system._super !== null &&
                typeof system._super !== "undefined" &&
                system._super === Bifrost.Type) {

                system.beginCreate().continueWith(function (result, next) {
                    promise.signal(result);
                });
            } else {
                promise.signal(system);
            }

            return promise;
        }

        return {
            getDependenciesFor: function (func) {
                var dependencies = [];
                var parameters = Bifrost.functionParser.parse(func);
                for (var i = 0; i < parameters.length; i++) {
                    dependencies.push(parameters[i].name);
                }
                return dependencies;
            },

            resolve: function (namespace, name) {
                var resolvedSystem = resolveImplementation(namespace, name);
                if (typeof resolvedSystem === "undefined" || resolvedSystem === null) {
                    console.log("Unable to resolve '" + name + "'");
                    throw new Bifrost.UnresolvedDependencies();
                }

                if (resolvedSystem instanceof Bifrost.execution.Promise) {
                    console.log("'" + name + "' was resolved as an asynchronous dependency, consider using beginCreate() or make the dependency available prior to calling create");
                    throw new Bifrost.AsynchronousDependenciesDetected();
                }

                return handleSystemInstance(resolvedSystem);
            },

            beginResolve: function (namespace, name) {
                var promise = Bifrost.execution.Promise.create();
                Bifrost.configure.ready(function () {
                    var resolvedSystem = resolveImplementation(namespace, name);
                    if (typeof resolvedSystem === "undefined" || resolvedSystem === null) {
                        console.log("Unable to resolve '" + name + "'");
                        promise.fail(new Bifrost.UnresolvedDependencies());
                    }

                    if (resolvedSystem instanceof Bifrost.execution.Promise) {
                        resolvedSystem.continueWith(function (system, innerPromise) {

                            beginHandleSystemInstance(system)
                            .continueWith(function (actualSystem, next) {
                                promise.signal(handleSystemInstance(actualSystem));
                            });
                        });
                    } else {
                        promise.signal(handleSystemInstance(resolvedSystem));
                    }
                });

                return promise;
            }
        }
    })()
});
Bifrost.namespace("Bifrost", {
    dependencyResolvers: (function () {
        return {
            getAll: function () {
                var resolvers = [new Bifrost.WellKnownTypesDependencyResolver(), new Bifrost.DefaultDependencyResolver()];
                for (var property in this) {
                    if (property.indexOf("_") != 0 &&
                        this.hasOwnProperty(property) &&
                        typeof this[property] !== "function") {
                        resolvers.push(this[property]);
                    }
                }
                return resolvers;
            }
        };
    })()
});
Bifrost.namespace("Bifrost", {
    DefaultDependencyResolver: function () {
        var self = this;

        this.doesNamespaceHave = function (namespace, name) {
            return namespace.hasOwnProperty(name);
        };

        this.doesNamespaceHaveScriptReference = function (namespace, name) {
            if (namespace.hasOwnProperty("_scripts") && Bifrost.isArray(namespace._scripts)) {
                for (var i = 0; i < namespace._scripts.length; i++) {
                    var script = namespace._scripts[i];
                    if (script === name) {
                        return true;
                    }
                }
            }
            return false;
        };

        this.getFileName = function (namespace, name) {
            var fileName = "";
            if (typeof namespace._path !== "undefined") {
                fileName += namespace._path;
                if (!fileName.endsWith("/")) {
                    fileName += "/";
                }
            }
            fileName += name;
            if (!fileName.endsWith(".js")) {
                fileName += ".js";
            }
            fileName = fileName.replaceAll("//", "/");
            return fileName;

        };

        this.loadScriptReference = function (namespace, name, promise) {
            var fileName = self.getFileName(namespace, name);
            require([fileName], function (system) {
                if (self.doesNamespaceHave(namespace, name)) {
                    system = namespace[name];
                }
                promise.signal(system);
            });
        };


        this.canResolve = function (namespace, name) {
            var current = namespace;
            while (current != null && current != window) {
                if (self.doesNamespaceHave(current, name)) {
                    return true;
                }
                if (self.doesNamespaceHaveScriptReference(current, name) ) {
                    return true;
                }
                if (current === current.parent) break;
                current = current.parent;
            }

            return false;
        };

        this.resolve = function (namespace, name) {
            var current = namespace;
            while (current != null && current != window) {
                if (self.doesNamespaceHave(current, name)) {
                    return current[name];
                }
                if (self.doesNamespaceHaveScriptReference(current, name) ) {
                    var promise = Bifrost.execution.Promise.create();       
                    self.loadScriptReference(current, name, promise);
                    return promise;
                }
                if (current === current.parent) break;
                current = current.parent;

            }

            return null;
        };
    }
});
Bifrost.namespace("Bifrost", {
    WellKnownTypesDependencyResolver: function () {
        var self = this;
        this.types = Bifrost.WellKnownTypesDependencyResolver.types;

        this.canResolve = function (namespace, name) {
            return self.types.hasOwnProperty(name);
        },
        this.resolve = function (namespace, name) {
            return self.types[name];
        }
    }
});

Bifrost.WellKnownTypesDependencyResolver.types = {
    options: {}
};
Bifrost.namespace("Bifrost", {
    Type: function () {
        var self = this;
    }
});

(function () {
    throwIfMissingTypeDefinition = function(typeDefinition) {
        if (typeDefinition == null || typeof typeDefinition == "undefined") {
            throw new Bifrost.MissingTypeDefinition();
        }
    };

    throwIfTypeDefinitionIsObjectLiteral = function(typeDefinition) {
        if (typeof typeDefinition === "object") {
            throw new Bifrost.ObjectLiteralNotAllowed();
        }
    };

    addStaticProperties = function(typeDefinition) {
        for (var property in Bifrost.Type) {
            if (Bifrost.Type.hasOwnProperty(property)) {
                typeDefinition[property] = Bifrost.Type[property];
            }
        }
    };

    setupDependencies = function(typeDefinition) {
        typeDefinition._dependencies = Bifrost.dependencyResolver.getDependenciesFor(typeDefinition);

        var firstParameter = true;
        var createFunctionString = "Function('definition', 'dependencies','return new definition(";
            
        if( typeof typeDefinition._dependencies !== "undefined" ) {
            $.each(typeDefinition._dependencies, function(index, dependency) {
                if (!firstParameter) {
                    createFunctionString += ",";
                }
                firstParameter = false;
                createFunctionString += "dependencies[" + index + "]";
            });
        }
        createFunctionString += ");')";

        typeDefinition.createFunction = eval(createFunctionString);
    };

    getDependencyInstances = function(namespace, typeDefinition) {
        var dependencyInstances = [];
        if( typeof typeDefinition._dependencies !== "undefined" ) {
            $.each(typeDefinition._dependencies, function(index, dependency) {
                var dependencyInstance = Bifrost.dependencyResolver.resolve(namespace, dependency);
                dependencyInstances.push(dependencyInstance);
            });
        }
        return dependencyInstances;
    };

    resolve = function(namespace, dependency, index, instances, typeDefinition, resolvedCallback) {
        var resolverPromise = 
            Bifrost.dependencyResolver
                .beginResolve(namespace, dependency)
                .continueWith(function(result, nextPromise) {
                    instances[index] = result;
                    resolvedCallback(result, nextPromise);
                });
    };


    beginGetDependencyInstances = function(namespace, typeDefinition) {
        var promise = Bifrost.execution.Promise.create();
        var dependencyInstances = [];
        var solvedDependencies = 0;
        if( typeof typeDefinition._dependencies !== "undefined" ) {
            var dependenciesToResolve = typeDefinition._dependencies.length;
            var actualDependencyIndex = 0;
            var dependency = "";
            for( var dependencyIndex=0; dependencyIndex<dependenciesToResolve; dependencyIndex++ ) {
                dependency = typeDefinition._dependencies[dependencyIndex];
                resolve(namespace, dependency, dependencyIndex, dependencyInstances, typeDefinition, function(result, nextPromise) {
                    solvedDependencies++;
                    if( solvedDependencies == dependenciesToResolve ) {
                        promise.signal(dependencyInstances);
                    } 
                });
            }

        }
        return promise;
    };

    expandInstancesHashToDependencies = function(typeDefinition, instanceHash, dependencyInstances) {
        if( typeof typeDefinition._dependencies === "undefined" || typeDefinition._dependencies == null ) return;
        for( var dependency in instanceHash ) {
            for( var dependencyIndex=0; dependencyIndex<typeDefinition._dependencies.length; dependencyIndex++ ) {
                if( typeDefinition._dependencies[dependencyIndex] == dependency ) {
                    dependencyInstances[dependencyIndex] = instanceHash[dependency];
                }
            }
        }
    };

    expandDependenciesToInstanceHash = function(typeDefinition, dependencies, instanceHash) {
        for( var dependencyIndex=0; dependencyIndex<dependencies.length; dependencyIndex++ ) {
            instanceHash[typeDefinition._dependencies[dependencyIndex]] = dependencies[dependencyIndex];
        }
    };

    resolveDependencyInstancesThatHasNotBeenResolved = function(dependencyInstances, typeDefinition) {
        $.each(dependencyInstances, function(index, dependencyInstance) {
            if( dependencyInstance == null || typeof dependencyInstance == "undefined" ) {
                var dependency = typeDefinition._dependencies[index];
                dependencyInstances[index] = Bifrost.dependencyResolver.resolve(typeDefinition._namespace, dependency);
            }
        });
    };

    resolveDependencyInstances = function(instanceHash, typeDefinition) {
        var dependencyInstances = [];
        if( typeof instanceHash === "object" ) {
            expandInstancesHashToDependencies(typeDefinition, instanceHash, dependencyInstances);
        } 
        if( typeof typeDefinition._dependencies !== "undefined" && typeDefinition._dependencies.length > 0 ) {
            if( dependencyInstances.length > 0 ) {
                resolveDependencyInstancesThatHasNotBeenResolved(dependencyInstances, typeDefinition);
            } else {
                dependencyInstances = getDependencyInstances(typeDefinition._namespace, typeDefinition);
            }
        }
        return dependencyInstances;
    };

    addMissingDependenciesAsNullFromTypeDefinition = function (instanceHash, typeDefinition) {
        if (typeof typeDefinition._dependencies === "undefined") return;
        if (typeof instanceHash === "undefined" || instanceHash == null) return 
        for( var index=0; index<typeDefinition._dependencies.length; index++ ) {
            var dependency = typeDefinition._dependencies[index];
            if (!(dependency in instanceHash)) {
                instanceHash[dependency] = null;
            }
        }
    };

    handleOnCreate = function(type, lastDescendant, currentInstance) {
        if( currentInstance == null || typeof currentInstance === "undefined" ) return;

        if( typeof type !== "undefined" && typeof type.prototype !== "undefined" ) {
            handleOnCreate(type._super, lastDescendant, type.prototype);
        }

        if( currentInstance.hasOwnProperty("onCreated") && typeof currentInstance.onCreated === "function" ) {
            currentInstance.onCreated(lastDescendant);
        }
    };

    Bifrost.Type.scope = {
        getFor : function(namespace, name) {
            return null;
        }
    };

    Bifrost.Type.extend = function (typeDefinition) {
        throwIfMissingTypeDefinition(typeDefinition);
        throwIfTypeDefinitionIsObjectLiteral(typeDefinition);
        addStaticProperties(typeDefinition);
        setupDependencies(typeDefinition);
        typeDefinition._super = this;
        typeDefinition._typeId = Bifrost.Guid.create();
        return typeDefinition;
    };

    Bifrost.Type.scopeTo = function(scope) {
        if( typeof scope === "function" ) {
            this.scope = {
                getFor: scope
            }
        } else {
            if( typeof scope.getFor === "function" ) {
                this.scope = scope;
            } else {
                this.scope = {
                    getFor: function() {
                        return scope;
                    }
                }
            }
        }
        return this;
    };

    Bifrost.Type.defaultScope = function() {
        this.scope = {
            getFor: function() {
                return null;
            }
        };
        return this;
    };

    Bifrost.Type.requires = function () {
        for (var argumentIndex = 0; argumentIndex < arguments.length; argumentIndex++) {
            this._dependencies.push(arguments[argumentIndex]);
        }

        return this;
    };

    Bifrost.Type.create = function (instanceHash, isSuper) {
        var actualType = this;
        if( this._super != null ) {
            actualType.prototype = this._super.create(instanceHash, true);
        }
        addMissingDependenciesAsNullFromTypeDefinition(instanceHash, this);
        var dependencyInstances = resolveDependencyInstances(instanceHash, this);
        var scope = null;
        if( this != Bifrost.Type ) {
            this.instancesPerScope = this.instancesPerScope || {};

            scope = this.scope.getFor(this._namespace, this._name, this._typeId);
            if (scope != null && this.instancesPerScope.hasOwnProperty(scope)) {
                return this.instancesPerScope[scope];
            }
        }

        var instance = null;
        if( typeof this.createFunction !== "undefined" ) {
            instance = this.createFunction(this, dependencyInstances);
        } else {
            instance = new actualType();    
        }

        if( isSuper !== true ) {
            handleOnCreate(actualType, instance, instance);
        }


        instance._type = {
            _name : this._name,
            _namespace : this._namespace
        };

        if( scope != null ) {
            this.instancesPerScope[scope] = instance;
        }

        return instance;
    };

    Bifrost.Type.beginCreate = function(instanceHash) {
        var self = this;

        var promise = Bifrost.execution.Promise.create();
        var superPromise = Bifrost.execution.Promise.create();

        if( this._super != null ) {
            this._super.beginCreate().continueWith(function(_super, nextPromise) {
                superPromise.signal(_super);
            });
        } else {
            superPromise.signal(null);
        }

        superPromise.continueWith(function(_super, nextPromise) {
            self.prototype = _super;

            if( self._dependencies == null || 
                typeof self._dependencies == "undefined" || 
                self._dependencies.length == 0) {

                var instance = self.create();
                promise.signal(instance);
            } else {
                beginGetDependencyInstances(self._namespace, self)
                    .continueWith(function(dependencies, nextPromise) {
                        var dependencyInstances = {};
                        expandDependenciesToInstanceHash(self, dependencies, dependencyInstances);
                        if( typeof instanceHash === "object" ) {
                            for( var property in instanceHash ) {
                                dependencyInstances[property] = instanceHash[property];
                            }
                        }

                        var instance = self.create(dependencyInstances);
                        promise.signal(instance);
                    });

            }
        });

        return promise;
    };
})();
Bifrost.namespace("Bifrost", {
    Singleton: function (typeDefinition) {
        return Bifrost.Type.extend(typeDefinition).scopeTo(window);
    }
});
Bifrost.namespace("Bifrost");

Bifrost.DefinitionMustBeFunction = function(message) {
    this.prototype = Error.prototype;
	this.name = "DefinitionMustBeFunction";
    this.message = message || "Definition must be function";
}

Bifrost.MissingName = function(message) {
	this.prototype = Error.prototype;
	this.name = "MissingName";
	this.message = message || "Missing name";
}

Bifrost.Exception = (function(global, undefined) {
	function throwIfNameMissing(name) {
		if( !name || typeof name == "undefined" ) throw new Bifrost.MissingName();
	}
	
	function throwIfDefinitionNotAFunction(definition) {
		if( typeof definition != "function" ) throw new Bifrost.DefinitionMustBeFunction();
	}

	function getExceptionName(name) {
		var lastDot = name.lastIndexOf(".");
		if( lastDot == -1 && lastDot != name.length ) return name;
		return name.substr(lastDot+1);
	}
	
	function defineAndGetTargetScope(name) {
		var lastDot = name.lastIndexOf(".");
		if( lastDot == -1 ) {
			return global;
		}
		
		var ns = name.substr(0,lastDot);
		Bifrost.namespace(ns);
		
		var scope = global;
        var parts = ns.split('.');
		$.each(parts, function(index, part) {
			scope = scope[part];
		});
		
		return scope;
	}
	
	return {
		define: function(name, defaultMessage, definition) {
			throwIfNameMissing(name);
			
			var scope = defineAndGetTargetScope(name);
			var exceptionName = getExceptionName(name);
			
			var exception = function(message) {
				this.name = exceptionName;
				this.message = message || defaultMessage;
			}
			exception.prototype = Error.prototype;
			
			if( definition && typeof definition != "undefined" ) {
				throwIfDefinitionNotAFunction(definition);
				
				definition.prototype = Error.prototype;
				exception.prototype = new definition();
			}
			
			scope[exceptionName] = exception;
		}
	};
})(window);
Bifrost.namespace("Bifrost");
Bifrost.Exception.define("Bifrost.LocationNotSpecified","Location was not specified");
Bifrost.Exception.define("Bifrost.InvalidUriFormat", "Uri format specified is not valid");
Bifrost.Exception.define("Bifrost.ObjectLiteralNotAllowed", "Object literal is not allowed");
Bifrost.Exception.define("Bifrost.MissingTypeDefinition", "Type definition was not specified");
Bifrost.Exception.define("Bifrost.AsynchronousDependenciesDetected", "You should consider using Type.beginCreate() or dependencyResolver.beginResolve() for systems that has asynchronous dependencies");
Bifrost.Exception.define("Bifrost.UnresolvedDependencies", "Some dependencies was not possible to resolve");
Bifrost.namespace("Bifrost", {
	Guid : {
       	create: function() {
	    	function S4() {
	        	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	    	}
           	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
       	},
    	empty: "00000000-0000-0000-0000-000000000000"
	}
});
Bifrost.namespace("Bifrost");
Bifrost.hashString = (function() {
	return {
		decode: function(a) {
		    if (a == "") return { };
			a = a.replace("/?","").split('&');

		    var b = { };
		    for (var i = 0; i < a.length; ++i) {
		        var p = a[i].split('=', 2);
		        if (p.length != 2) continue;
		
				var value = decodeURIComponent(p[1].replace( /\+/g , " "));

				if( value !== "" && !isNaN(value) ) {
					value = parseFloat(value);
				}

		        b[p[0]] = value;
		    }
		    return b;
		}
	}
})();
Bifrost.namespace("Bifrost");
Bifrost.Uri = (function(window, undefined) {
	/* parseUri JS v0.1, by Steven Levithan (http://badassery.blogspot.com)
	Splits any well-formed URI into the following parts (all are optional):
	----------------------
	• source (since the exec() method returns backreference 0 [i.e., the entire match] as key 0, we might as well use it)
	• protocol (scheme)
	• authority (includes both the domain and port)
	    • domain (part of the authority; can be an IP address)
	    • port (part of the authority)
	• path (includes both the directory path and filename)
	    • directoryPath (part of the path; supports directories with periods, and without a trailing backslash)
	    • fileName (part of the path)
	• query (does not include the leading question mark)
	• anchor (fragment)
	*/
	function parseUri(sourceUri){
	    var uriPartNames = ["source","protocol","authority","domain","port","path","directoryPath","fileName","query","anchor"];
	    var uriParts = new RegExp("^(?:([^:/?#.]+):)?(?://)?(([^:/?#]*)(?::(\\d*))?)?((/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[\\?#]|$)))*/?)?([^?#/]*))?(?:\\?([^#]*))?(?:#(.*))?").exec(sourceUri);
	    var uri = {};

	    for(var i = 0; i < 10; i++){
	        uri[uriPartNames[i]] = (uriParts[i] ? uriParts[i] : "");
	    }

	    // Always end directoryPath with a trailing backslash if a path was present in the source URI
	    // Note that a trailing backslash is NOT automatically inserted within or appended to the "path" key
	    if(uri.directoryPath.length > 0){
	        uri.directoryPath = uri.directoryPath.replace(/\/?$/, "/");
	    }

	    return uri;
	}	
	
	
	function Uri(location) {
		var self = this;
		this.setLocation = function(location) {
			self.fullPath = location;
			location = location.replace("#","/");
		
			var result = parseUri(location);
		
			if( !result.protocol || typeof result.protocol == "undefined" ) {
				throw new Bifrost.InvalidUriFormat("Uri ('"+location+"') was in the wrong format");
			}

			self.scheme = result.protocol;
			self.host = result.domain;
			self.path = result.path;
			self.anchor = result.anchor;

			self.queryString = result.query;
			self.port = parseInt(result.port);
			self.parameters = Bifrost.hashString.decode(result.query);
			
			self.isSameAsOrigin = (window.location.protocol == result.protocol+":" &&
				window.location.hostname == self.host); 
		}
		
		this.setLocation(location);
	}
	
	function throwIfLocationNotSpecified(location) {
		if( !location || typeof location == "undefined" ) throw new Bifrost.LocationNotSpecified();
	}
	
	
	return {
		create: function(location) {
			throwIfLocationNotSpecified(location);
		
			var uri = new Uri(location);
			return uri;
		},
	};
})(window);
Bifrost.namespace("Bifrost", {
    namespaces: Bifrost.Singleton(function() {
        var self = this;

        this.stripPath = function (path) {
            if (path.startsWith("/")) {
                path = path.substr(1);
            }
            if (path.endsWith("/")) {
                path = path.substr(0, path.length - 1);
            }
            return path;
        };

        this.initialize = function () {
            var scripts = Bifrost.assetsManager.getScripts();
            if (typeof scripts === "undefined") return;

            $.each(scripts, function (index, fullPath) {
                var path = Bifrost.path.getPathWithoutFilename(fullPath);
                path = self.stripPath(path);

                for (var mapperKey in Bifrost.namespaceMappers) {
                    var mapper = Bifrost.namespaceMappers[mapperKey];
                    if (typeof mapper.hasMappingFor === "function" && mapper.hasMappingFor(path)) {
                        var namespacePath = mapper.resolve(path);
                        var namespace = Bifrost.namespace(namespacePath);

                        var root = "/" + path + "/";
                        namespace._path = root;

                        if (typeof namespace._scripts === "undefined") {
                            namespace._scripts = [];
                        }

                        var fileIndex = fullPath.lastIndexOf("/");
                        var file = fullPath.substr(fileIndex + 1);
                        var extensionIndex = file.lastIndexOf(".");
                        var system = file.substr(0, extensionIndex);

                        namespace._scripts.push(system);
                    }
                }
            });
        };
    })
});
Bifrost.namespace("Bifrost", {
    namespaceMappers: {}
});
Bifrost.namespace("Bifrost", {
    StringMapping: Bifrost.Type.extend(function (format, mappedFormat) {
        var self = this;

        this.format = format;
        this.mappedFormat = mappedFormat;

        var placeholderExpression = "\{[a-zA-Z]+\}";
        var placeholderRegex = new RegExp(placeholderExpression, "g");

        var wildcardExpression = "\\*{2}[//||\.]";
        var wildcardRegex = new RegExp(wildcardExpression, "g");

        var combinedExpression = "(" + placeholderExpression + ")*(" + wildcardExpression + ")*";
        var combinedRegex = new RegExp(combinedExpression, "g");

        var components = [];
        

        var resolveExpression = format.replace(combinedRegex, function(match) {
            if( typeof match === "undefined" || match == "") return "";
            components.push(match);
            if( match.indexOf("**") == 0) return "([\\w.//]*)";
            return "([\\w.]*)";
        });

        var mappedFormatWildcardMatch = mappedFormat.match(wildcardRegex);
        var formatRegex = new RegExp(resolveExpression);

        this.matches = function (input) {
            var match = input.match(formatRegex);
            if (match) {
                return true;
            }
            return false;
        };

        this.getValues = function (input) {
            var output = {};
            var match = input.match(formatRegex);
            $.each(components, function (i, c) {
                var component = c.substr(1, c.length - 2);
                var value = match[i + 1];
                if (c.indexOf("**") != 0) {
                    output[component] = value;
                }
            });

            return output;
        };

        this.resolve = function (input) {
            var match = input.match(formatRegex);
            var result = mappedFormat;
            var wildcardOffset = 0;

            $.each(components, function (i, c) {
                var value = match[i + 1];
                if (c.indexOf("**") == 0) {
                    var wildcard = mappedFormatWildcardMatch[wildcardOffset];
                    value = value.replaceAll(c[2], wildcard[2]);
                    result = result.replace(wildcard, value);
                    wildcardOffset++;
                } else {
                    result = result.replace(c, value);
                }
            });

            return result;
        };
    })
});
Bifrost.namespace("Bifrost", {
    StringMapper: Bifrost.Type.extend(function () {
        var self = this;

        this.mappings = [];

        this.hasMappingFor = function (input) {
            var found = false;
            $.each(self.mappings, function (i, m) {
                if (m.matches(input)) {
                    found = true;
                    return false;
                }
            });
            return found;
        };

        this.getMappingFor = function (input) {
            var found;
            $.each(self.mappings, function (i, m) {
                if (m.matches(input)) {
                    found = m;
                    return false;
                }
            });

            if (typeof found !== "undefined") {
                return found;
            }

            throw {
                name: "ArgumentError",
                message: "String mapping for (" + input + ") could not be found"
            }
        };

        this.resolve = function (input) {
            try {
                if( input === null || typeof input === "undefined" ) return "";
                
                var mapping = self.getMappingFor(input);
                return mapping.resolve(input);
            } catch (e) {
                return "";
            }
        };

        this.addMapping = function (format, mappedFormat) {
            var mapping = Bifrost.StringMapping.create({
                format: format,
                mappedFormat: mappedFormat
            });
            self.mappings.push(mapping);
        };
    })
});
Bifrost.namespace("Bifrost", {
    uriMappers: {
    }
});
Bifrost.namespace("Bifrost.validation");
Bifrost.Exception.define("Bifrost.validation.OptionsNotDefined", "Option was undefined");
Bifrost.Exception.define("Bifrost.validation.NotANumber", "Value is not a number");
Bifrost.Exception.define("Bifrost.validation.ValueNotSpecified","Value is not specified");
Bifrost.Exception.define("Bifrost.validation.MinNotSpecified","Min is not specified");
Bifrost.Exception.define("Bifrost.validation.MaxNotSpecified","Max is not specified");
Bifrost.Exception.define("Bifrost.validation.MinLengthNotSpecified","Min length is not specified");
Bifrost.Exception.define("Bifrost.validation.MaxLengthNotSpecified","Max length is not specified");
Bifrost.Exception.define("Bifrost.validation.MissingExpression","Expression is not specified");
Bifrost.namespace("Bifrost.validation");
Bifrost.validation.ruleHandlers = (function () {
    return Bifrost.validation.ruleHandlers || { };
})();
Bifrost.namespace("Bifrost.validation");
Bifrost.validation.Rule = (function () {
    function Rule(ruleName, options) {
        var self = this;
        this.name = ruleName;
        this.handler = Bifrost.validation.ruleHandlers[ruleName];

        options = options || {};

        this.message = options.message || "";
        this.options = {};
        Bifrost.extend(this.options, options);

        this.validate = function (value) {
            return self.handler.validate(value, self.options);
        }
    }

    return {
        create: function (ruleName, options) {
            var rule = new Rule(ruleName, options);
            return rule;
        }
    };
})();
Bifrost.namespace("Bifrost.validation");
Bifrost.validation.Validator = (function () {
    function Validator(options) {
        var self = this;
        this.isValid = ko.observable(true);
        this.message = ko.observable("");
        this.rules = [];
        options = options || {};

        this.setOptions = function (options) {
            for (var property in options) {
                this.rules.push(Bifrost.validation.Rule.create(property, options[property] || {}));
            }
        };

        this.validate = function(value) {
            $.each(self.rules, function(index, rule) {
                if (!rule.validate(value)) {
                    self.isValid(false);
                    self.message(rule.message);
                    return false;
                } else {
                    self.isValid(true);
                    self.message("");
                }
            });
        };

        this.validateSilently = function (value) {
            $.each(self.rules, function (index, rule) {
                if (!rule.validate(value)) {
                    self.isValid(false);
                    return false;
                } else {
                    self.isValid(true);
                }
            });
        };

        this.setOptions(options);
    }

    return {
        create: function (options) {
            var validator = new Validator(options);
            return validator;
        },
        applyTo: function (itemOrItems, options) {
            var self = this;

            function applyToItem(item) {
                var validator = self.create(options);
                item.validator = validator;
            }

            if (itemOrItems instanceof Array) {
                $.each(itemOrItems, function (index, item) {

                    applyToItem(item);
                });
            } else {
                applyToItem(itemOrItems);
            }
        },
        applyToProperties: function (item, options) {
            var items = [];

            for (var property in item) {
                if (item.hasOwnProperty(property)) {
                    items.push(item[property]);
                }
            }
            this.applyTo(items, options);
        }
    }
})();
if (typeof ko !== 'undefined') {
    Bifrost.namespace("Bifrost.validation", {
        ValidationSummary: function (commands) {
            var self = this;
            this.commands = ko.observable(commands);
            this.messages = ko.computed(function () {
                var actualMessages = [];
                $.each(self.commands(), function (commandIndex, command) {
                    var unwrappedCommand = ko.utils.unwrapObservable(command);
                    
                    $.each(unwrappedCommand.validators, function (validatorIndex, validator) {
                        if (!validator.isValid()) {
                            actualMessages.push(validator.message());
                        }
                    });
                });
                return actualMessages;
            });
        }
    });

    ko.bindingHandlers.validationSummaryFor = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var target = ko.bindingHandlers.validationSummaryFor.getValueAsArray(valueAccessor);
            var validationSummary = new Bifrost.validation.ValidationSummary(target);
            ko.utils.domData.set(element, 'validationsummary', validationSummary);
            ko.applyBindingsToNode(element, { foreach: validationSummary.messages }, validationSummary);
        },
        update: function (element, valueAccessor) {
            var validationSummary = ko.utils.domData.get(element, 'validationsummary');
            validationSummary.commands = ko.bindingHandlers.validationSummaryFor.getValueAsArray(valueAccessor);
        },
        getValueAsArray: function (valueAccessor) {
            var target = ko.utils.unwrapObservable(valueAccessor());
            if (!(target instanceof Array)) { target = [target]; }
            return target;
        }
    };
}
if (typeof ko !== 'undefined') {
    ko.bindingHandlers.validationMessageFor = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            var validator = value.validator;

            validator.isValid.subscribe(function (newValue) {
                if (newValue == true) {
                    $(element).hide();
                } else {
                    $(element).show();
                }
            });
            ko.applyBindingsToNode(element, { text: validator.message }, validator);
        }
    };
}
if (typeof ko !== 'undefined') {
    ko.extenders.validation = function (target, options) {
        Bifrost.validation.Validator.applyTo(target, options);
        target.subscribe(function (newValue) {
            target.validator.validate(newValue);
        });

        // Todo : look into aggressive validation
        //target.validator.validate(target());
        return target;
    };
}
Bifrost.namespace("Bifrost.validation", {
    validationService: Bifrost.Singleton(function () {
        this.getForCommand = function (name) {
            var promise = Bifrost.execution.Promise.create();

            $.getJSON("/Bifrost/Validation/GetForCommand?name=" + name, function (e) {
                promise.signal(e.properties);
            });
            return promise;
        }
    })
});
Bifrost.WellKnownTypesDependencyResolver.types.validationService = Bifrost.validation.validationService;
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.required = {
    validate: function (value, options) {
        return !(typeof value == "undefined" || value == "");
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.minLength = {
    validate: function (value, options) {
        if (typeof options === "undefined" || typeof options.length === "undefined") {
            throw {
                message: "length is not specified for the minLength validator"
            }
        }

        if (typeof value === "undefined") {
            return false;

        }

        return value.length >= options.length;
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.maxLength = {
    validate: function (value, options) {
        if (typeof options === "undefined" || typeof options.length === "undefined") {
            throw {
                message: "length is not specified for the maxLength validator"
            }
        }

        if (typeof value === "undefined") {
            return false;
        }

        return value.length <= options.length;
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.range = {
    isNumber: function (number) {
        return !isNaN(parseFloat(number)) && isFinite(number);
    },
    throwIfOptionsUndefined: function (options) {
        if (typeof options === "undefined") {
            throw new Bifrost.validation.OptionsNotDefined();
        }
    },
    throwIfMinUndefined: function (options) {
        if (typeof options.min === "undefined") {
            throw new Bifrost.validation.MinNotSpecified();
        }
    },
    throwIfMaxUndefined: function (options) {
        if (typeof options.max === "undefined") {
            throw new Bifrost.validation.MaxNotSpecified();
        }
    },
    throwIfNotANumber: function (value) {
        if (!Bifrost.isNumber(value)) {
            throw new Bifrost.validation.NotANumber("Value " + value + " is not a number");
        }
    },

    validate: function (value, options) {
        this.throwIfNotANumber(value);
        this.throwIfOptionsUndefined(options);
        this.throwIfMaxUndefined(options);
        this.throwIfMinUndefined(options);

        if (typeof value === "undefined") {
            return false;
        }

        return value <= options.max && value >= options.min;
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.lessThan = {
    throwIfOptionsUndefined: function (options) {
        if (typeof options === "undefined") {
            throw new Bifrost.validation.OptionsNotDefined();
        }
    },
    throwIfValueUndefined: function (options) {
        if (typeof options.value === "undefined") {
            throw new Bifrost.validation.ValueNotSpecified();
        }
    },
    throwIfNotANumber: function (value) {
        if (!Bifrost.isNumber(value)) {
            throw new Bifrost.validation.NotANumber("Value " + value + " is not a number");
        }
    },

    validate: function (value, options) {
        this.throwIfNotANumber(value);
        this.throwIfOptionsUndefined(options);
        this.throwIfValueUndefined(options);
        if (typeof value === "undefined") {
            return false;
        }
        return parseFloat(value) < parseFloat(options.value);
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.greaterThan = {
    throwIfOptionsUndefined: function (options) {
        if (!options || typeof options === "undefined") {
            throw new Bifrost.validation.OptionsNotDefined();
        }
    },
    throwIfValueUndefined: function (options) {
        if (typeof options.value === "undefined") {
            throw new Bifrost.validation.ValueNotSpecified();
        }
    },
    throwIfNotANumber: function (value) {
        if (!Bifrost.isNumber(value)) {
            throw new Bifrost.validation.NotANumber("Value " + value + " is not a number");
        }
    },

    validate: function (value, options) {
        this.throwIfNotANumber(value);
        this.throwIfOptionsUndefined(options);
        this.throwIfValueUndefined(options);
        if (typeof value === "undefined") {
            return false;
        }
        return parseFloat(value) > parseFloat(options.value);
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");
Bifrost.validation.ruleHandlers.email = {
    regex : /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/,

    validate: function (value, options) {
        return (value.match(this.regex) == null) ? false : true;
    }
};
Bifrost.namespace("Bifrost.validation.ruleHandlers");

Bifrost.validation.ruleHandlers.regex = {
    throwIfOptionsUndefined: function (options) {
        if (typeof options === "undefined") {
            throw new Bifrost.validation.OptionsNotDefined();
        }
    },

    throwIfExpressionMissing: function (options) {
        if (!options.expression) {
            throw new Bifrost.validation.MissingExpression();
        }
    },

    validate: function (value, options) {
        this.throwIfOptionsUndefined(options);
        this.throwIfExpressionMissing(options);

        return (value.match(options.expression) == null) ? false : true;
    }
};
if (typeof ko !== 'undefined') {
    ko.bindingHandlers.command = {
        init: function (element, valueAccessor, allBindingAccessor, viewModel) {
			var value = valueAccessor();
			var command;
			var contextBound = false;
			if( typeof value.canExecute === "undefined" ) {
				command = value.target;
				
				command.parameters = command.parameters || {};
				var parameters = value.parameters || {};
				
				for( var parameter in parameters ) {
					var parameterValue = parameters[parameter];
					
					if( command.parameters.hasOwnProperty(parameter) &&
						ko.isObservable(command.parameters[parameter]) ) {
						command.parameters[parameter](parameterValue);
					} else {
						command.parameters[parameter] = ko.observable(parameterValue);
					}
				}
				contextBound = true;
			} else {
				command = value;
			}
            ko.applyBindingsToNode(element, { click: function() {
				// TODO: Investigate further - idea was to support a "context-sensitive" way of dynamically inserting 
				// parameters before execution of the command
				/*
				if( !contextBound ) {
					command.parameters = command.parameters || {};					
					for( var parameter in command.parameters ) {
						if( viewModel.hasOwnProperty(parameter) ) {
							var parameterValue = viewModel[parameter];
							if( ko.isObservable(command.parameters[parameter]) ) {
								command.parameters[parameter](parameterValue);
							} else {
								command.parameters[parameter] = parameterValue;								
							}
						}
					}
				}
				*/
	
				command.execute();
			}}, viewModel);
        }
    };
}
Bifrost.namespace("Bifrost.commands", {
    commandCoordinator: Bifrost.Singleton(function () {
        var baseUrl = "/Bifrost/CommandCoordinator";
        function sendToHandler(url, data, completeHandler) {
            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                data: data,
                contentType: 'application/json; charset=utf-8',
                complete: completeHandler
            });
        }

        function handleCommandCompletion(jqXHR, command, commandResult) {
            if (jqXHR.status === 200) {
                command.result = Bifrost.commands.CommandResult.createFrom(commandResult);
                command.hasExecuted = true;
                if (command.result.success === true) {
                    command.onSuccess();
                } else {
                    command.onError();
                }
            } else {
                command.result.success = false;
                command.result.exception = {
                    Message: jqXHR.responseText,
                    details: jqXHR
                };
                command.onError();
            }
            command.onComplete();
        }


        this.handle = function (command) {
            var promise = Bifrost.execution.Promise.create();
            var commandDescriptor = Bifrost.commands.CommandDescriptor.createFrom(command);
            var methodParameters = {
                commandDescriptor: JSON.stringify(commandDescriptor)
            };

            sendToHandler(baseUrl + "/Handle", JSON.stringify(methodParameters), function (jqXHR) {
                var commandResult = Bifrost.commands.CommandResult.createFrom(jqXHR.responseText);
                promise.signal(commandResult);
            });

            return promise;
        };
        this.handleForSaga = function (saga, commands, options) {
            throw "not implemented";
        };
    })
});
Bifrost.WellKnownTypesDependencyResolver.types.commandCoordinator = Bifrost.commands.commandCoordinator;
Bifrost.namespace("Bifrost.commands", {
    commandValidationService: Bifrost.Singleton(function (validationService) {
        var self = this;
        this.validationService = validationService;

        function shouldSkipProperty(target, property) {
            if (!target.hasOwnProperty(property)) return true;
            if (ko.isObservable(target[property])) return false;
            if (typeof target[property] === "function") return true;
            if (property == "_type") return true;
            if (property == "_namespace") return true;
            if ((target[property].prototype != null) && (target[property] instanceof Bifrost.Type)) return true;

            return false;
        }


        function extendProperties(target, validators) {
            for (var property in target) {
                if (shouldSkipProperty(target, property)) continue;

                if (ko.isObservable(target[property])) {
                    target[property].extend({ validation: {} });
                    target[property].validator.propertyName = property;
                    validators.push(target[property].validator);
                } else if (typeof target[property] === "object") {
                    extendProperties(target[property], validators);
                }
            }
        }

        function validatePropertiesFor(target, result, silent) {
            for (var property in target) {
                if (shouldSkipProperty(target, property)) continue;

                if (typeof target[property].validator !== "undefined") {
                    if (silent === true) {
                        target[property].validator.validateSilently(target[property]());
                    } else {
                        target[property].validator.validate(target[property]());
                    }

                    if (target[property].validator.isValid() == false) {
                        result.valid = false;
                    }
                } else if (typeof target[property] === "object") {
                    validatePropertiesFor(target[property], result, silent);
                }
            }
        }


        function applyValidationMessageToMembers(command, members, message) {
            for (var memberIndex = 0; memberIndex < members.length; memberIndex++) {
                var path = members[memberIndex].split(".");
                var property = null;
                var target = command;
                $.each(path, function (pathIndex, member) {
                    property = member.toCamelCase();
                    if (property in target) {
                        if (typeof target[property] === "object") {
                            target = target[property];
                        }
                    }
                });

                if (property != null) {
                    var member = target[property];

                    if (typeof member.validator !== "undefined") {
                        member.validator.isValid(false);
                        member.validator.message(message);
                    }
                }

            }
        }

        this.applyValidationResultToProperties = function (command, validationResults) {

            for (var i = 0; i < validationResults.length; i++) {
                var validationResult = validationResults[i];
                var message = validationResult.errorMessage;
                var memberNames = validationResult.memberNames;
                if (memberNames.length > 0) {
                    applyValidationMessageToMembers(command, memberNames, message);
                }
            }
        };

        this.validate = function (command) {
            var result = { valid: true };
            validatePropertiesFor(command, result);
            return result;
        };

        this.applyRulesTo = function (command) {
            var validators = [];
            extendProperties(command, validators);
            self.validationService.getForCommand(command.name).continueWith(function (rules) {
                for (var rule in rules) {
                    var path = rule.split(".");
                    var member = command;
                    for (var i in path) {

                        var step = path[i];
                        if (step in member) {
                            member = member[step];
                        } else {
                            console.log( "Error applying validation rules: " + step + " is not a member of " + member + " (" + rule + ")");
                        }
                    }

                    if (typeof member.validator !== "undefined") {
                        member.validator.setOptions(rules[rule]);
                    }
                }

                validatePropertiesFor(command, { valid: true }, true);
            });
            return validators;
        };
    })
});
Bifrost.namespace("Bifrost.commands", {
    Command: Bifrost.Type.extend(function (commandCoordinator, commandValidationService, commandSecurityService, options) {
        var self = this;
        this.name = "";
        this.targetCommand = this;
        this.validators = ko.observableArray();
        this.validationMessages = ko.observableArray();

        this.securityContext = ko.observable(null);

        this.isBusy = ko.observable(false);
        this.isValid = ko.computed(function () {
            var valid = true;
            $.each(self.validators(), function (index, validator) {
                if (ko.isObservable(validator.isValid) && validator.isValid() == false) {
                    valid = false;
                    return false;
                }
            });

            if (self.validationMessages().length > 0) {
                return false;
            }

            return valid;
        });

        this.isAuthorized = ko.observable(false);
        this.canExecute = ko.computed(function () {
            return self.isValid() && self.isAuthorized();
        });

        this.failedCallbacks = [];
        this.succeededCallbacks = [];
        this.completedCallbacks = [];

        this.commandCoordinator = commandCoordinator;
        this.commandValidationService = commandValidationService;
        this.commandSecurityService = commandSecurityService;

        this.options = {
            beforeExecute: function () { },
            failed: function () { },
            succeeded: function () { },
            completed: function () { },
            properties: {}
        };

        this.failed = function (callback) {
            self.failedCallbacks.push(callback);
            return self;
        };
        this.succeeded = function (callback) {
            self.succeededCallbacks.push(callback);
            return self;
        };
        this.completed = function (callback) {
            self.completedCallbacks.push(callback);
            return self;
        };

        this.setOptions = function (options) {
            Bifrost.extend(self.options, options);
            if (typeof options.name !== "undefined" && typeof options.name === "string") {
                self.name = options.name;
            }
        };

        this.copyPropertiesFromOptions = function (lastDescendant) {
            for (var property in lastDescendant.options.properties) {
                var value = lastDescendant.options.properties[property];
                if (!ko.isObservable(value)) {
                    value = ko.observable(value);
                }

                lastDescendant[property] = value;
            }
        };

        this.makePropertiesObservable = function (lastDescendant) {
            for (var property in lastDescendant) {
                if (lastDescendant.hasOwnProperty(property) && !self.hasOwnProperty(property)) {
                    var value = null;
                    var propertyValue = lastDescendant[property];

                    if (!ko.isObservable(propertyValue) &&
                         (typeof propertyValue != "object" || Bifrost.isArray(propertyValue))) {

                        if (typeof propertyValue !== "function") {
                            if (Bifrost.isArray(propertyValue)) {
                                value = ko.observableArray(propertyValue);
                            } else {
                                value = ko.observable(propertyValue);
                            }
                            lastDescendant[property] = value;
                        }
                    }
                }
            }
        };

        this.onBeforeExecute = function () {
            self.options.beforeExecute();
        };

        this.onFailed = function (commandResult) {
            self.options.failed(commandResult);

            $.each(self.failedCallbacks, function (index, callback) {
                callback(commandResult);
            });
        };

        this.onSucceeded = function (commandResult) {
            self.options.succeeded(commandResult);

            $.each(self.succeededCallbacks, function (index, callback) {
                callback(commandResult);
            });
        };

        this.onCompleted = function (commandResult) {
            self.options.completed(commandResult);

            $.each(self.completedCallbacks, function (index, callback) {
                callback(commandResult);
            });
        };

        this.handleCommandResult = function (commandResult) {
            self.isBusy(false);
            if (typeof commandResult.commandValidationMessages !== "undefined") {
                self.validationMessages(commandResult.commandValidationMessages);
            }

            if (commandResult.success === false || commandResult.invalid === true) {
                if (commandResult.invalid && typeof commandResult.validationResults !== "undefined") {
                    self.commandValidationService.applyValidationResultToProperties(self.targetCommand, commandResult.validationResults);
                }
                self.onFailed(commandResult);
            } else {
                self.onSucceeded(commandResult);
            }
            self.onCompleted(commandResult);
        };

        this.getCommandResultFromValidationResult = function (validationResult) {
            var result = Bifrost.commands.CommandResult.create();
            result.invalid = true;
            return result;
        };

        this.execute = function () {
            self.isBusy(true);
            self.onBeforeExecute();
            var validationResult = self.commandValidationService.validate(this);
            if (validationResult.valid === true) {
                self.commandCoordinator.handle(self.targetCommand).continueWith(function (commandResult) {
                    self.handleCommandResult(commandResult);
                });
            } else {
                var commandResult = self.getCommandResultFromValidationResult(validationResult);
                self.handleCommandResult(commandResult);
            }
        };


        this.onCreated = function (lastDescendant) {
            self.targetCommand = lastDescendant;
            if (typeof options !== "undefined") {
                this.setOptions(options);
                this.copyPropertiesFromOptions(lastDescendant);
            }
            this.makePropertiesObservable(lastDescendant);
            if (typeof lastDescendant.name !== "undefined" && lastDescendant.name != "") {
                var validators = commandValidationService.applyRulesTo(lastDescendant);
                if (Bifrost.isArray(validators) && validators.length > 0) self.validators(validators);
            }
            commandSecurityService.getContextFor(lastDescendant).continueWith(function (securityContext) {
                lastDescendant.securityContext(securityContext);

                if (ko.isObservable(securityContext.isAuthorized)) {
                    lastDescendant.isAuthorized(securityContext.isAuthorized());
                    securityContext.isAuthorized.subscribe(function (newValue) {
                        lastDescendant.isAuthorized(newValue);
                    });
                }
            });
        };
    })
});
Bifrost.namespace("Bifrost.commands");
Bifrost.commands.CommandDescriptor = function(command) {
    var self = this;

    var builtInCommand = {};
    if (typeof Bifrost.commands.Command !== "undefined") {
        builtInCommand = Bifrost.commands.Command.create();
    }

    function shouldSkipProperty(target, property) {
        if (!target.hasOwnProperty(property)) return true;
        if (builtInCommand.hasOwnProperty(property)) return true;
        if (ko.isObservable(target[property])) return false;
        if (typeof target[property] === "function") return true;
        if (target[property] instanceof Bifrost.Type) return true;
        if (property == "_type") return true;
        if (property == "_namespace") return true;

        return false;
    }

    function getPropertiesFromCommand(command) {
        var properties = {};

        for (var property in command) {
            if (!shouldSkipProperty(command, property) ) {
                properties[property] = command[property];
            }
        }
        return properties;
    }

    this.name = command.name;
    this.id = Bifrost.Guid.create();

    var properties = getPropertiesFromCommand(command);
    var commandContent = ko.toJS(properties);
    commandContent.Id = Bifrost.Guid.create();
    this.command = ko.toJSON(commandContent);
};


Bifrost.commands.CommandDescriptor.createFrom = function (command) {
    var commandDescriptor = new Bifrost.commands.CommandDescriptor(command);
    return commandDescriptor;
};

Bifrost.namespace("Bifrost.commands");
Bifrost.commands.CommandResult = (function () {
    function CommandResult(existing) {
        var self = this;
        this.isEmpty = function () {
            return self.commandId === Bifrost.Guid.empty;
        };

        if (typeof existing !== "undefined") {
            Bifrost.extend(this, existing);
        } else {
            this.commandName = "";
            this.commandId = Bifrost.Guid.empty;
            this.validationResults = [];
            this.success = true;
            this.invalid = false;
            this.exception = undefined;
        }
    }

    return {
        create: function() {
            var commandResult = new CommandResult();
            return commandResult;
        },
        createFrom: function (result) {
            var existing = typeof result === "string" ? $.parseJSON(result) : result;
            var commandResult = new CommandResult(existing);
            return commandResult;
        }
    };
})();
Bifrost.dependencyResolvers.command = {
    canResolve: function (namespace, name) {
        if (typeof commands !== "undefined") {
            return name in commands;
        }
        return false;
    },

    resolve: function (namespace, name) {
        return commands[name].create();
    }
};
Bifrost.namespace("Bifrost.commands", {
    CommandSecurityContext: Bifrost.Type.extend(function() {
        var self = this;

        this.isAuthorized = ko.observable(false);

    })
});
Bifrost.namespace("Bifrost.commands", {
    commandSecurityContextFactory: Bifrost.Singleton(function () {
        var self = this;

        this.create = function () {
            var context = Bifrost.commands.CommandSecurityContext.create();
            return context;
        };
    })
});
Bifrost.namespace("Bifrost.commands", {
    commandSecurityService: Bifrost.Singleton(function (commandSecurityContextFactory) {
        var self = this;

        this.commandSecurityContextFactory = commandSecurityContextFactory;

        this.getContextFor = function (command) {
            var promise = Bifrost.execution.Promise.create();
            var context = self.commandSecurityContextFactory.create();
            if( typeof command.name == "undefined" || command.name == "" ) {
                promise.signal(context);
            } else {
                var url = "/Bifrost/CommandSecurity/GetForCommand?commandName=" + command.name;
                $.getJSON(url, function (e) {
                    context.isAuthorized(e.isAuthorized);
                    promise.signal(context);
                });
            }

            return promise;
        };
    })
});
Bifrost.namespace("Bifrost.read", {
    queryService: Bifrost.Singleton(function () {
        var self = this;

        function createDescriptorFrom(query) {
            var descriptor = {
                nameOfQuery: query.name,
                parameters: {}
            };

            for (var property in query) {
                if (ko.isObservable(query[property]) == true) {
                    descriptor.parameters[property] = query[property]();
                }
            }

            return descriptor;
        }


        this.execute = function (query) {
            var promise = Bifrost.execution.Promise.create();
            var descriptor = createDescriptorFrom(query);

            var methodParameters = {
                descriptor: JSON.stringify(descriptor)
            };

            $.ajax({
                url: "/Bifrost/Query/Execute",
                type: 'POST',
                dataType: 'json',
                data: JSON.stringify(methodParameters),
                contentType: 'application/json; charset=utf-8',
                complete: function (result) {
                    var items = $.parseJSON(result.responseText);
                    promise.signal(items);
                }
            });

            return promise;
        }
    })
});
Bifrost.namespace("Bifrost.read", { 
	readModelMapper : Bifrost.Type.extend(function () {
		"use strict";
		var self = this;

		function copyProperties (from, to) {
			for (var prop in from){
				if (typeof to[prop] !== "undefined" && typeof to[prop] === typeof from[prop]){
					if(Bifrost.isObject( to[prop] ) ){
						copyProperties(from[prop], to[prop]);
					} else {
						to[prop] = from[prop];
					}
				}
			}
		}

		function mapSingleInstance(readModel, data){
			var instance = readModel.create();
			copyProperties(data, instance);
			return instance;
		}

		function mapMultipleInstances(readModel, data){
			var mappedInstances = [];
			for (var i = 0; i < data.length; i++) {
				var singleData = data[i];
				mappedInstances.push(mapSingleInstance(readModel, singleData));
			}
			return mappedInstances;
		}

		this.mapDataToReadModel = function(readModel, data) {
			if(Bifrost.isArray(data)){
				return mapMultipleInstances(readModel, data);
			} else {
				return mapSingleInstance(readModel, data);
			}
		};



	})
});
Bifrost.namespace("Bifrost.read", {
    Query: Bifrost.Type.extend(function (queryService, readModelMapper) {
        var self = this;
        this.name = "";
        this.queryService = queryService;
        this.queryables = {};

        this.completedCallbacks = [];

        this.currentQuery = 0;

        this.isQueryingEnabled = true;

        this.target = this;

        function createQueryable() {
            var observable = ko.observableArray();
            observable.execute = function () {
                if (self.isAllParametersSet() == false) return;

                var query = function (queryNumber) {
                    var queryNumber = queryNumber;
                    self.queryService.execute(self.target).continueWith(function (data) {
                        if (queryNumber == self.currentQuery) {
                            var mappedReadModels = readModelMapper.mapDataToReadModel(self.target.readModel, data);
                            observable(mappedReadModels);
                            self.onCompleted(mappedReadModels);
                        }
                    });
                }

                self.currentQuery = self.currentQuery+1;
                new query(self.currentQuery);
            };
            return observable;
        }

        function observeProperties(query) {
            for (var property in query) {
                if (ko.isObservable(query[property]) == true) {
                    query[property].subscribe(function () {
                        query.execute();
                    });
                }
            }
        }

        this.isAllParametersSet = function () {
            var isSet = false;
            var hasParameters = false;
            for (var property in self.target) {
                if (ko.isObservable(self.target[property]) == true) {
                    hasParameters = true;
                    if (typeof self.target[property]() != "undefined" && self.target[property]() != null) {
                        isSet = true;
                    }
                }
            }
            if (hasParameters == false) return true;

            return isSet;
        }

        this.completed = function (callback) {
            self.completedCallbacks.push(callback);
            return self;
        };

        this.onCompleted = function (data) {
            $.each(self.completedCallbacks, function (index, callback) {
                callback(data);
            });
        };


        this.execute = function () {
            if( self.isQueryingEnabled ) {
                for (var queryable in self.queryables) {
                    self.queryables[queryable].execute();
                }
            }
        };

        this.setParameters = function (parameters) {
            try {
                self.isQueryingEnabled = false;
                for (var property in parameters) {
                    if (self.target.hasOwnProperty(property) && ko.isObservable(self.target[property]) == true) {
                        self.target[property](parameters[property]);
                    }
                }
            } catch(ex) {}

            self.isQueryingEnabled = true;
        };


        this.all = function (execute) {
            if (typeof execute === "undefined") execute = true;
            if (typeof self.queryables.all === "undefined") self.queryables.all = createQueryable();
            if (execute === true) {
                self.queryables.all.execute();
            }
            return self.queryables.all;
        };

        this.onCreated = function (query) {
            self.target = query;
            observeProperties(query);
        };
    })
});
Bifrost.namespace("Bifrost.read", {
    ReadModel: Bifrost.Type.extend(function () {
        var self = this;
        var actualReadModel = this;


        this.copyTo = function (target) {
            for (var property in actualReadModel) {
                if (actualReadModel.hasOwnProperty(property) && property.indexOf("_") != 0) {
                    var value = ko.utils.unwrapObservable(actualReadModel[property]);
                    if (!target.hasOwnProperty(property)) {
                        target[property] = ko.observable(value);
                    } else {
                        if (ko.isObservable(target[property])) {
                            target[property](value);
                        } else {
                            target[property] = value;
                        }
                    }
                }
            }
        };

        this.onCreated = function (lastDescendant) {
            actualReadModel = lastDescendant;
        };
    })
});
Bifrost.namespace("Bifrost.read", {
	ReadModelOf: Bifrost.Type.extend(function(readModelMapper) {
	    var self = this;
	    this.name = "";
	    this.target = null;
	    this.readModelType = Bifrost.Type.extend(function () { });

		this.instance = ko.observable();

		this.instanceMatching = function (propertyFilters) {
		    var methodParameters = {
		        descriptor: JSON.stringify({
		            readModel: self.target.name,
		            propertyFilters: propertyFilters
		        })
		    };

		    $.ajax({
		        url: "/Bifrost/ReadModel/InstanceMatching",
		        type: 'POST',
		        dataType: 'json',
		        data: JSON.stringify(methodParameters),
		        contentType: 'application/json; charset=utf-8',
		        complete: function (result) {
		            var item = $.parseJSON(result.responseText);
					var mappedReadModel = readModelMapper.mapDataToReadModel(self.target.readModel, data);
		            self.instance(mappedReadModel);
		        }
		    });
		};


		this.onCreated = function (lastDescendant) {
		    self.target = lastDescendant;
		};
	})
});
Bifrost.dependencyResolvers.readModelOf = {
    canResolve: function (namespace, name) {
        if (typeof readModels !== "undefined") {
            return name in readModels;
        }
        return false;
    },

    resolve: function (namespace, name) {
        return readModels[name].create();
    }
};
Bifrost.dependencyResolvers.query = {
    canResolve: function (namespace, name) {
        if (typeof queries !== "undefined") {
            return name in queries;
        }
        return false;
    },

    resolve: function (namespace, name) {
        return queries[name].create();
    }
};
Bifrost.namespace("Bifrost.read", {
    queryService: Bifrost.Singleton(function () {
        var self = this;

        function createDescriptorFrom(query) {
            var descriptor = {
                nameOfQuery: query.name,
                parameters: {}
            };

            for (var property in query) {
                if (ko.isObservable(query[property]) == true) {
                    descriptor.parameters[property] = query[property]();
                }
            }

            return descriptor;
        }


        this.execute = function (query) {
            var promise = Bifrost.execution.Promise.create();
            var descriptor = createDescriptorFrom(query);

            var methodParameters = {
                descriptor: JSON.stringify(descriptor)
            };

            $.ajax({
                url: "/Bifrost/Query/Execute",
                type: 'POST',
                dataType: 'json',
                data: JSON.stringify(methodParameters),
                contentType: 'application/json; charset=utf-8',
                complete: function (result) {
                    var items = $.parseJSON(result.responseText);
                    promise.signal(items);
                }
            });

            return promise;
        }
    })
});
Bifrost.namespace("Bifrost.sagas");
Bifrost.sagas.Saga = (function () {
    function Saga() {
        var self = this;

        this.executeCommands = function (commands, options) {

            var canExecuteSaga = true;
            
            $.each(commands, function (index, command) {
                if (command.onBeforeExecute() === false) {
                    canExecuteSaga = false;
                    return false;
                }
            });

            if (canExecuteSaga === false) {
                return;
            }
            Bifrost.commands.commandCoordinator.handleForSaga(self, commands, options);
        }
    }

    return {
        create: function (configuration) {
            var saga = new Saga();
            Bifrost.extend(saga, configuration);
            return saga;
        }
    }
})();
Bifrost.namespace("Bifrost.sagas");
Bifrost.sagas.sagaNarrator = (function () {
    var baseUrl = "/Bifrost/SagaNarrator";
    // Todo : abstract away into general Service code - look at CommandCoordinator.js for the other copy of this!s
    function post(url, data, completeHandler) {
        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'json',
            data: data,
            contentType: 'application/json; charset=utf-8',
            complete: completeHandler
        });
    }

    function isRequestSuccess(jqXHR, commandResult) {
        if (jqXHR.status === 200) {
            if (commandResult.success === true) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
        return true;
    }

    return {
        conclude: function (saga, success, error) {
            var methodParameters = {
                sagaId: saga.Id
            };
            post(baseUrl + "/Conclude", JSON.stringify(methodParameters), function (jqXHR) {
                var commandResult = Bifrost.commands.CommandResult.createFrom(jqXHR.responseText);
                var isSuccess = isRequestSuccess(jqXHR, commandResult);
                if (isSuccess == true && typeof success === "function") {
                    success(saga);
                }
                if (isSuccess == false && typeof error === "function") {
                    error(saga);
                }
            });
        }
    }
})();
Bifrost.namespace("Bifrost.features");
Bifrost.features.UriNotSpecified = function(message) {
	this.prototype = Error.prototype;
	this.name = "UriNotSpecified";
	this.message = message || "Uri was not specified";
}
Bifrost.features.MappedUriNotSpecified = function(message) {
	this.prototype = Error.prototype;
	this.name = "MappedUriNotSpecified";
	this.message = message || "Mapped Uri was not specified";
}
Bifrost.namespace("Bifrost.features");
Bifrost.features.FeatureMapping = (function () {
	function throwIfUriNotSpecified(uri) {
		if(!uri || typeof uri === "undefined") {
			throw new Bifrost.features.UriNotSpecified();
		}
	}
	
	function throwIfMappedUriNotSpecified(mappedUri) {
		if(!mappedUri || typeof mappedUri === "undefined") {
			throw new Bifrost.features.MappedUriNotSpecified();
		}
	}
	
    function FeatureMapping(uri, mappedUri, isDefault) {

		throwIfUriNotSpecified(uri);
		throwIfMappedUriNotSpecified(mappedUri);

        var uriComponentRegex = /\{[a-zA-Z]*\}/g
        var components = uri.match(uriComponentRegex) || [];
        var uriRegex = new RegExp(uri.replace(uriComponentRegex, "([\\w.]*)"));

        this.uri = uri;
        this.mappedUri = mappedUri;
        this.isDefault = isDefault || false;

        this.matches = function (uri) {
            var match = uri.match(uriRegex);
            if (match) {
                return true;
            }
            return false;
        }

        this.resolve = function (uri) {
            var match = uri.match(uriRegex);
            var result = mappedUri;
            $.each(components, function (i, c) {
                result = result.replace(c, match[i + 1]);
            });

            return result;
        }
    }

    return {
        create: function (uri, mappedUri, isDefault) {
            var featureMapping = new FeatureMapping(uri, mappedUri, isDefault);
            return featureMapping;
        }
    }
})();
Bifrost.namespace("Bifrost.features");
Bifrost.features.featureMapper = (function () {
    var mappings = [];

    return {
        clear: function () {
            mappings = [];
        },

        add: function (uri, mappedUri, isDefault) {
            var FeatureMapping = Bifrost.features.FeatureMapping.create(uri, mappedUri, isDefault);
            mappings.push(FeatureMapping);
        },

        getFeatureMappingFor: function (uri) {
            var found;
            $.each(mappings, function (i, m) {
                if (m.matches(uri)) {
                    found = m;
                    return false;
                }
            });

            if (typeof found !== "undefined") {
                return found;
            }

            throw {
                name: "ArgumentError",
                message: "URI (" + uri + ") could not be mapped"
            }
        },

        resolve: function (uri) {
            try {
                var FeatureMapping = Bifrost.features.featureMapper.getFeatureMappingFor(uri);
                return FeatureMapping.resolve(uri);
            } catch (e) {
                return "";
            }
        },

        allMappings: function () {
            var allMappings = new Array();
            allMappings = allMappings.concat(mappings);
            return allMappings;
        }
    }
})();
Bifrost.namespace("Bifrost.features");
Bifrost.features.ViewModel = (function(window, undefined) {	
	function ViewModel() {
		var self = this;
		
		this.uriChangedSubscribers = [];
		this.activatedSubscribers = [];
		
		this.messenger = Bifrost.messaging.Messenger.global;
		this.uri = Bifrost.Uri.create(window.location.href);
		this.queryParameters = {
			define: function(parameters) {
				Bifrost.extend(this,parameters);
			}
		}
		
		this.uriChanged = function(callback) {
			self.uriChangedSubscribers.push(callback);
		}
		
		this.activated = function(callback) {
			self.activatedSubscribers.push(callback);
		}
		
		
		this.onUriChanged = function(uri) {
			$.each(self.uriChangedSubscribers, function(index, callback) {
				callback(uri);
			});
		}
		
		this.onActivated = function() {
			if( typeof self.handleUriState !== "undefined" ) {
				self.handleUriState();
			}
			
			$.each(self.activatedSubscribers, function(index, callback) {
				callback();
			});
		}

		if(typeof History !== "undefined" && typeof History.Adapter !== "undefined") {
			this.handleUriState = function() {
				var state = History.getState();
				
				self.uri.setLocation(state.url);
				
				for( var parameter in self.uri.parameters ) {
					if( self.queryParameters.hasOwnProperty(parameter) && 
						typeof self.uri.parameters[parameter] != "function") {
						
						if( typeof self.queryParameters[parameter] == "function" ) {
							self.queryParameters[parameter](self.uri.parameters[parameter]);
						} else {
							self.queryParameters[parameter] = self.uri.parameters[parameter];
						}
					}
				}
				
				self.onUriChanged(self.uri);
			}
			
			History.Adapter.bind(window,"statechange", function() {
				self.handleUriState();
			});		
			
			$(function() {
				self.handleUriState();
			});
		}
	}
	
	return {
		baseFor : function(f) {
			if( typeof f === "function" ) {
				f.prototype = new ViewModel();
			}
		}
	};
})(window);
Bifrost.namespace("Bifrost.features");
Bifrost.features.ViewModelDefinition = (function () {
    function ViewModelDefinition(target, options) {
        var self = this;
        this.target = target;
        this.options = {
            isSingleton: false
        }
        Bifrost.extend(this.options, options);

        this.getInstance = function () {
            var instance = null;
            if (self.options.isSingleton) {
                if (!self.instance) {
                    if (typeof self.target.create === "function") {
                        var promise = Bifrost.execution.Promise.create();
                        self.target.beginCreate().continueWith(function (instance) {
                            self.instance = instance;
                            promise.signal(instance);
                        });
                        instance = promise;
                    } else {
                        self.instance = new self.target();
                        instance = self.instance;
                    }
                } else {
                    instance = self.instance;
                }

                
            } else {
                if (typeof self.target.create === "function") {
                    var promise = Bifrost.execution.Promise.create();
                    self.target.beginCreate().continueWith(function (instance) {
                        self.instance = instance;
                        promise.signal(instance);
                    });
                    instance = promise;
                } else {
                    self.instance = new self.target();
                    instance = self.instance;
                }
                
            }
            if (typeof instance.onActivated == "function") {
                instance.onActivated();
            }
            return instance;
        };
    }

    return {
        define: function (target, options) {
            Bifrost.features.ViewModel.baseFor(target);
            var viewModel = new ViewModelDefinition(target, options);
            return viewModel;
        }
    }
})();
Bifrost.namespace("Bifrost.features");
Bifrost.features.Feature = (function () {
    function Feature(name, path, isDefault) {
        var self = this;
        this.loaded = false;
        this.renderTargets = [];
        this.name = name;
        this.path = path;
        this.isDefault = isDefault;

        if (isDefault) {
            this.viewPath = path + "/view.html";
            this.viewModelpath = path + "/viewModel.js";
        } else {
            this.viewPath = path + ".html";
            this.viewModelpath = path + ".js";
        }

        this.load = function () {
            var actualViewPath = "text!" + self.viewPath + "!strip";
            var actualViewModelPath = self.viewModelpath;

            require([actualViewPath, actualViewModelPath], function (v) {
                self.view = v;

                $.each(self.renderTargets, function (i, r) {
                    self.actualRenderTo(r);
                });

                self.renderTargets = [];

                self.loaded = true;
            });
        }

        this.defineViewModel = function (viewModel, options) {
            self.viewModelDefinition = Bifrost.features.ViewModelDefinition.define(viewModel, options);
        }

        this.renderTo = function (target) {
            if (self.loaded === false) {
                self.renderTargets.push(target);
            } else {
                self.actualRenderTo(target);
            }
        }

        this.actualRenderTo = function (target) {
			$(target).empty();
            $(target).append(self.view);

			if( self.viewModelDefinition ) {
			    var viewModel = self.viewModelDefinition.getInstance();
			    if (viewModel instanceof Bifrost.execution.Promise) {
			        viewModel.continueWith(function (instance) {
			            ko.applyBindings(instance, target);
			        });
			    } else {
			        ko.applyBindings(viewModel, target);
			    }
			}

            Bifrost.features.featureManager.hookup(function (a) { return $(a, $(target)); });
        }
    }

    return {
        create: function (name, path, isDefault) {
            var feature = new Feature(name, path, isDefault);
            return feature;
        }
    }
})();
Bifrost.namespace("Bifrost.features");
Bifrost.features.featureManager = (function () {
    var allFeatures = {};

    return {
        get: function (name) {
            name = name.toLowerCase();

            while(name.charAt(name.length - 1) === "/") {
                name = name.slice(0, -1);
            }

            if (typeof allFeatures[name] !== "undefined") {
                return allFeatures[name];
            }

            var FeatureMapping = Bifrost.features.featureMapper.getFeatureMappingFor(name);
            var path = FeatureMapping.resolve(name);
            var feature = Bifrost.features.Feature.create(name, path, FeatureMapping.isDefault);
            allFeatures[name] = feature;
            feature.load();            
            return feature;
        },
        hookup: function ($) {
            $("[data-feature]").each(function () {
                var target = $(this)[0];
                var name = $(this).attr("data-feature");
                var feature = Bifrost.features.featureManager.get(name);
                feature.renderTo(target);
            });
        },
        all: function () {
            return allFeatures;
        }
    }
})();
if (typeof ko !== 'undefined') {
    ko.bindingHandlers.feature = {
        init: function (element, valueAccessor, allBindingAccessor, viewModel) {
        },
        update: function (element, valueAccessor, allBindingAccessor, viewModel) {
        	var value = valueAccessor();
			var featureName = ko.utils.unwrapObservable(value);
			var feature = Bifrost.features.featureManager.get(featureName);
			
			$(element).empty();
			
			var container = $("<div/>");
			$(element).append(container);
			
			feature.renderTo(container[0]);
        }
    };
}
Bifrost.namespace("Bifrost.messaging", {
    Messenger: Bifrost.Type.extend(function () {
        var subscribers = [];

        this.publish = function (topic, message) {
            if (subscribers.hasOwnProperty(topic)) {
                $.each(subscribers[topic].subscribers, function (index, item) {
                    item(message);
                });
            }
        };

        this.subscribeTo = function (topic, subscriber) {
            var subscribersByTopic;

            if (subscribers.hasOwnProperty(topic)) {
                subscribersByTopic = subscribers[topic];
            } else {
                subscribersByTopic = { subscribers: [] };
                subscribers[topic] = subscribersByTopic;
            }

            subscribersByTopic.subscribers.push(subscriber);
        };

        return {
            publish: this.publish,
            subscribeTo: this.subscribeTo
        };
    })
});
Bifrost.messaging.Messenger.global = Bifrost.messaging.Messenger.create();
Bifrost.WellKnownTypesDependencyResolver.types.globalMessenger = Bifrost.messaging.Messenger.global;
if (typeof ko !== 'undefined') {
    ko.observableMessage = function (message, defaultValue) {
        var observable = ko.observable(defaultValue);

        var internal = false;
        observable.subscribe(function (newValue) {
            if (internal == true) return;
            Bifrost.messaging.Messenger.global.publish(message, newValue);
        });

        Bifrost.messaging.Messenger.global.subscribeTo(message, function (value) {
            internal = true;
            observable(value);
            internal = false;
        });
        return observable;
    }
}
Bifrost.namespace("Bifrost.services", {
    Service: Bifrost.Type.extend(function () {
        var self = this;

        this.url = "";
        this.name = "";

        function prepareArguments(args) {
            var prepared = {};

            for (var property in args) {
                prepared[property] = JSON.stringify(args[property]);
            }

            var stringified = JSON.stringify(prepared);
            return stringified;
        }

        function call(method, args, callback) {
            $.ajax({
                url: self.url + "/" + method,
                type: 'POST',
                dataType: 'json',
                data: prepareArguments(args),
                contentType: 'application/json; charset=utf-8',
                complete: function (result) {
                    var v = $.parseJSON(result.responseText);
                    callback(v);
                }
            });
        }


        this.callWithoutReturnValue = function (method, args) {
            var promise = Bifrost.execution.Promise.create();
            call(method, args, function (v) {
                promise.signal();
            });
            return promise;
        };

        this.callWithObjectAsReturn = function (method, args) {
            var value = ko.observable();
            call(method, args, function (v) {
                value(v);
            });
            return value;
        };

        this.callWithArrayAsReturn = function (method, args) {
            var value = ko.observableArray();
            call(method, args, function (v) {
                value(v);
            });
            return value;
        };

        this.onCreated = function (lastDescendant) {
            self.url = lastDescendant.url;
            if (self.url.indexOf("/") != 0) self.url = "/" + self.url;

            self.name = lastDescendant.name;
        };
    })
});
Bifrost.dependencyResolvers.service = {
    canResolve: function (namespace, name) {
        if (typeof services !== "undefined") {
            return name in services;
        }
        return false;
    },

    resolve: function (namespace, name) {
        return services[name].create();
    }
};
Bifrost.namespace("Bifrost.views", {
    View: Bifrost.Type.extend(function (viewLoader, path) {
        var self = this;
        this.viewLoader = viewLoader;

        this.path = path;
        this.content = "[CONTENT NOT LOADED]";
        this.element = null;


        this.load = function () {
            var promise = Bifrost.execution.Promise.create();
            self.viewLoader.load(self.path).continueWith(function (html) {
                self.content = html;
                promise.signal(self);
            });

            return promise;
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    ViewRenderer: Bifrost.Type.extend(function () {
        this.canRender = function (element) {
            return false;
        };

        this.render = function (element) {
        };
	})
});
Bifrost.namespace("Bifrost.views", {
	viewRenderers: Bifrost.Singleton(function() {
		var self = this;

		function getRenderers() {
			var renderers = [];
			for( var property in Bifrost.views.viewRenderers ) {
				if( Bifrost.views.viewRenderers.hasOwnProperty(property)) {
					var value = Bifrost.views.viewRenderers[property];
					if( typeof value == "function" && 
						typeof value.create == "function")  {
						var renderer = value.create();
						if( typeof renderer.canRender == "function") renderers.push(renderer);
					}
				}
			}
			return renderers;
		}

		this.canRender = function(element) {
		    var renderers = getRenderers();
		    for (var rendererIndex = 0; rendererIndex < renderers.length; rendererIndex++) {
		        var renderer = renderers[rendererIndex];
		        var result = renderer.canRender(element);
				if( result == true ) return true;
			}

			return false;
		};

		this.render = function(element) {
		    var renderers = getRenderers();
		    for (var rendererIndex = 0; rendererIndex < renderers.length; rendererIndex++) {
		        var renderer = renderers[rendererIndex];
		        if (renderer.canRender(element)) return renderer.render(element);
			}

			return null;
		};

	})
});
Bifrost.namespace("Bifrost.views", {
	DataAttributeViewRenderer : Bifrost.views.ViewRenderer.extend(function(viewFactory, pathResolvers, viewModelManager) {
	    var self = this;

	    this.viewFactory = viewFactory;
	    this.pathResolvers = pathResolvers;
	    this.viewModelManager = viewModelManager;

		this.canRender = function(element) {
		    return typeof $(element).data("view") !== "undefined";
		};

		this.render = function (element) {
		    var promise = Bifrost.execution.Promise.create();
		    var path = $(element).data("view");

		    if (self.pathResolvers.canResolve(element, path)) {
		        var actualPath = self.pathResolvers.resolve(element, path);
		        var view = self.viewFactory.createFrom(actualPath);

		        view.element = element;
		        view.load().continueWith(function (targetView) {
		            $(element).empty();
		            $(element).append(targetView.content);

		            if (self.viewModelManager.hasForView(actualPath)) {
		                var viewModelFile = Bifrost.path.changeExtension(actualPath, "js");
		                $(element).attr("data-viewmodel-file", viewModelFile);
		                $(element).data("viewmodel-file", viewModelFile);
		            }

		            promise.signal(targetView);
		        });
		    } else {
                // Todo: throw an exception at this point! - Or something like 404.. 
		        promise.signal(null);
		    }

		    return promise;
		};
	})
});
if (typeof Bifrost.views.viewRenderers != "undefined") {
	Bifrost.views.viewRenderers.DataAttributeViewRenderer = Bifrost.views.DataAttributeViewRenderer;
}

Bifrost.namespace("Bifrost.views", {
    viewFactory: Bifrost.Singleton(function () {
        var self = this;

        this.createFrom = function (path) {
            var view = Bifrost.views.View.create({
                path: path
            });
            return view;
        };
    })
});
Bifrost.WellKnownTypesDependencyResolver.types.viewFactory = Bifrost.views.viewFactory;
Bifrost.namespace("Bifrost.views", {
    viewLoader: Bifrost.Singleton(function (viewModelManager) {
        var self = this;

        this.viewModelManager = viewModelManager;
        
        this.load = function (path) {
            var promise = Bifrost.execution.Promise.create();

            if (!path.startsWith("/")) path = "/" + path;

            var files = [];

            var viewFile = "text!" + path + "!strip";
            if (!Bifrost.path.hasExtension(viewFile)) viewFile = "noext!" + viewFile;
            files.push(viewFile);

            if (self.viewModelManager.hasForView(path)) {
                var viewModelFile = self.viewModelManager.getViewModelPathForView(path);
                files.push(viewModelFile);
            }

            require(files, function (view) {
                promise.signal(view);
            });
            return promise;
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    viewManager: Bifrost.Singleton(function (viewRenderers, viewFactory, pathResolvers, viewModelManager) {
        var self = this;
        
        this.viewRenderers = viewRenderers;
        this.viewFactory = viewFactory;
        this.pathResolvers = pathResolvers;
        this.viewModelManager = viewModelManager;

        function renderChildren(element) {
            if(element.hasChildNodes() == true) {
                for (var child = element.firstChild; child; child = child.nextSibling) {
                    self.render(child);
                }
            }
        }

        this.initializeLandingPage = function () {
            var body = $("body")[0];
            if (body !== null) {
                var file = Bifrost.path.getFilenameWithoutExtension(document.location.toString());
                if (file == "") file = "index";
                $(body).data("view", file);

                if (self.pathResolvers.canResolve(body, file)) {
                    var actualPath = self.pathResolvers.resolve(body, file);
                    var view = self.viewFactory.createFrom(actualPath);
                    view.element = body;
                    view.content = body.innerHTML;

                    // Todo: this one destroys the bubbling of click event to the body tag..  Weird.. Need to investigate more (see GitHub issue 233 : https://github.com/dolittle/Bifrost/issues/233)
                    //self.viewModelManager.applyToViewIfAny(view);

                    renderChildren(body);
                }
            }
        };

        this.render = function (element) {
            var promise = Bifrost.execution.Promise.create();

            if (self.viewRenderers.canRender(element)) {
                self.viewRenderers.render(element).continueWith(function (view) {
                    var newElement = view.element;
                    newElement.view = view;
                    self.viewModelManager.applyToViewIfAny(view);
                    renderChildren(newElement);
                });
            } else {
                renderChildren(element);
            }

            return promise;
        };
    })
});
Bifrost.WellKnownTypesDependencyResolver.types.viewManager = Bifrost.views.viewManager;
Bifrost.namespace("Bifrost.views", {
    ViewModel: Bifrost.Type.extend(function () {
        var self = this;
        this.targetViewModel = this;

        this.activated = function () {
            if (typeof self.targetViewModel.onActivated === "function") {
                self.targetViewModel.onActivated();
            }
        };

        this.onCreated = function (lastDescendant) {
            self.targetViewModel = lastDescendant;
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    viewModelManager: Bifrost.Singleton(function(assetsManager) {
        var self = this;
        this.assetsManager = assetsManager;

        var partialViewModelBindingProvider = function (currentViewModel) {
            var self = this;
            this.currentViewModel = currentViewModel;

            var originalBindingProvider = ko.bindingProvider.instance;

            this.nodeHasBindings = function (node) {
                if (typeof $(node).data("navigation-frame") !== "undefined") {
                    return false;
                }

                var closestViewModel = $(node).closest("[data-viewmodel-file]");
                if (closestViewModel.length == 1) {
                    var viewModelName = closestViewModel.data("viewmodel-file");
                    if (viewModelName == self.currentViewModel) {
                        return originalBindingProvider.nodeHasBindings(node);
                    } else {
                        return false;
                    }
                }

                return originalBindingProvider.nodeHasBindings(node)
            },

            this.getBindings = function (node, bindingContext) {
                return originalBindingProvider.getBindings(node, bindingContext);
            }
        }

        function applyViewModel(instance, target) {
            var viewModelFile = $(target).data("viewmodel-file");

            target.viewModel = instance;

            /*
            $(target).find("*").each(function () {
                $(this).unbind();
            });
            ko.cleanNode(target);*/

            var previousBindingProvider = ko.bindingProvider.instance;
            ko.bindingProvider.instance = new partialViewModelBindingProvider(viewModelFile);
            ko.applyBindings(instance, target);
            ko.bindingProvider.instance = previousBindingProvider;

            $(target).data("viewmodel", instance);

            if (typeof instance.activated == "function") {
                instance.activated();
            }
        }



        function applyViewModelsByAttribute(path, container) {
            var viewModelApplied = false;

            $("[data-viewmodel-file]", container).andSelf().each(function () {
                viewModelApplied = true;
                var target = $(this)[0];
                var viewModelFile = $(this).data("viewmodel-file");
                self.get(viewModelFile, path).continueWith(function (instance) {
                    applyViewModel(instance, target, viewModelFile);
                });
            });

            return viewModelApplied;
        }

        function applyViewModelByConventionFromPath(path, container) {
            if (self.hasForView(path)) {
                var viewModelFile = Bifrost.path.changeExtension(path, "js");
                $(container).attr("data-viewmodel-file", viewModelFile);
                $(container).data("viewmodel-file", viewModelFile);
                self.getForView(path).continueWith(function (instance) {
                    applyViewModel(instance, container);
                });
            }
        }

        function applyViewModelInMemory(path, callback) {
            var localPath = Bifrost.path.getPathWithoutFilename(path);
            var filename = Bifrost.path.getFilenameWithoutExtension(path);
            var wasInMemory = false;

            for (var mapperKey in Bifrost.namespaceMappers) {
                var mapper = Bifrost.namespaceMappers[mapperKey];
                if (typeof mapper.hasMappingFor === "function" && mapper.hasMappingFor(path)) {
                    var namespacePath = mapper.resolve(localPath);
                    var namespace = Bifrost.namespace(namespacePath);

                    if (filename in namespace) {
                        wasInMemory = true;
                        namespace[filename].beginCreate().continueWith(function (instance) {
                            callback(instance);
                        });
                    }
                }
            }

            return wasInMemory;
        }


        this.get = function (path) {
            var promise = Bifrost.execution.Promise.create();
            if (!path.startsWith("/")) path = "/" + path;
            require([path], function () {
                applyViewModelInMemory(path, function (instance) {
                    promise.signal(instance);
                });
            });
            return promise;
        };

        this.hasForView = function (viewPath) {
            var scriptFile = Bifrost.path.changeExtension(viewPath, "js");
            scriptFile = Bifrost.path.makeRelative(scriptFile);
            var hasViewModel = self.assetsManager.hasScript(scriptFile);
            return hasViewModel;
        };

        this.getViewModelPathForView = function (viewPath) {
            var scriptFile = Bifrost.path.changeExtension(viewPath, "js");
            return scriptFile;
        };

        this.getForView = function (viewPath) {
            var scriptFile = Bifrost.path.changeExtension(viewPath, "js");
            return self.get(scriptFile);
        };

        this.applyToViewIfAny = function (view) {
            var viewModelApplied = false;

            viewModelApplied = applyViewModelInMemory(view.path, function (instance) {
                var viewModelFile = Bifrost.path.changeExtension(view.path, "js");
                $(view.element).attr("data-viewmodel-file", viewModelFile);
                $(view.element).data("viewmodel-file", viewModelFile);
                applyViewModel(instance, view.element);
            });
            if (viewModelApplied == false) {
                viewModelApplied = applyViewModelsByAttribute(view.path, view.element);
                if (viewModelApplied == false) {
                    applyViewModelByConventionFromPath(view.path, view.element);
                }
            }
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    PathResolver: Bifrost.Type.extend(function () {
        this.canResolve = function (element, path) {
            return false;
        };

        this.resolve = function (element, path) {
            
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    pathResolvers: Bifrost.Singleton(function () {

        function getResolvers() {
            var resolvers = [];
            for (var property in Bifrost.views.pathResolvers) {
                if (Bifrost.views.pathResolvers.hasOwnProperty(property)) {
                    var value = Bifrost.views.pathResolvers[property];
                    if( typeof value == "function" &&
                        typeof value.create == "function") {

                        var resolver = value.create();
                        if (typeof resolver.canResolve == "function") resolvers.push(resolver);
                    }
                }
            }
            return resolvers;
        }


        this.canResolve = function (element, path) {
            var resolvers = getResolvers();
            for (var resolverIndex = 0; resolverIndex < resolvers.length; resolverIndex++) {
                var resolver = resolvers[resolverIndex];
                var result = resolver.canResolve(element, path);
                if (result == true) return true;
            }
            return false;
        };

        this.resolve = function (element, path) {
            var resolvers = getResolvers();
            for (var resolverIndex = 0; resolverIndex < resolvers.length; resolverIndex++) {
                var resolver = resolvers[resolverIndex];
                if (resolver.canResolve(element, path)) return resolver.resolve(element, path);
            }
            return null;
        };
    })
});
Bifrost.namespace("Bifrost.views", {
    UriMapperPathResolver: Bifrost.views.PathResolver.extend(function () {
        this.canResolve = function (element, path) {
            var closest = $(element).closest("[data-urimapper]");
            if (closest.length == 1) {
                var mapperName = $(closest[0]).data("urimapper");
                if (Bifrost.uriMappers[mapperName].hasMappingFor(path) == true) return true;
            }
            return Bifrost.uriMappers.default.hasMappingFor(path);
        };

        this.resolve = function (element, path) {
            var closest = $(element).closest("[data-urimapper]");
            if (closest.length == 1) {
                var mapperName = $(closest[0]).data("urimapper");
                if (Bifrost.uriMappers[mapperName].hasMappingFor(path) == true) {
                    return Bifrost.uriMappers[mapperName].resolve(path);
                }
            }
            return Bifrost.uriMappers.default.resolve(path);
        };
    })
});
if (typeof Bifrost.views.pathResolvers != "undefined") {
    Bifrost.views.pathResolvers.UriMapperPathResolver = Bifrost.views.UriMapperPathResolver;
}
Bifrost.namespace("Bifrost.views", {
    RelativePathResolver: Bifrost.views.PathResolver.extend(function () {
        this.canResolve = function (element, path) {
            var closest = $(element).closest("[data-view]");
            if (closest.length == 1) {
                var view = $(closest[0]).view;
                
            }
            return false;
        };

        this.resolve = function (element, path) {
            var closest = $(element).closest("[data-urimapper]");
            if (closest.length == 1) {
                var mapperName = $(closest[0]).data("urimapper");
                if (Bifrost.uriMappers[mapperName].hasMappingFor(path) == true) {
                    return Bifrost.uriMappers[mapperName].resolve(path);
                }
            }
            return Bifrost.uriMappers.default.resolve(path);
        };
    })
});
if (typeof Bifrost.views.pathResolvers != "undefined") {
    Bifrost.views.pathResolvers.RelativePathResolver = Bifrost.views.RelativePathResolver;
}
Bifrost.namespace("Bifrost.views", {
    viewBindingHandler: Bifrost.Type.extend(function(viewManager) {
        var self = this;

        this.viewManager = viewManager;

        this.init = function (element, valueAccessor, allBindingAccessor, viewModel) {
        };
        this.update = function(element, valueAccessor, allBindingAccessor, viewModel) {
            var path = ko.utils.unwrapObservable(valueAccessor());
            self.render(element, path);
        };

        this.render = function(element, path) {
            

            $(element).empty();

            var container = $("<div/>");
            $(container).data("view", path);
            $(element).append(container);

            self.viewManager.render(container[0]).continueWith(function (view) {
                promise.signal(view);
            });
        }
    })
});
ko.bindingHandlers.view = Bifrost.views.viewBindingHandler.create();
Bifrost.namespace("Bifrost.navigation", {
    NavigationFrame: Bifrost.Type.extend(function (home, locationAware, uriMapper, history, viewManager) {
        var self = this;

        this.home = home;
        this.locationAware = locationAware || false;
        this.history = history;
        this.viewManager = viewManager;

        this.container = null;
        this.currentUri = ko.observable(home);
        this.currentRenderedPath = null;
        this.uriMapper = uriMapper || null;

        this.currentUri.subscribe(function () {
            self.render();
        });
        
        this.setCurrentUri = function (path) {
            if (path.indexOf("/") == 0) path = path.substr(1);
            if (path == null || path.length == 0) path = self.home;
            if (self.uriMapper != null && !self.uriMapper.hasMappingFor(path)) path = self.home;
            self.currentUri(path);
        };

        this.setCurrentUriFromCurrentLocation = function () {
            var state = self.history.getState();
            var uri = Bifrost.Uri.create(state.url);
            self.setCurrentUri(uri.path);
        }

        if (locationAware === true) {
            history.Adapter.bind(window, "statechange", function () {
                self.setCurrentUriFromCurrentLocation();
            });
        }

        this.setContainer = function (container) {
            if (self.locationAware === true) {
                self.setCurrentUriFromCurrentLocation();
            }

            self.container = container;

            var uriMapper = $(container).closest("[data-urimapper]");
            if (uriMapper.length == 1) {
                var uriMapperName = $(uriMapper[0]).data("urimapper");
                if (uriMapperName in Bifrost.uriMappers) {
                    self.uriMapper = Bifrost.uriMappers[uriMapperName];
                }
            }
            if (self.uriMapper == null) self.uriMapper = Bifrost.uriMappers.default;
            return self.render();
        };

        this.render = function () {
            var promise = Bifrost.execution.Promise.create();
            var path = self.currentUri();
            if (self.container == null) return;
            if (path == self.currentRenderedPath) return;
            self.currentRenderedPath = path;

            if (path !== null && typeof path !== "undefined") {
                $(self.container).data("view", path);
                self.viewManager.render(self.container).continueWith(function (view) {
                    promise.signal(view);
                });
            }
            return promise;
        };

        this.navigate = function (uri) {
            self.setCurrentUri(uri);
        };

    })
});
Bifrost.namespace("Bifrost.navigation", {
    navigationFrames: Bifrost.Singleton(function () {
        var self = this;

        this.hookup = function () {
            $("[data-navigation-frame]").each(function (index, element) {
                var configurationString = $(element).data("navigation-frame");
                var configurationItems = ko.expressionRewriting.parseObjectLiteral(configurationString);

                var configuration = {};

                for (var index = 0; index < configurationItems.length; index++) {
                    var item = configurationItems[index];
                    configuration[item.key.trim()] = item.value.trim();
                }

                if (typeof configuration.uriMapper !== "undefined") {
                    var mapper = Bifrost.uriMappers[configuration.uriMapper];
                    var frame = Bifrost.navigation.NavigationFrame.create({
                        stringMapper: mapper,
                        home: configuration.home || ''
                    });
                    frame.setContainer(element);

                    element.navigationFrame = frame;
                }
            });
        };
    })
});
if (typeof ko !== 'undefined' && typeof History !== "undefined" && typeof History.Adapter !== "undefined") {
    ko.bindingHandlers.navigateTo = {
        init: function (element, valueAccessor, allBindingAccessor, viewModel) {
            ko.applyBindingsToNode(element, { 
				click: function() {
					var featureName = valueAccessor()();
					History.pushState({feature:featureName},$(element).attr("title"),"/"+featureName);
				} 
			}, viewModel);
        }
    };
}
Bifrost.namespace("Bifrost.navigation", {
    navigateTo: function (featureName, queryString) {
        var url = featureName;

        if (featureName.charAt(0) !== "/")
            url = "/" + url;
        if (queryString)
            url += queryString;

        // TODO: Support title somehow
        if (typeof History !== "undefined" && typeof History.Adapter !== "undefined") {
            History.pushState({}, "", url);
        }
    },
    navigationManager: {
        hookup: function () {
            if (typeof History !== "undefined" && typeof History.Adapter !== "undefined") {
                $("body").click(function (e) {
                    var href = e.target.href;
                    if (typeof href == "undefined") {
                        var closestAnchor = $(e.target).closest("a")[0];
                        if (!closestAnchor) {
                            return;
                        }
                        href = closestAnchor.href;
                    }
                    if (href.indexOf("#") > 0) {
                        href = href.substr(0, href.indexOf("#"));
                    }

                    if (href.length == 0) {
                        href = "/";
                    }
                    var targetUri = Bifrost.Uri.create(href);
                    if (targetUri.isSameAsOrigin &&
                        targetUri.queryString.indexOf("postback")<0) {
                        var target = targetUri.path;
                        while (target.indexOf("/") == 0) {
                            target = target.substr(1);
                        }
                        e.preventDefault();

                        var result = $(e.target).closest("[data-navigation-target]");
                        if (result.length == 1) {
                            var id = $(result[0]).data("navigation-target");
                            var element = $("#"+id);
                            if (element.length == 1 && typeof element[0].navigationFrame !== "undefined") {
                                element[0].navigationFrame.navigate(targetUri.path);
                            } else {
                                // Element not found
                            }
                        } else {
                            var queryString = targetUri.queryString.length > 0 ? "?" + targetUri.queryString : "";
                            History.pushState({}, "", "/" + target + queryString);
                        }
                    }
                });
            }
        }
    }
});
Bifrost.namespace("Bifrost.navigation", {
    NavigationFrameViewRenderer: Bifrost.views.ViewRenderer.extend(function () {

        this.canRender = function (element) {
            return typeof $(element).data("navigation-frame") !== "undefined" && 
                    typeof $(element).data("view") === "undefined";
        };

        this.render = function (element) {
            var promise = Bifrost.execution.Promise.create();

            var configurationString = $(element).data("navigation-frame");
            var configurationItems = ko.expressionRewriting.parseObjectLiteral(configurationString);

            var configuration = {};

            for (var index = 0; index < configurationItems.length; index++) {
                var item = configurationItems[index];
                configuration[item.key.trim()] = item.value.trim();
            }

            if (typeof configuration.uriMapper !== "undefined") {
                $(element).data("urimapper", configuration.uriMapper);
            } else {
                configuration.uriMapper = "default";
            }

            var frame = Bifrost.navigation.NavigationFrame.create({
                home: configuration.home || '',
                locationAware: configuration.locationAware || true,
                uriMapper: Bifrost.uriMappers[configuration.uriMapper]
            });
            element.navigationFrame = frame;
            frame.setContainer(element).continueWith(function (view) {
                promise.signal(view);
            });

            return promise;
        };
    })
});
if (typeof Bifrost.views.viewRenderers != "undefined") {
    Bifrost.views.viewRenderers.NavigationFrameViewRenderer = Bifrost.navigation.NavigationFrameViewRenderer;
}
if (typeof ko !== "undefined") {
    (function () {
        var historyEnabled = typeof History !== "undefined" && typeof History.Adapter !== "undefined";

        ko.observableQueryParameter = function (parameterName, defaultValue) {
            var self = this;
            var observable = null;

            this.getState = function () {
                var uri = Bifrost.Uri.create(location.toString());
                if (uri.parameters.hasOwnProperty(parameterName)) {
                    return uri.parameters[parameterName];
                }

                return null;
            }

            if (historyEnabled) {
                History.Adapter.bind(window, "statechange", function () {
                    if (observable != null) {
                        observable(self.getState());
                    }
                });
            }

            observable = ko.observable(self.getState() || defaultValue);

            observable.subscribe(function (newValue) {
                var state = History.getState();
                state[parameterName] = newValue;

                var parameters = Bifrost.hashString.decode(state.url);
                parameters[parameterName] = newValue;


                var url = "?";
                var parameterIndex = 0;
                for (var parameter in parameters) {
                    if (parameterIndex > 0) {
                        url += "&";
                    }
                    url += parameter + "=" + parameters[parameter];
                    parameterIndex++;
                }

                if (historyEnabled) {
                    History.pushState(state, state.title, url);
                }
            });

            return observable;
        }
    })();
}
Bifrost.namespace("Bifrost", {
    configure: (function () {
        var self = this;

        this.ready = false;
        this.readyCallbacks = [];

        function ready(callback) {
            if (self.ready == true) {
                callback();
            } else {
                readyCallbacks.push(callback);
            }
        }

        function onReady() {
            self.ready = true;
            for (var callbackIndex = 0; callbackIndex < self.readyCallbacks.length; callbackIndex++) {
                self.readyCallbacks[callbackIndex]();
            }
        }

        function onStartup() {
            var self = this;

            if (typeof History !== "undefined" && typeof History.Adapter !== "undefined") {
                Bifrost.WellKnownTypesDependencyResolver.types.history = History;
            }

            var defaultUriMapper = Bifrost.StringMapper.create();
            defaultUriMapper.addMapping("{boundedContext}/{module}/{feature}/{view}", "/{boundedContext}/{module}/{feature}/{view}.html");
            defaultUriMapper.addMapping("{boundedContext}/{feature}/{view}", "/{boundedContext}/{feature}/{view}.html");
            defaultUriMapper.addMapping("{feature}/{view}", "/{feature}/{view}.html");
            defaultUriMapper.addMapping("{view}", "{view}.html");
            Bifrost.uriMappers.default = defaultUriMapper;

            var promise = Bifrost.assetsManager.initialize();
            promise.continueWith(function () {
                self.onReady();
                Bifrost.features.featureManager.hookup($);
                Bifrost.views.viewManager.create().initializeLandingPage();
                Bifrost.navigation.navigationManager.hookup();
            });
        }

        function reset() {
            self.ready = false;
            self.readyCallbacks = [];
        }

        return {
            ready: ready,
            onReady: onReady,
            onStartup: onStartup,
            reset: reset,
            isReady: function () {
                return self.ready;
            }
        }
    })()
});
(function ($) {
    $(function () {
        if( typeof Bifrost.assetsManager !== "undefined" ) {
            Bifrost.configure.onStartup();
        }
    });
})(jQuery);
