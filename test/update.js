var log = require('logger')('service-binaries:test:update');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('PUT /binaries/:id', function () {
    var client;
    var binary;
    before(function (done) {
        pot.client(function (err, c) {
            if (err) {
                return done(err);
            }
            client = c;
            create(client.users[0], function (err, v) {
                if (err) {
                    return done(err);
                }
                binary = v;
                done();
            });
        });
    });

    var create = function (user, done) {
        request({
            uri: pot.resolve('apis', '/v/binaries'),
            method: 'POST',
            formData: {
                data: JSON.stringify({
                  type: 'image'
                }),
                content: fs.createReadStream(__dirname + '/images/image.png'),
                something: [
                    fs.createReadStream(__dirname + '/images/image.png'),
                    fs.createReadStream(__dirname + '/images/image.png')
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
            r.headers['location'].should.equal(pot.resolve('apis', '/v/binaries/' + b.id));
            done(null, b);
        });
    };

    it('with no media type', function (done) {
        request({
            uri: pot.resolve('apis', '/v/binaries/' + binary.id),
            method: 'PUT',
            auth: {
                bearer: client.users[0].token
            }
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.unsupportedMedia().status);
            should.exist(b);
            b = JSON.parse(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.unsupportedMedia().data.code);
            done();
        });
    });

    it('with unsupported media type', function (done) {
        request({
            uri: pot.resolve('apis', '/v/binaries/' + binary.id),
            method: 'PUT',
            headers: {
                'Content-Type': 'application/xml'
            },
            auth: {
                bearer: client.users[0].token
            }
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.unsupportedMedia().status);
            should.exist(b);
            b = JSON.parse(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.unsupportedMedia().data.code);
            done();
        });
    });

    it('with valid fields', function (done) {
        var v0 = pot.clone(binary);
        request({
            uri: pot.resolve('apis', '/v/binaries/' + binary.id),
            method: 'PUT',
            formData: {
                data: JSON.stringify(v0),
                something: [
                    fs.createReadStream(__dirname + '/images/image.png'),
                    fs.createReadStream(__dirname + '/images/image.png')
                ]
            },
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, v1) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(v1);
            should.exist(v1.id);
            should.exist(v1.user);
            should.exist(v1.type);
            should.exist(v1.content);
            v1.id.should.equal(binary.id);
            v1.user.should.equal(binary.user);
            v1.type.should.equal('image');
            v1.content.should.equal(binary.id);
            should.exist(r.headers['location']);
            r.headers['location'].should.equal(pot.resolve('apis', '/v/binaries/' + v1.id));
            delete v1.content;
            request({
                uri: pot.resolve('apis', '/v/binaries/' + binary.id),
                method: 'PUT',
                formData: {
                    data: JSON.stringify(v1),
                    content:fs.createReadStream(__dirname + '/images/image.png'),
                    something: [
                        fs.createReadStream(__dirname + '/images/image.png'),
                        fs.createReadStream(__dirname + '/images/image.png')
                    ]
                },
                auth: {
                    bearer: client.users[0].token
                },
                json: true
            }, function (e, r, v2) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(v2);
                should.exist(v2.id);
                should.exist(v2.user);
                should.exist(v2.type);
                should.exist(v2.content);
                v2.id.should.equal(v1.id);
                v2.user.should.equal(v1.user);
                v2.type.should.equal('image');
                v2.content.should.equal(v1.id);
                should.exist(r.headers['location']);
                r.headers['location'].should.equal(pot.resolve('apis', '/v/binaries/' + v2.id));
                done();
            });
        });
    });

    it('by unauthorized user', function (done) {
        var v0 = pot.clone(binary);
        request({
            uri: pot.resolve('apis', '/v/binaries/' + binary.id),
            method: 'PUT',
            formData: {
                data: JSON.stringify(v0),
                content: fs.createReadStream(__dirname + '/images/image.png'),
                something: [
                    fs.createReadStream(__dirname + '/images/image.png'),
                    fs.createReadStream(__dirname + '/images/image.png')
                ]
            },
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

    it('invalid id', function (done) {
        var v0 = pot.clone(binary);
        request({
            uri: pot.resolve('apis', '/v/binaries/invalid'),
            method: 'PUT',
            formData: {
                data: JSON.stringify(v0)
            },
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
