var log = require('logger')('service-binaries');
var fs = require('fs');
var async = require('async');
var bodyParser = require('body-parser');

var utils = require('utils');
var errors = require('errors');
var mongutils = require('mongutils');
var auth = require('auth');
var throttle = require('throttle');
var serandi = require('serandi');

var Binaries = require('model-binaries');

var validators = require('./validators');
var sanitizers = require('./sanitizers');

var plugins = {
  image: require('./plugins/image')
};

var update = function (plugin, found, stream, data, done) {
  if (!stream) {
    return done(null, data);
  }
  plugin(found.id, stream.path, function (err) {
    if (err) {
      return done(err);
    }
    data.content = found.id;
    done(null, data);
  });
};

module.exports = function (router, done) {
  router.use(serandi.many);
  router.use(serandi.ctx);
  router.use(auth());
  router.use(throttle.apis('binaries'));
  router.use(bodyParser.json());

  /**
   * {"name": "serandives app"}
   */
  router.post('/', validators.create, sanitizers.create, function (req, res, next) {
    var stream = req.streams.content;
    stream = stream[0];
    var data = req.body;
    var type = data.type;
    var plugin = plugins[type];
    if (!plugin) {
      log.error('binaries:no-plugin', 'type:%s', type);
      return res.pond(errors.serverError());
    }
    data.content = 'dummy';
    Binaries.create(req.body, function (err, binary) {
      if (err) {
        return next(err);
      }
      var id = binary.id;
      plugin(id, stream.path, function (err) {
        if (err) {
          log.error('binaries:create:plugin-error', 'id:%s type:%s path:%s', id, type, stream.path, err);
          Binaries.remove({_id: id}, function (err) {
            if (err) {
              log.error('binaries:remove-failed', err);
            }
          });
          return res.pond(errors.serverError());
        }
        Binaries.update({_id: id}, {content: id}, function (err) {
          if (err) {
            log.error('binaries:update-content', err);
            return res.pond(errors.serverError());
          }
          binary.content = id;
          res.locate(id).status(201).send(binary);
        });
      });
    });
  });

  router.put('/:id', validators.update, sanitizers.update, function (req, res, next) {
    var stream = req.streams.content || [];
    stream = stream[0];
    var found = req.found;
    var data = req.body;
    var type = data.type;
    var plugin = plugins[type];
    if (!plugin) {
      log.error('binaries:no-plugin', 'type:%s', type);
      return res.pond(errors.serverError());
    }
    update(plugin, found, stream, data, function (err, data) {
      if (err) {
        return next(err);
      }
      mongutils.update(Binaries, req.query, data, function (err, binary) {
        if (err) {
          return next(err);
        }
        res.locate(binary.id).status(200).send(binary);
      });
    });
  });

  router.get('/:id', validators.findOne, sanitizers.findOne, function (req, res, next) {
    mongutils.findOne(Binaries, req.query, function (err, binary) {
      if (err) {
        return next(err);
      }
      res.send(binary);
    });
  });

  /**
   * /binaries?data={}
   */
  router.get('/', validators.find, sanitizers.find, function (req, res, next) {
    mongutils.find(Binaries, req.query.data, function (err, binaries, paging) {
      if (err) {
        return next(err);
      }
      res.many(binaries, paging);
    });
  });

  router.delete('/:id', validators.findOne, sanitizers.findOne, function (req, res, next) {
    mongutils.remove(Binaries, req.query, function (err) {
      if (err) {
        return next(err);
      }
      res.status(204).end();
    });
  });

  done();
};

