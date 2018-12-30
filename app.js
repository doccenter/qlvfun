var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var session = require('express-session');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
// Tell express to serve static files from the following directories
// app.use(express.static('public'));
app.use(session({secret: "Shh, its a secret!"}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
var listUser = [];
var listAnswer = [];
var question = {};

var time = 20;
var mysql = require('mysql');
var pool = mysql.createConnection({
    host: '116.193.76.161',
    user: 'dbfreefev_qlvfun',
    password: 'MasterYi01',
    database: 'dbfreefev_qlvfun'
});
var currentQuestion = {};

setInterval(function () {

    if (time >= 16) {
        time--;
        pool.query('SELECT * FROM question ORDER BY RAND() LIMIT 1;', function (error, results, fields) {
            currentQuestion = results[0];
        });
    } else if (time === 15) {
        listAnswer = [];
        io.sockets.emit('server-send-answer', []);
        io.sockets.emit('server-send-question', currentQuestion);
        time--;
    } else if (time === 0) {
        var check = false;
        var ans;
        var split = currentQuestion.answer.replace(";", ",").split(',');
        var ds = [];
        split.forEach(function (data) {
            ds.push(data.trim());
        });
        for (var a = 0; a < listAnswer.length; a++) {
            ans = listAnswer[a];
            if (ds.indexOf(ans.answer.trim())>-1) {
                check = true;
                break;
            }
        }
        if (check) {
            var us = {};
            for (let k = 0; k < listUser.length; k++) {
                if (listUser[k].username === ans.username) {
                    us = listUser[k];
                }
            }

            us.diem = us.diem + 1;
            pool.query('update account set diem=? where username=?', [us.diem, ans.username], function (e, r, f) {
                for (let k = 0; k < listUser.length; k++) {
                    if (listUser[k].username === ans.username) {
                        listUser[k].diem = us.diem;
                        io.sockets.emit('server-send-list-user', listUser.sort((a, b) => {
                            return b.diem - a.diem;
                        }));
                    }
                }
            });
            io.sockets.emit('server-send-question', currentQuestion);
            io.sockets.emit('server-send-answer-final', ans);
            time = 20;


        } else {
            io.sockets.emit('server-send-question', currentQuestion);
            io.sockets.emit('server-send-answer-final', {
                username: 'no',
                answer: currentQuestion.answer
            });
            time = 20;
        }


    } else if (time <= 15) {
        io.sockets.emit('server-send-question', currentQuestion);
        io.sockets.emit('server-send-time', time);
        time--;
    }
}, 1000);
app.use('/translate', function (req, res, n) {
    let api = req.query.api;
    let word = req.query.word;
    var sql = "SELECT * FROM account where api=?";
    pool.query(sql, [api], function (e, r, f) {
        if (r.length === 0) {
            return res.json({error: 1002});
        }
        var number = parseInt(r[0].diem);
        if (number > 0 && !isNaN(number)) {
            pool.query("select * from question where typequestion='av' and content=?", [word], function (ee, rr, ff) {
                if (rr.length === 0) {
                    return res.json({error: '5555'});
                }
                pool.query('update account set diem=? where api=?', [--number, api], function (eee, rrr, fff) {
                    var us = {};
                    for (let k = 0; k < listUser.length; k++) {
                        if (listUser[k].api === api) {
                            us = listUser[k];
                            listUser[k].diem -= 1;
                        }
                    }
                    io.sockets.emit('server-send-list-user', listUser.sort((a, b) => {
                        return b.diem - a.diem;
                    }));
                    return res.json(rr[0]);
                });
            });
        } else {
            return res.json({error: '0000'});
        }
    });
});

io.on('connection', function (socket) {
    io.sockets.emit('server-send-list-user', listUser);
    socket.on('request-list-user', function (data) {
        console.log('Có gửi');
        io.sockets.emit('server-send-list-user', listUser);
    });
    socket.on('user-send-login', function (data) {
        let username = data.username;
        let password = data.password;

        pool.query('SELECT * FROM account WHERE username=? and password=?', [username, password], function (error, results, fields) {
            if (error) return res.status(500).json({data: 'fail'});
            var length = results.length;
            if (length === 0) {
                socket.emit('server-send-result-login', {data: 'fail', user: undefined});
            }
            var acc = results[0];
            socket.username = username;
            listUser.push(acc);
            io.sockets.emit('server-send-list-user', listUser);
            socket.emit('server-send-result-login', {data: 'ok', user: acc});
        });
    });

    socket.on('user-send-register', function (data) {
        let username = data.username;
        let password = data.password;
        let email = data.email;
        let linkfb = data.linkfb;
        let diem = 0;
        let status = 0;
        let ip = '';
        let sdt = '';
        let diachi = '';
        let api = Date.now();
        pool.query('insert into account values (?,?,?,?,?,?,?,?,?,?)', [username, password, email, linkfb, diem, status, ip, sdt, diachi, api], function (error, results, fields) {
            if (error) {
                return socket.emit('server-send-result-register', {data: 'fail', user: undefined});
            }

            var acc = {
                username: username,
                password: password,
                email: email,
                linkfb: linkfb,
                diem: diem,
                status: status,
                ip: ip,
                sdt: sdt,
                diachi: diachi,
                api: api
            };

            socket.username = username;
            listUser.push(acc);
            io.sockets.emit('server-send-list-user', listUser);
            socket.emit('server-send-result-register', {data: 'ok', user: acc});
        });
    });

    socket.on('user-send-answer', function (data) {
        listAnswer.push(data);
        io.sockets.emit('server-send-answer', listAnswer);
    });

    socket.on('disconnect', function () {
        if (listUser.length > 0) {
            let username = socket.username;
            let v = -1;
            for (let i = 0; i < listUser.length; i++) {
                if (listUser[i].username === username) {
                    v = i;
                }
            }
            console.log(v);
            listUser[v] = undefined;
            copy();
            io.sockets.emit('server-send-list-user', listUser);
        }

    });
});

function removeUser(username) {

}

app.use('/user/update', function (req, res) {
    req.session.acc = JSON.parse(req.query.data);
    return res.json({data: 'ok'});
});

app.use('/user/login', function (req, res) {
    req.session.acc = JSON.parse(req.query.data);
    return res.json({data: 'ok'});
});

app.use('/user/register', function (req, res) {
    req.session.acc = JSON.parse(req.query.data);
    return res.json({data: 'ok'});
});


app.use('/user/logout', function (req, res) {
    var username = req.session.acc.username;
    var index = -1;
    for (var i = 0; i < listUser.length; i++) {
        if (listUser[i].username === username) {
            index = i;
        }
    }
    listUser[index] = undefined;
    copy();
    setTimeout(function () {
        req.session.acc = undefined;
        res.redirect('/');
    }, 200);
});

app.use('/user/online', function (req, res) {
    var acc = req.session.acc;
    if (acc === undefined) return res.redirect('/');
    res.render('online', {dsUser: listUser, acc: acc, dangxem: 'online'});
});

app.use('/bangxephang', function (req, res) {
    pool.query('select * from account order by diem asc ', function (error, results, fields) {
        if (error) return res.json({'data': 'fail'});
        var dsUsername = [];
        listUser.forEach(function (data) {
            dsUsername.push(data.username);
        });
        var acc = req.session.acc;
        if (acc === undefined) return res.redirect('/');
        res.render('rank', {dsUser: results, dsOnline: dsUsername, acc: acc, dangxem: 'rank'});
    });

});

function copy() {
    var ds = [];
    listUser.forEach(function (data) {
        if (data !== undefined) {
            ds.push(data)
        }
    });
    listUser = ds;
}

server.listen(process.env.PORT || '3000');


module.exports = app;

