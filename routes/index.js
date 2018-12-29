var express = require('express');
var router = express.Router();
var mysql = require('mysql');

/* GET home page. */
router.get('/', function (req, res, next) {
    var acc = req.session.acc;
    console.log(acc);
    res.render('index', {dangxem: 'trangchu', acc: acc});
});

router.get('/api', function (req, res, next) {
    var acc = req.session.acc;
    if(acc === undefined) return res.redirect('/');
    res.render('api', {acc: acc,dangxem: 'api'});
});



module.exports = router;
