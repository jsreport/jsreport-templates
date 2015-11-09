/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.model',["app", "jquery", "core/basicModel"], function(app, $, ModelBase) {

    return ModelBase.extend({
        odata: "templates",
        url: "odata/templates",

        toString: function() {
            return "Template " + (this.get("name") || "");
        },

        defaults: {
            engine: "handlebars",
            recipe: "phantom-pdf"
        }
    });
});
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.list.model',["app", "jquery", "backbone", "template.model", "core/dataGrid"], function (app, $, Backbone, TemplateModel, DataGrid) {
    return Backbone.Collection.extend({

        url: function() {
            var qs =  this.filter.toOData();
            qs.$orderby = "modificationDate desc";
            return "odata/templates?" + $.param(qs);
        },

        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base();
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },

        parse: function (data) {
            if (this.meta && this.meta["@odata.count"])
                this.filter.set("totalCount", this.meta["@odata.count"]);

            return data;
        },


        model: TemplateModel
    });
});


/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.list.view',["marionette", "core/dataGrid", "jquery", "toastr"], function (Marionette, DataGrid, $, toastr) {

    return Marionette.ItemView.extend({
        template: "template-list",

        initialize: function() {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function(id) {
                    window.location.hash = "extension/templates/" + id;
                },
                el: $("#templateGridBox"),
                headerTemplate: "template-list-header",
                rowsTemplate: "template-list-rows"
            });
        }
    });
});
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.list.toolbar.view',["jquery", "app", "marionette", "core/utils", "core/view.base", "underscore"],
    function($, app, Marionette, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "template-list-toolbar",

            initialize: function() {
                var self = this;
                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        collection: self.collection,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("template-list-extensions-toolbar-render", contextToolbar);
                });
            },

            regions: {
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
            },

            events: {
                "click #deleteCommand": "deleteCommand"
            },

            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            }
        });
    });
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.detail.view',["jquery", "app", "core/utils", "core/view.base", "core/aceBinder"],
    function($, app, Utils, LayoutBase, aceBinder) {
        
        return LayoutBase.extend({
            template: "template-detail",
            contentEditor: null,
            helpersEditor: null,
            className: 'template-detail-wrap',

            initialize: function() {
                var self = this;

                this.listenTo(this.model, "sync", function() {
                    if (self.viewRendered)
                        return;
                    
                    self.render();
                    self.viewRendered = true;
                });

                this.listenTo(this.model, "change:engine", function() {
                    self.setContentAceMode();
                });
                
                this.listenTo(this, "close", function() {
                    $(".side-nav-right").show();
                });
            },

            events: {
                "click #previewPane": "triggerPreview"
            },

            onDomRefresh: function() {
                var self = this;
                $(".side-nav-right").hide();

                //var langTools = ace.require("ace/ext/language_tools");

                //var dataCompleter = {
                //    getCompletions: function(editor, session, pos, prefix, callback) {
                //        if (prefix.length === 0) {
                //            return callback(null, []);
                //        }
                //        // wordList like [{"word":"flow","freq":24,"score":300,"flags":"bc","syllables":"1"}]
                //        return callback(null, [
                //            { name: "jsreport", value: "jsreport", score: 300, meta: "jsreport" }]
                //        );
                //    }
                //};
                
                //langTools.addCompleter(dataCompleter);
                
                
                this.contentEditor = ace.edit("htmlArea");
                this.contentEditor.setTheme("ace/theme/chrome");
                this.contentEditor.setOptions({
                     enableBasicAutocompletion: true,
                     enableSnippets: true
                });
                this.setContentAceMode();

                aceBinder(this.model, "content", this.contentEditor);
             

                this.helpersEditor = ace.edit("helpersArea");
                this.helpersEditor.setTheme("ace/theme/chrome");
                this.helpersEditor.getSession().setMode("ace/mode/javascript");
                this.helpersEditor.setOptions({
                     enableBasicAutocompletion: true,
                     enableSnippets: true
                });
                
                aceBinder(this.model, "helpers", this.helpersEditor);

                self.$el.find("#previewFrameWrap").contents().find('html').html(
                    "<iframe name='previewFrame' frameborder='0' allowtransparency='true' allowfullscreen='true' style='width: 100%; height: 100%;'></iframe>");


                self.$el.find("[name=previewFrame]").on("load", function() {
                    self.$el.find(".preview-loader").hide();
                    //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
                    //$(this).show();
                });

                self.listenTo(app.layout, "dialog-opening", function() {
                    self.$el.find("[name=previewFrame]").hide();
                });

                self.listenTo(app.layout, "dialog-closing", function() {
                    self.$el.find("[name=previewFrame]").show();
                });


                this.$el.find(".split-pane").splitPane();
            },

            setContentAceMode: function() {
                this.contentEditor.getSession().setMode("ace/mode/handlebars");
            },

            triggerPreview: function() {
                this.trigger("preview");
            },

            validateLeaving: function() {
                return !this.model.hasChangesSyncLastSync();
            }
        });
    });
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('dashboard.templates.model',["backbone", "app", "template.model"], function (Backbone, app, TemplateModel) {
    return Backbone.Collection.extend({
        url: function() {
            return "odata/templates?$top=4&$orderby=modificationDate desc"
        },

        model: TemplateModel
    });
});


/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('dashboard.templates.view',["marionette", "backbone", "jquery"], function(Marionette, Backbone, $) {

    return Backbone.Marionette.ItemView.extend({
        template: "dashboard-templates",

        events: {
            "click tr": "showDetail"
        },

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
        },

        showDetail: function (ev, data) {
            var id = $(ev.target).closest("tr").attr("data-id");
            window.location.hash = "extension/templates/" + id;
        }
    });
    
});


define('template.preview',["underscore", "jquery", "app"], function (_, $, app) {

    function getUIState(model) {

        /*function justNotNull(o) {
            var clone = {};
            for (var key in o) {
                if (o[key] != null)
                    clone[key] = o[key];
            }

            return clone;
        }*/

        //var state = {};
        var state = model.toJSON();
        /*for (var key in json) {
            if (json[key] != null)
                state[key] = justNotNull(json[key].toJSON());
            else
                state[key] = json[key];
        }*/

        state.content = state.content || " ";
        state.helpers = state.helpers || "";

        delete state._id;
        /* not sure about this, I need shortid for reports, so why it is here deleted */
        //delete state.shortid;
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

        var request = { template: uiState, options: $.extend({ preview: true}, uiState.options ) };

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
            mapForm.action = app.serverUrl + "api/report?studio=" + app.options.studio;

            function addBody(path, body) {
                if (body == null)
                    return;

                for (var key in body) {
                    if (_.isObject(body[key])) {
                        addBody(path + "[" + key + "]", body[key]);
                    } else {
                        if (body[key] !== undefined && !(body[key] instanceof Array))
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

            app.trigger("preview-form-submit", mapForm);
            document.body.appendChild(mapForm);
            mapForm.submit();
            app.trigger("after-template-render");
        });
    };

    return fn;
});

/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define('template.detail.toolbar.view',["jquery", "app", "marionette", "core/utils", "core/view.base", "underscore", "core/listenerCollection",
        "core/basicModel", "template.preview"],
    function($, app, Marionette, Utils, LayoutBase, _, ListenerCollection, BasicModel, preview) {
        return LayoutBase.extend({
            template: "template-detail-toolbar",
            introTemplate: "template-detail-intro",
            introId: "template-detail-intro",

            initialize: function() {
                var self = this;

                $(document).on('keydown.template-detail', this.hotkey.bind(this));

                this.beforeRenderListeners = new ListenerCollection();
                this.listenTo(this.model, "sync", function() {
                    if (self.viewRendered)
                        return;

                    //TODO it seems to work even whitout this call
                    //self.render();
                    self.viewRendered = true;

                    self.listenTo(self.contentView, "preview", function() {
                        self.preview();
                    });
                });

                this.listenTo(this, "render", function() {
                    var context = {
                        template: self.model,
                        extensionsRegion: self.extensionsRegion,
                        view: self
                    };
                    app.trigger("template-extensions-render", context);

                    var contextToolbar = {
                        name: "template-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });

                _.bindAll(this, "preview", "previewNewPanel", "onClose");
            },

            getRecipes: function() {
                return app.recipes;
            },

            getEngines: function() {
                return app.engines;
            },

            regions: {
                extensionsRegion: {
                    selector: "#extensionsBox",
                    regionType: Marionette.MultiRegion
                },
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
            },

            events: {
                "click #saveCommand": "save",
                "click #previewCommand": "preview",
                "click #previewNewTabCommand": "previewNewPanel",
                "click #apiHelpCommnand": "apiHelp",
                "click #linkCommand": "link"
            },

            save: function(e) {
                var self = this;

                if (!this.validate())
                    return;

                this.model.save({}, {
                    success: function() {
                        app.trigger("template-saved", self.model);
                    }
                });
            },

            previewNewPanel: function() {
                this._preview("_blank");
                this.contentView.$el.find(".preview-loader").hide();
            },

            preview: function() {
                this._preview("previewFrame");
            },

            _preview: function(target) {
                preview(this.model, this.beforeRenderListeners, target);
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("name") == null || this.model.get("name") === "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                if (this.model.get("recipe") == null)
                    res.push({
                        message: "Recipe must be selected"
                    });

                return res;
            },

            apiHelp: function() {
                $.dialog({
                    header: "jsreport API",
                    content: $.render["template-detail-api"](this.model.toJSON(), this),
                    hideSubmit: true
                });

                var req = { template: { content: "...", helpers: "...", engine: "...", recipe: "..."}, options: {}};

                this.model.trigger("api-overrides", req);

                var apiBox = ace.edit("apiBox");
                apiBox.setTheme("ace/theme/chrome");
                apiBox.getSession().setMode("ace/mode/json");
                apiBox.setOptions({
                    readOnly: true,
                    highlightActiveLine: false,
                    highlightGutterLine: false
                });

                apiBox.setValue(JSON.stringify(req , null, 2));
                apiBox.gotoLine(-1);
            },

            link: function() {
                $.dialog({
                    header: "Link to template",
                    content: $.render["template-detail-link"](this.model.toJSON(), this),
                    hideSubmit: true
                });
            },

            hotkey: function(e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }

                if (e.which === 119) {
                    this.preview();
                    e.preventDefault();
                    return false;
                }
            },

            onClose: function() {
                $(document).off(".template-detail");
            }
        });
    });
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "app", "marionette", "backbone",
        "template.list.model", "template.list.view", "template.list.toolbar.view",
        "template.model", "template.detail.view",
        "dashboard.templates.model", "dashboard.templates.view",
        "template.detail.toolbar.view", "template.preview"],
    function ($, app, Marionette, Backbone, TemplateListModel, TemplateListView, TemplateListTooolbarView, TemplateModel, TemplateDetailView, DashboardModel, DashboardView, ToolbarView, preview) {
        return app.module("template", function (module) {
            module.TemplateListView = TemplateListView;
            module.TemplateListModel = TemplateListModel;
            module.TemplateListTooolbarView = TemplateListTooolbarView;
            module.TemplateDetailTooolbarView = ToolbarView;
            module.preview = preview;


            this.listenTo(app, "after-start", function() {
                //jump to template designer on the first start
                if (!app.settings.firstRun)
                    return;

                app.dataProvider.get("odata/templates?$limit=1").then(function(templates) {
                    if (templates.length === 0)
                        window.location.hash = "/playground";
                    else
                        window.location.hash = "#/extension/templates/" + templates[0].shortid;
                });
            });

            var Router = Backbone.Router.extend({
                initialize: function () {
                    var self = this;
                    app.listenTo(app, "template-saved", function (templateModel) {
                        self.navigate("/playground/" + templateModel.get("shortid"));
                    });
                },

                routes: {
                    "extension/templates": "templates",
                    "extension/templates/:id(/)(:version)": "templateDetail",
                    "playground": "playground",
                    "playground/:id(/:version)": "playground"
                },

                templates: function () {
                    this.navigate("/extension/templates");
                    var model = new TemplateListModel();

                    app.layout.showToolbarViewComposition(new TemplateListView({ collection: model }), new TemplateListTooolbarView({ collection: model }));

                    model.fetch();
                },

                showTemplateView: function (id, version) {
                    var model = new TemplateModel({ version: version });

                    function show() {
                        app.layout.showToolbarViewComposition(new TemplateDetailView({ model: model }), new ToolbarView({ model: model }));
                    }

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch({
                            success: function () {
                                show();
                            }
                        });
                    } else {
                        show();
                    }
                },

                templateDetail: function (id, version) {
                    this.showTemplateView(id, version);
                },

                playground: function (id, version) {
                    if (this.navigatingForFirstSave) {
                        this.navigatingForFirstSave = false;
                        return;
                    }

                    this.showTemplateView(id, version);
                }
            });

            module.on("created", function () {
                module.router.templates();
            });

            module.router = new Router();


            app.on("menu-render", function (context) {
                context.result += "<li><a href='#/extension/templates'>Templates</a></li>";
            });

            app.on("menu-actions-render", function (context) {
                context.result += "<li><a id='createTemplateCommand' href='#/playground'>Create Template</a></li>";
            });

            app.on("dashboard-extensions-render", function (region) {
                var model = new DashboardModel();
                region.show(new DashboardView({
                    collection: model
                }), "templates");
                model.fetch();
            });
        });
    });
