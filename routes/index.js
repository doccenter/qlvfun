var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    var acc = req.session.acc;
    console.log(acc);
    res.render('index', {title: 'Express', acc: acc});
});

module.exports = router;
