var BaseCollection = require('wotcs-api-system').BaseCollection('PG');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    dbName: 'MainDB',

    findByPlayerID: function (id, callback) {
        this.where(['player_id = ?', id], function(err, stats) {
            callback(err, stats ? stats[0] : null);
        });
    }

});