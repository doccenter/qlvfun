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

var time = 25;
var mysql = require('mysql');
var pool = mysql.createConnection({
    host: '116.193.76.161',
    user: 'dbfreefev_qlvfun',
    password: 'MasterYi01',
    database: 'dbfreefev_qlvfun'
});
var currentQuestion = {};

setInterval(function () {

    if (time >= 21) {
        time--;
        pool.query('SELECT * FROM question ORDER BY RAND() LIMIT 1;', function (error, results, fields) {
            currentQuestion = results[0];
        });
    } else if (time === 20) {
        listAnswer = [];
        io.sockets.emit('server-send-answer', []);
        io.sockets.emit('server-send-question', currentQuestion);
        time--;
    } else if (time === 0) {
        var check = false;
        var ans;
        for (var a = 0; a < listAnswer.length; a++) {
            ans = listAnswer[a];
            if (ans.answer === currentQuestion.answer) {
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
            time = 25;


        } else {
            io.sockets.emit('server-send-question', currentQuestion);
            io.sockets.emit('server-send-answer-final', {
                username: 'no',
                answer: currentQuestion.answer
            });
            time = 25;
        }


    } else if (time <= 20) {
        io.sockets.emit('server-send-question', currentQuestion);
        io.sockets.emit('server-send-time', time);
        time--;
    }
}, 1000);

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

app.use('/user/registry', function (req, res) {
    let username = req.query.username;
    let password = req.query.password;
    let email = req.query.email;
    let linkfb = req.query.linkfb;
    let diem = 0;
    let status = 0;
    let ip = '';
    let sdt = '';
    let diachi = '';

    pool.query('insert into account values (?,?,?,?,?,?,?,?,?)', [username, password, email, linkfb, diem, status, ip, sdt, diachi], function (error, results, fields) {
        if (error) return res.json({'data': 'fail'});

        var acc = {
            username: username,
            password: password,
            email: email,
            linkfb: linkfb,
            diem: diem,
            status: status,
            ip: ip,
            sdt: sdt,
            diachi: diachi
        };
        listUser.push(acc);
        req.session.acc = acc;
        return res.status(200).json({data: 'ok'});
    });
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
    }, 1000);
});

app.use('/user/online', function (req, res) {
    res.render('online', {dsUser: listUser});
});

app.use('/bangxephang', function (req, res) {
    pool.query('select * from account order by diem asc ', function (error, results, fields) {
        if (error) return res.json({'data': 'fail'});
        var dsUsername = [];
        listUser.forEach(function (data) {
           dsUsername.push(data.username);
        });

        res.render('rank', {dsUser: results, dsOnline: dsUsername});
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

