var express = require('express');
var router = express.Router();
var app = require('../app');

/* GET home page. */
router.get('/', function (req, res, next) {
    var acc = req.session.acc;
    res.render('index', {dangxem: 'trangchu', acc: acc});
});

router.get('/api', function (req, res, next) {
    var acc = req.session.acc;
    if (acc === undefined) return res.redirect('/');
    res.render('api', {acc: acc, dangxem: 'api'});
});

router.get('/tailieu', function (req, res, next) {
    var acc = req.session.acc;
    if (acc === undefined) return res.redirect('/');
    app.pool.query('select * from tailieu', function (e, r, d) {
        if (e) return res.render('500');
        return res.render('tailieu', {acc: acc, dangxem: 'tailieu', dsTaiLieu: r});
    });
});

router.get('/download', function (req, res, next) {
    var id = req.query.id;
    var diem = req.query.diem;
    var acc = req.session.acc;
    if (acc === undefined) return res.json({data: 'fail'});
    app.pool.query('select * from account where username=?', [acc.username], function (e, r, d) {
        if (e) return res.json({data: 'fail'});
        var account = r[0];
        var diemOld = account.diem;
        if (diemOld < diem) {
            return res.json({data: 'not-enough'});
        }
        app.pool.query('update account set diem=? where username=?', [diemOld - diem, acc.username], function (ee, rr, dd) {
            app.pool.query('select * from tailieu where id=?', [id], function (eee, rrr, ddd) {
                return res.json({data: rrr[0].link});
            });
        });
    });
});


module.exports = router;
