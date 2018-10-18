var log = require('logger')('service-binaries:test:remove');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('DELETE /binaries/:id', function () {
    var client;
    before(function (done) {
        pot.client(function (err, c) {
            if (err) {
                return done(err);
            }
            client = c;
            done();
        });
    });

    var create = function (user, done) {
        request({
            uri: pot.resolve('autos', '/apis/v/binaries'),
            method: 'POST',
            formData: {
                data: JSON.stringify({
                  type: 'image'
                }),
                content: fs.createReadStream(__dirname + '/images/car.jpg'),
                something: [
                    fs.createReadStream(__dirname + '/images/car.jpg'),
                    fs.createReadStream(__dirname + '/images/car.jpg')
                ]
            },
            auth: {
                bearer: user.token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(201);
            should.exist(b);
            should.exist(b.id);
            should.exist(b.type);
            should.exist(b.content);
            b.type.should.equal('image');
            b.content.should.equal(b.id);
            should.exist(r.headers['location']);
            r.headers['location'].should.equal(pot.resolve('autos', '/apis/v/binaries/' + b.id));
            done(null, b);
        });
    };

    it('by unauthorized user', function (done) {
        create(client.users[0], function (err, binary) {
            if (err) {
                return done(err);
            }
            request({
                uri: pot.resolve('autos', '/apis/v/binaries/' + binary.id),
                method: 'DELETE',
                auth: {
                    bearer: client.users[1].token
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(errors.notFound().status);
                should.exist(b);
                should.exist(b.code);
                should.exist(b.message);
                b.code.should.equal(errors.notFound().data.code);
                done();
            });
        });
    });

    it('by authorized user', function (done) {
        create(client.users[0], function (err, binary) {
            if (err) {
                return done(err);
            }
            request({
                uri: pot.resolve('autos', '/apis/v/binaries/' + binary.id),
                method: 'DELETE',
                auth: {
                    bearer: client.users[0].token
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(204);
                done();
            });
        });
    });

    it('non existing', function (done) {
        request({
            uri: pot.resolve('autos', '/apis/v/binaries/59417b1220873e577df88aa2'),
            method: 'DELETE',
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.notFound().status);
            should.exist(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.notFound().data.code);
            done();
        });
    });
});