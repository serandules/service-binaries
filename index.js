var log = require('logger')('service-binaries');
var fs = require('fs');
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

var bucket = utils.bucket('binaries.serandives.com');

var upload = function (name, stream, done) {
  utils.s3().upload({
    Bucket: bucket,
    Key: name,
    Body: stream
  }, function (err) {
    done(err, name);
  });
};

var update = function (found, data, stream, done) {
  if (!stream) {
    return done(null, data);
  }
  stream = fs.createReadStream(stream.path);
  upload(found.id, stream, function (err, id) {
    if (err) {
      return done(err);
    }
    data.content = id;
    done(null, data);
  });
};


module.exports = function (router) {
  router.use(serandi.many);
  router.use(serandi.ctx);
  router.use(auth({}));
  router.use(throttle.apis('binaries'));
  router.use(bodyParser.json());

  /**
   * {"name": "serandives app"}
   */
  router.post('/', validators.create, sanitizers.create, function (req, res) {
    var stream = req.streams.content;
    stream = stream[0];
    stream = fs.createReadStream(stream.path);
    var data = req.body;
    data.content = 'dummy';
    Binaries.create(req.body, function (err, binary) {
      if (err) {
        log.error('binaries:create', err);
        return res.pond(errors.serverError());
      }
      upload(binary.id, stream, function (err, id) {
        if (err) {
          log.error('binaries:upload', err);
          Binaries.remove({_id: binary.id}, function (err) {
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
          res.locate(binary.id).status(201).send(binary);
        });
      });
    });
  });

  router.put('/:id', validators.update, sanitizers.update, function (req, res) {
    var data = req.body;
    var stream = req.streams.content || [];
    stream = stream[0];
    update(req.found, data, stream, function (err, data) {
      if (err) {
        log.error('binaries:update-binary', err);
        return res.pond(errors.serverError());
      }
      Binaries.findOneAndUpdate({_id: req.found.id}, data, {new: true}, function (err, binary) {
        if (err) {
          log.error('binaries:update-content', err);
          return res.pond(errors.serverError());
        }
        res.locate(binary.id).status(200).send(binary);
      });
    });
  });

  router.get('/:id', validators.findOne, sanitizers.findOne, function (req, res) {
    mongutils.findOne(Binaries, req.query, function (err, binary) {
      if (err) {
        log.error('binaries:find-one', err);
        return res.pond(errors.serverError());
      }
      if (!binary) {
        return res.pond(errors.notFound());
      }
      res.send(binary);
    });
  });

  /**
   * /binaries?data={}
   */
  router.get('/', validators.find, sanitizers.find, function (req, res) {
    mongutils.find(Binaries, req.query.data, function (err, binaries, paging) {
      if (err) {
        log.error('binaries:find', err);
        return res.pond(errors.serverError());
      }
      res.many(binaries, paging);
    });
  });

  router.delete('/:id', function (req, res) {
    if (!mongutils.objectId(req.params.id)) {
      return res.pond(errors.notFound());
    }
    Binaries.remove({
      user: req.user.id,
      _id: req.params.id
    }, function (err, o) {
      if (err) {
        log.error('binaries:remove', err);
        return res.pond(errors.serverError());
      }
      if (!o.n) {
        return res.pond(errors.notFound());
      }
      res.status(204).end();
    });
  });
};

