var App = require('wotcs-api-system').App;
var Queue = require('./queue');
var config = require('./config');

var app = new App(__dirname, config);
//app.setErrorHandler('Errors');

if (app.isMaster){
    var queue = new Queue();
    app.setupWorkers(0, 'player_loader', 'player_loader_client', queue);
}