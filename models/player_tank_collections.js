var BaseCollection = require('wotcs-api-system').BaseCollection('Mongo');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    dbName: 'MongoDB',

    findByPlayerID: function (id, callback) {
        this.where({p: id}, function(err, tanks) {
            callback(err, tanks ? tanks[0] : null);
        });
    }

});