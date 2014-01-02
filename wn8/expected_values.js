var csv = require('csv');
var _ = require('underscore');

var keys = [];
var data = {};

csv()
    .from.path(__dirname+'/expected14.csv', { delimiter: ',', escape: '"' })
    .on('record', function(row,index){
        if(index == 0){
            _(row).each(function(key) {
                keys.push(key);
            });
        }else{
            data[row[0]] = _.object(keys,row);
        }
    }).on('end', function(){
        console.log(data);
    });
module.exprots = data;