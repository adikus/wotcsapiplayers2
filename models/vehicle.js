var cls = require('../lib/class');
var _ = require('underscore');

module.exports = cls.Class.extend({

    init: function(data) {
        _(data).each(function(value, key) {
            this[key] = value;
        }, this);
    }

});