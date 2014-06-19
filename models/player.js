var BaseModel = require('wotcs-api-system').BaseModel('PG');
var _ = require('underscore');

module.exports = BaseModel.extend({

    timestamps: true,

    getData: function() {
        return {
            name: this.name,
            status: this.status,
            updated_at: new Date(this.updated_at)
        };
    },

    update: function(data, callback) {
        this.name = data.nickname;
        this.save(['name'], function(err) {
            if(err){console.log(err);}
        });
        if(callback){ callback(); }
    }

});