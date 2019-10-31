var log = require('logger')('service-binaries:test:find');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('GET /binaries/:id', function () {
  var client;
  var groups;
  before(function (done) {
    pot.drop('binaries', function (err) {
      if (err) {
        return done(err);
      }
      pot.client(function (err, c) {
        if (err) {
          return done(err);
        }
        client = c;
        pot.groups(function (err, g) {
          if (err) {
            return done(err);
          }
          groups = g;
          createBinary(client.users[0], 1, function (err) {
            if (err) {
              return done(err);
            }
            createBinary(client.users[1], 1, done);
          });
        });
      });
    });
  });

  var createBinary = function (user, count, done) {
    async.whilst(function () {
      return count-- > 0
    }, function (created) {
      request({
        uri: pot.resolve('accounts', '/apis/v/binaries'),
        method: 'POST',
        formData: {
          data: JSON.stringify({
            type: 'image'
          }),
          content: fs.createReadStream(__dirname + '/images/image.png'),
        },
        auth: {
          bearer: user.token
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return created(e);
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
        created();
      });
    }, done);
  };

  var validateBinary = function (binaries) {
    binaries.forEach(function (binary) {
      should.exist(binary.id);
      should.exist(binary.user);
      should.exist(binary.createdAt);
      should.exist(binary.modifiedAt);
      should.exist(binary.content);
      should.not.exist(binary._id);
      should.not.exist(binary.__v);
    });
  };

  it('invalid id', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries/undefined'),
      method: 'GET',
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

  it('owner can access', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateBinary(b);
      request({
        uri: pot.resolve('accounts', '/apis/v/binaries/' + b[0].id),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        validateBinary([b]);
        done();
      });
    });
  });

  it('others cannot access', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateBinary(b);
      request({
        uri: pot.resolve('accounts', '/apis/v/binaries/' + b[0].id),
        method: 'GET',
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

  it('can be accessed by anyone when public', function (done) {
    request({
      uri: pot.resolve('accounts', '/apis/v/binaries'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateBinary(b);
      var binary = b[0];
      request({
        uri: pot.resolve('accounts', '/apis/v/binaries/' + binary.id),
        method: 'GET',
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
        request({
          uri: pot.resolve('accounts', '/apis/v/binaries/' + binary.id),
          method: 'GET',
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
          pot.publish('accounts', 'binaries', binary.id, client.users[0].token, client.admin.token, function (err) {
            if (err) {
              return done(err);
            }
            request({
              uri: pot.resolve('accounts', '/apis/v/binaries/' + binary.id),
              method: 'GET',
              auth: {
                bearer: client.users[1].token
              },
              json: true
            }, function (e, r, b) {
              if (e) {
                return done(e);
              }
              r.statusCode.should.equal(200);
              should.exist(b);
              validateBinary([b]);
              request({
                uri: pot.resolve('accounts', '/apis/v/binaries/' + binary.id),
                method: 'GET',
                auth: {
                  bearer: client.users[2].token
                },
                json: true
              }, function (e, r, b) {
                if (e) {
                  return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                validateBinary([b]);
                done();
              });
            });
          });
        });
      });
    });
  });
});
