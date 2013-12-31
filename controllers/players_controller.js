var BaseController = require('wotcs-api-system').BaseController;
var PlayerCache = require('./../player_cache');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function(req, res) {
        var ID = this.getID(req, res);
        if(!ID){ return; }

        var fast = req.query.fast || false;
        var options = { polling: { event: fast ? 'loaded' : 'done' } };

        var playerCache = this.getCache('player.'+ID);
        if(!playerCache){
            playerCache = new PlayerCache(ID, this.workerManager);
            this.setCache('player.'+ID, playerCache);
        }
        if(playerCache.done || ( playerCache.loaded && fast )){
            res.json( playerCache.getData() );
        }else{
            this.longPoleFromCache(playerCache, 'getData', options);
        }
    },

    getID: function(req, res) {
        var ID = parseInt(req.params.id,10);
        if(isNaN(ID)){
            res.json({status: 'error', error:"Bad ID"});
            return false;
        }
        return ID;
    }

});