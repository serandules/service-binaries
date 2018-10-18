var validators = require('validators');
var Binaries = require('model-binaries');

exports.create = function (req, res, next) {
    validators.create({
        content: 'multipart',
        model: Binaries
    }, req, res, next);
};

exports.update = function (req, res, next) {
    validators.update({
        id: req.params.id,
        content: 'multipart',
        model: Binaries
    }, req, res, next);
};

exports.find = function (req, res, next) {
    validators.query(req, res, function (err) {
        if (err) {
            return next(err);
        }
        validators.find({
            model: Binaries
        }, req, res, next);
    });
};

exports.findOne = function (req, res, next) {
    validators.findOne({
        id: req.params.id,
        model: Binaries
    }, req, res, next);
};