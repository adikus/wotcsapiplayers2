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
        this.clan_id = data.clan && data.clan.clan_id ? parseInt(data.clan.clan_id, 10) : 0;
        this.save(['name', 'clan_id'], function(err) {
            if(err){console.log(err);}
        });
        if(callback){ callback(); }
    }

});