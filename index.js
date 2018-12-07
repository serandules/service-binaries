var log = require('logger')('service-binaries');
var bodyParser = require('body-parser');

var errors = require('errors');
var auth = require('auth');
var throttle = require('throttle');
var serandi = require('serandi');
var model = require('model');
var Binaries = require('model-binaries');

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
  router.post('/',
    serandi.multipart,
    serandi.create(Binaries),
    function (req, res, next) {
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
      model.create(req.ctx, function (err, binary) {
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

  router.put('/:id',
    serandi.multipart,
    serandi.update(Binaries),
    function (req, res, next) {
      var stream = req.streams.content || [];
      stream = stream[0];
      var found = req.ctx.found;
      var data = req.ctx.data;
      var type = data.type;
      var plugin = plugins[type];
      if (!plugin) {
        log.error('binaries:no-plugin', 'type:%s', type);
        return next(errors.serverError());
      }
      update(plugin, found, stream, data, function (err, data) {
        if (err) {
          return next(err);
        }
        model.update(req.ctx, function (err, binary) {
          if (err) {
            return next(err);
          }
          res.locate(binary.id).status(200).send(binary);
        });
      });
    });

  router.get('/:id',
    serandi.findOne(Binaries),
    function (req, res, next) {
      model.findOne(req.ctx, function (err, binary) {
        if (err) {
          return next(err);
        }
        res.send(binary);
      });
    });

  /**
   * /binaries?data={}
   */
  router.get('/',
    serandi.find(Binaries),
    function (req, res, next) {
      model.find(req.ctx, function (err, binaries, paging) {
        if (err) {
          return next(err);
        }
        res.many(binaries, paging);
      });
    });

  router.delete('/:id',
    serandi.remove(Binaries),
    function (req, res, next) {
      model.remove(req.ctx, function (err) {
        if (err) {
          return next(err);
        }
        res.status(204).end();
      });
    });

  done();
};

