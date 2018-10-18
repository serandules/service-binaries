var log = require('logger')('service-binaries:test:create');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('POST /binaries', function () {
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

  it('with no media type', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'POST',
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
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'POST',
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

  it('without data', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'POST',
      formData: {
        data: JSON.stringify({
          type: 'image'
        }),
        something: [
          fs.createReadStream(__dirname + '/images/car.jpg'),
          fs.createReadStream(__dirname + '/images/car.jpg')
        ]
      },
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.unprocessableEntity().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.unprocessableEntity().data.code);
      done();
    });
  });

  it('without type field', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'POST',
      formData: {
        data: JSON.stringify({}),
        content: fs.createReadStream(__dirname + '/images/car.jpg'),
        something: [
          fs.createReadStream(__dirname + '/images/car.jpg'),
          fs.createReadStream(__dirname + '/images/car.jpg')
        ]
      },
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.unprocessableEntity().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.unprocessableEntity().data.code);
      done();
    });
  });

  it('with valid fields', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
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
        bearer: client.users[0].token
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
      r.headers['location'].should.equal(pot.resolve('accounts', '/apis/v/binaries/' + b.id));
      done();
    });
  });

});