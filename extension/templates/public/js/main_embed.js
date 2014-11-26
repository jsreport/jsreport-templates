/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.model',["app", "core/jaydataModel"], function(app, ModelBase) {
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.templates; },

        fetchQuery: function() {

            var predicate = function(t) { return t.shortid == this.id; };

            return app.dataContext.templates.single(predicate,
                { id: this.get("shortid"), version: this.get("version") == null ? 1 : this.get("version") });
        },

        _initialize: function() {
            this.Entity = $entity.Template;
        },

        defaults: {
            engine: "handlebars",
            recipe: "phantom-pdf"
        }
    });
});
define('preview',["underscore", "jquery", "app"], function (_, $, app) {

    function getUIState(model) {

        function justNotNull(o) {
            var clone = {};
            for (var key in o) {
                if (o[key] != null)
                    clone[key] = o[key];
            }

            return clone;
        }

        var state = {};
        var json = model.toJSON();
        for (var key in json) {
            if (json[key] != null) {
                if (json[key].initData != null)
                    state[key] = justNotNull(json[key].toJSON());
                else
                    state[key] = json[key];
            }
        }

        state.content = state.content || " ";
        state.helpers = state.helpers || "";

        delete state._id;
        delete state.shortid;
        return state;
    }

    function addInput(form, name, value) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }

    var fn = function (model, beforeRenderListeners, target) {

        var uiState = getUIState(model);

        var request = { template: uiState };

        beforeRenderListeners.fire(request, function (er) {
            if (er) {
                app.trigger("error", { responseText: er });
                return;
            }

            if (app.recipes[uiState.recipe] && app.recipes[uiState.recipe].render) {
                return app.recipes[uiState.recipe].render(request, target);
            }

            var mapForm = document.createElement("form");
            mapForm.target = target;
            mapForm.method = "POST";
            mapForm.action = app.serverUrl + "api/report";

            function addBody(path, body) {
                if (body == null)
                    return;

                if (body.initData != null)
                    body = body.initData;

                for (var key in body) {
                    if (_.isObject(body[key])) {
                        addBody(path + "[" + key + "]", body[key]);
                    } else {
                        addInput(mapForm, path + "[" + key + "]", body[key]);
                    }
                }
            }

            addBody("template", uiState);
            if (request.options != null)
                addBody("options", request.options);

            if (request.data != null)
                addInput(mapForm, "data", request.data);

            var headers = app.headers || {};
            headers["host-cookie"] = document.cookie;
            addBody("headers", headers);

            document.body.appendChild(mapForm);
            mapForm.submit();
            app.trigger("after-template-render");
        });
    };

    return fn;
});

define('template.entityRegistration',[], function() {
    return function(context) {
        var templateAttributes = {
            '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String'},
            'name': { 'type': 'Edm.String' },
            'modificationDate': { 'type': 'Edm.DateTime' },
            'engine': { 'type': 'Edm.String' },
            'recipe': { 'type': 'Edm.String' },
            'content': { 'type': 'Edm.String' },
            'shortid': { 'type': 'Edm.String' },
            'helpers': { 'type': 'Edm.String' }
        };

        $data.Entity.extend('$entity.Template', templateAttributes);
        $entity.Template.prototype.toString = function () {
            return "Template " + (this.name || "");
        };

        context["templates"] = { type: $data.EntitySet, elementType: $entity.Template };
    }
});
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "app", "underscore", "marionette", "backbone", "core/view.base", "core/listenerCollection", "template.model", "preview", "core/aceBinder", "template.entityRegistration"],
    function ($, app, _, Marionette, Backbone, ViewBase, ListenerCollection, TemplateModel, preview, aceBinder, entityRegistration) {

        return app.module("template", function (module) {

            var BasicsView = ViewBase.extend({
                template: "embed-template-basic",

                getRecipes: function () {
                    return app.recipes;
                },

                getEngines: function () {
                    return app.engines;
                }
            });

            var View = ViewBase.extend({
                template: "embed-template",
                introTemplate: "embed-template-intro",
                introId: "embed-template-intro",

                events: {
                    "click #saveCommand": "save",
                    "click #previewCommand": "preview",
                    "click #basicSettingsCommand": "basicSettings"
                },

                regions: {
                    extensionsMenuRegion: {
                        selector: "#side-nav-extended-pane"
                    }
                },

                initialize: function() {
                    _.bindAll(this, "renderExtensionsMenu");
                    this. beforeRenderListeners = new ListenerCollection();
                },

                basicSettings: function () {
                    this.extensionsMenuRegion.show(new BasicsView({ model: this.model}), "basic");
                },

                renderExtensionsMenu: function () {
                    this.renderExtensionsMenuContext = { result: "", region: this.extensionsMenuRegion, template: this.model, beforeRenderListeners : this.beforeRenderListeners  };
                    _.extend(this.renderExtensionsMenuContext, Backbone.Events);
                    app.trigger("extensions-menu-render", this.renderExtensionsMenuContext);

                    var originalFn = this.extensionsMenuRegion.show.bind(this.extensionsMenuRegion);

                    var self = this;
                    this.extensionsMenuRegion.show = function(view, id) {
                        $("#side-nav-extended-pane").hide();
                        originalFn(view);
                        $("#side-nav-extended-pane").show();

                        var size = 200;
                        if (id === self.lastMenuVisible &&  $("#side-nav-extended-pane").width()) {
                            id = null;
                            size = 0;
                        }

                        $("#side-nav-extended-pane").width(size);
                        $("#side-nav-divider").animate({ left: size }, 300, function() {
                            view.trigger("animation-done");
                        });
                        $("#main-pane").animate({ left: size }, 300);
                        self.lastMenuVisible = id;
                    };

                    return this.renderExtensionsMenuContext.result;
                },

                onDomRefresh: function () {
                    this.contentEditor = ace.edit("htmlArea");
                    this.contentEditor.setTheme("ace/theme/chrome");
                    this.contentEditor.getSession().setMode("ace/mode/handlebars");
                    aceBinder(this.model, "content", this.contentEditor);

                    this.helpersEditor = ace.edit("helpersArea");
                    this.helpersEditor.setTheme("ace/theme/chrome");
                    this.helpersEditor.getSession().setMode("ace/mode/javascript");
                    aceBinder(this.model, "helpers", this.helpersEditor);

                    this.$el.find(".split-pane").splitPane();

                    if (this.renderExtensionsMenuContext)
                        this.renderExtensionsMenuContext.trigger("after-render", this.$el);
                },

                save: function () {
                    this.model.save();
                },

                preview: function () {
                    preview(this.model, this.beforeRenderListeners, "previewFrame");
                }
            });

            app.on("entity-registration", entityRegistration);

            app.on("open-template", function(options) {
                var view = new View({ model: new TemplateModel(options.template, { parse: true})});
                view.model.on("change", function() {
                    $.extend(options.template, view.model.toJSON());
                });

                if (options.fetch) {
                    view.model.fetch({
                        success: function () {
                            app.layout.content.show(view);
                            app.trigger("view-render", view);
                        }
                    });
                }
                else {
                    app.layout.content.show(view);
                    app.trigger("view-render", view);
                }
            });
        });
    });
