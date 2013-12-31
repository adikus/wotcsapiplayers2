var cls = require("./../lib/class");
var _ = require("underscore");
var http = require("http");

module.exports = Request = cls.Class.extend({
    init: function(ID){
        this.data = '';

        this.start = new Date();

        this.host = this.getHost(ID);
        this.path = '/community/accounts/'+ID+'/';
        var	self = this,
            options = {
                host: this.host,
                port: 80,
                path: this.path,
                method: 'GET'
            };

        this.request = http.request(options, function(res) {
            var error = res.statusCode != 200;
            if(error && res.statusCode != 503){
                console.log(res.statusCode, self.path, res);
            }

            res.on('data', function (chunk) {
                if(!error){
                    self.data += chunk.toString('utf8');
                }
            });

            res.on('end', function (chunk) {
                if(!error){
                    if(chunk){
                        self.data += chunk.toString('utf8');
                    }
                    if(self.success_callback){
                        self.success_callback(self.data);
                    }
                }else {
                    if(self.error_callback){
                        self.error_callback(res.statusCode);
                    }
                }
            });
        });

        this.request.on('error', function(e) {
            console.log('Problem with request: ', self.path, e.message);
            self.error_callback(e.message);
        });

        this.request.end();
    },

    getDuration: function() {
        return (new Date()).getTime() - this.start.getTime();
    },

    onSuccess: function(callback){
        this.success_callback = callback;
    },

    onError: function(callback){
        this.error_callback = callback;
    },

    getHost: function(id) {
        if(id > 3000000000){return "worldoftanks.kr";}
        if(id > 2500000000){return "portal-wot.go.vn";}
        if(id > 2000000000){return "worldoftanks.asia";}
        if(id > 1000000000){return "worldoftanks.com";}
        if(id > 500000000){return "worldoftanks.eu";}
        return "worldoftanks.ru";
    }

});