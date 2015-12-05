/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery", "core/basicModel"], function(app, $, ModelBase) {

    var defaultEngine = app.engines.filter(function(e) {
        return e === 'handlebars'
    }).length ? 'handlebars' : 'none'

    var defaultRecipe = app.recipes.filter(function(r) {
        return r === 'phantom-pdf'
    }).length ? 'phantom-pdf' : 'html'

    return ModelBase.extend({
        odata: "templates",
        url: "odata/templates",

        toString: function() {
            return "Template " + (this.get("name") || "");
        },

        defaults: {
            engine: defaultEngine,
            recipe: defaultRecipe
        }
    });
});