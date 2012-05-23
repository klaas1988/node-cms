'use strict';

var app = require('express').createServer(),
    redis = require('redis'),
    io = require('socket.io').listen(app);

if(process.env.VMC_APP_PORT) {
    io.set('transports', [
        //'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]);
}
var Pageview = function() {
    this.count = 0;
};
Pageview.prototype.increment = function() {
    this.count++;
    io.sockets.on('connection', function(socket) {
        socket.emit('pageview', {count: this.count});
        //socket.on('my other event', function(data) {
            //console.log(data);
        //});
    });
    return this.count+'';
};
var pv = new Pageview();

app.get('/', function(req, res) {
    var redisCred = {
        'hostname': '172.30.48.46',
        'host': '172.30.48.46',
        'port': 5153,
        'password': '5789f62a-6c45-4d2b-9c4f-00b693d6a37f',
        'name': 'c02f6b32-31d5-441b-bf00-12981aaf3f77'
    };
    if(process.env.VCAP_SERVICES) {
        var env = JSON.parse(process.env.VCAP_SERVICES);
        redisCred = env['redis-2.2'][0].credentials;
    }

    var client = redis.createClient(redisCred.port, redisCred.hostname);

    client.auth(redisCred.password);

    client.on('connect', function () {
        client.auth(redisCred.password, function(err, res) {
            if(err) {
                res.send('CONNECT: err '+err);
            }
        });
    });

    client.on('ready', function(err) {
        if(err) {
            res.send('READY: err '+err);
        }
        client.get('count', function(err, reply) {
            var newValue = pv.increment();
            client.set('count', newValue);
            client.quit();
            res.render('layout.ejs', {count: newValue});
        });
    });

    client.on('error', function(err) {
        res.send(err);
    });

});
app.listen(process.env.VCAP_APP_PORT || process.env.C9_PORT || 3000);
