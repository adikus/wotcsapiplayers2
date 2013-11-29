var Eventer = require('wotcs-api-system').Eventer;
var Regions = require('./shared/regions');
var _ = require('underscore');

module.exports = Eventer.extend({

    setModels: function(models){
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    fillQueue: function() {

    }

});