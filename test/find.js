var log = require('logger')('service-binaries:test:find');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var errors = require('errors');
var should = require('should');
var request = require('request');
var links = require('parse-link-header');
var pot = require('pot');

describe('GET /binaries', function () {
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
            createBinaries(client.users[0], 10, function (err) {
              if (err) {
                return done(err);
              }
              createBinaries(client.users[1], 10, done);
            });
          });
        });
      });
    });

    var createBinaries = function (user, count, done) {
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
                    content: fs.createReadStream(__dirname + '/images/image.png')
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

    var findPages = function (r) {
        should.exist(r.headers.link);
        var pages = links(r.headers.link);
        should.exist(pages.last);
        should.exist(pages.last.rel);
        pages.last.rel.should.equal('last');
        should.exist(pages.last.data);
        should.exist(pages.last.url);
        should.exist(pages.next);
        should.exist(pages.next.rel);
        pages.next.rel.should.equal('next');
        should.exist(pages.next.data);
        should.exist(pages.next.url);
        return pages;
    };

    var findFirstPages = function (r) {
        should.exist(r.headers.link);
        var pages = links(r.headers.link);
        should.exist(pages.next);
        should.exist(pages.next.rel);
        pages.next.rel.should.equal('next');
        should.exist(pages.next.data);
        should.exist(pages.next.url);
        return pages;
    };

    var findLastPages = function (r) {
        should.exist(r.headers.link);
        var pages = links(r.headers.link);
        should.exist(pages.last);
        should.exist(pages.last.rel);
        pages.last.rel.should.equal('last');
        should.exist(pages.last.data);
        should.exist(pages.last.url);
        return pages;
    };

    var validateBinaries = function (binaries) {
        binaries.forEach(function (binary) {
            should.exist(binary.id);
            should.exist(binary.user);
            should.exist(binary.createdAt);
            should.exist(binary.updatedAt);
            should.not.exist(binary._id);
            should.not.exist(binary.__v);
        });
    };

    it('default paging', function (done) {
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
            b.length.should.equal(10);
            validateBinaries(b);
            request({
                uri: pot.resolve('accounts', '/apis/v/binaries'),
                method: 'GET',
                auth: {
                    bearer: client.users[0].token
                },
                qs: {
                    data: JSON.stringify({
                        count: 5
                    })
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                should.exist(b.length);
                b.length.should.equal(5);
                validateBinaries(b);
                findFirstPages(r);
                done();
            });
        });
    });

    it('by user0', function (done) {
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
            b.length.should.equal(10);
            validateBinaries(b);
            b.forEach(function (v) {
                v.user.should.equal(client.users[0].profile.id);
            });
            request({
                uri: pot.resolve('accounts', '/apis/v/binaries'),
                method: 'GET',
                auth: {
                    bearer: client.users[0].token
                },
                qs: {
                    data: JSON.stringify({
                        count: 5
                    })
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                should.exist(b.length);
                b.length.should.equal(5);
                validateBinaries(b);
                b.forEach(function (v) {
                    v.user.should.equal(client.users[0].profile.id);
                });
                findFirstPages(r);
                done();
            });
        });
    });

    it('by user1', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/binaries'),
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
            should.exist(b.length);
            b.length.should.equal(10);
            validateBinaries(b);
            b.forEach(function (v) {
                v.user.should.equal(client.users[1].profile.id);
            });
            request({
                uri: pot.resolve('accounts', '/apis/v/binaries'),
                method: 'GET',
                auth: {
                    bearer: client.users[1].token
                },
                qs: {
                    data: JSON.stringify({
                        count: 5
                    })
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                should.exist(b.length);
                b.length.should.equal(5);
                validateBinaries(b);
                b.forEach(function (v) {
                    v.user.should.equal(client.users[1].profile.id);
                });
                findFirstPages(r);
                done();
            });
        });
    });

    it('by user2', function (done) {
        createBinaries(client.users[2], 10, function (err) {
            if (err) {
                return done(err);
            }
            request({
                uri: pot.resolve('accounts', '/apis/v/binaries'),
                method: 'GET',
                auth: {
                    bearer: client.users[2].token
                },
                qs: {
                    data: JSON.stringify({
                        count: 5
                    })
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                should.exist(b.length);
                b.length.should.equal(5);
                async.each(b, function (v, ran) {
                    should.exist(v.user);
                    v.user.should.equal(client.users[2].profile.id);
                    v.permissions.push({
                        group: groups.public.id,
                        actions: ['read']
                    });
                    v.visibility['*'].groups.push(groups.public.id);
                    request({
                        uri: pot.resolve('accounts', '/apis/v/binaries/' + v.id),
                        method: 'PUT',
                        formData: {
                            data: JSON.stringify(v)
                        },
                        auth: {
                            bearer: client.users[2].token
                        },
                        json: true
                    }, function (e, r, b) {
                        if (e) {
                            return ran(e);
                        }
                        r.statusCode.should.equal(200);
                        ran();
                    });
                }, function (err) {
                    if (err) {
                        return done(err);
                    }
                    request({
                        uri: pot.resolve('accounts', '/apis/v/binaries'),
                        method: 'GET',
                        auth: {
                            bearer: client.users[1].token
                        },
                        qs: {
                            data: JSON.stringify({
                                count: 5
                            })
                        },
                        json: true
                    }, function (e, r, b) {
                        if (e) {
                            return done(e);
                        }
                        r.statusCode.should.equal(200);
                        should.exist(b);
                        should.exist(b.length);
                        b.length.should.equal(5);
                        var user1 = 0;
                        var user2 = 0;
                        var users = [client.users[1].profile.id, client.users[2].profile.id];
                        b.forEach(function (v) {
                            should.exist(v.user);
                            var index = users.indexOf(v.user);
                            index.should.not.equal(-1);
                            if (index === 0) {
                                return user1++
                            }
                            if (index === 1) {
                                return user2++
                            }
                        });
                        var firstPages = findFirstPages(r);
                        request({
                            uri: firstPages.next.url,
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
                            should.exist(b.length);
                            b.length.should.equal(5);
                            b.forEach(function (v) {
                                should.exist(v.user);
                                var index = users.indexOf(v.user);
                                index.should.not.equal(-1);
                                if (index === 0) {
                                    return user1++
                                }
                                if (index === 1) {
                                    return user2++
                                }
                            });
                            user1.should.equal(5);
                            user2.should.equal(5);
                            done();
                        });
                    });
                });
            });
        });
    });
});