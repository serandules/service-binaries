var log = require('logger')('service-binaries:plugins:image');
var fs = require('fs');
var path = require('path');
var utils = require('utils');
var async = require('async');
var sharp = require('sharp');

var bucket = utils.bucket('serandives-images');

var overlay = fs.readFileSync(path.join(__dirname, '..', 'overlay.png'));

var upload = function (name, stream, done) {
  utils.s3().upload({
    Bucket: bucket,
    Key: name,
    Body: stream,
    ACL: 'public-read',
    ContentType: 'image/jpeg'
  }, function (err) {
    if (err) {
      log.error('s3:upload-errored', err);
      return done(err);
    }
    done(null, name);
  });
};

var save800x450 = function (id, path, done) {
  done = utils.once(done);
  var name = 'images/800x450/' + id;
  var transformer = sharp()
    .resize({
      width: 800,
      height: 450
    })
    .composite([{input: overlay, top: 201, left: 214, blend: 'screen'}])
    .jpeg()
    .on('error', function (err) {
      log.error('images:crop', 'id:%s', id, err);
      done(err);
    });
  upload(name, fs.createReadStream(path).pipe(transformer), done);
};

var save288x162 = function (id, path, done) {
  done = utils.once(done);
  var name = 'images/288x162/' + id;
  var transformer = sharp()
    .resize({
      width: 288,
      height: 162
    })
    .jpeg()
    .on('error', function (err) {
      log.error('images:crop', 'id:%s', id, err);
      done(err);
    });
  upload(name, fs.createReadStream(path).pipe(transformer), done);
};

var save160x160 = function (id, path, done) {
  done = utils.once(done);
  var name = 'images/160x160/' + id;
  var transformer = sharp()
    .resize({
      width: 160,
      height: 160
    })
    .jpeg()
    .on('error', function (err) {
      log.error('images:crop', 'id:%s', id, err);
      done(err);
    });
  upload(name, fs.createReadStream(path).pipe(transformer), done);
};

module.exports = function (id, path, done) {
  var tasks = [save288x162, save160x160, save800x450];
  async.each(tasks, function (task, taskDone) {
    task(id, path, taskDone);
  }, done);
};
