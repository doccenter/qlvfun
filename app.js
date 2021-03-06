const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const indexRouter = require('./routes/index');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io').listen(server);


const session = require('express-session');
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
var listChat = [];

var time = 15;
const mysql = require('mysql');
const pool = mysql.createConnection({
    host: '116.193.76.161',
    user: 'dbfreefev_qlvfun',
    password: 'MasterYi01',
    database: 'dbfreefev_qlvfun'
});
var currentQuestion = {};
app.use('/.well-known/acme-challenge/401H6TBFO33Vy00C-Y_NMbnFRCl_wkDGe2yqKuPevus', function (req, res) {
    res.send('401H6TBFO33Vy00C-Y_NMbnFRCl_wkDGe2yqKuPevus.ZxPG_F-AVKAeDpOj6E80APAL5PFx_150t7-21AzpjKE');
});

app.use('/.well-known/acme-challenge/ybO-YRulhaN32F1GymLlvB6xcVE05b_jTk4W29FrN3g', function (req, res) {
    res.send('ybO-YRulhaN32F1GymLlvB6xcVE05b_jTk4W29FrN3g.ZxPG_F-AVKAeDpOj6E80APAL5PFx_150t7-21AzpjKE');
});

const a = setInterval(function () {

    if (time >= 11) {
        time--;
        pool.query('SELECT * FROM question ORDER BY RAND() LIMIT 1;', function (error, results, fields) {
            currentQuestion = results[0];
        });
    } else if (time === 10) {
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
            if (ds.indexOf(ans.answer.trim()) > -1) {
                check = true;
                break;
            }
        }
        if (check) {
            var us = {};
            for (var k = 0; k < listUser.length; k++) {
                if (listUser[k].username === ans.username) {
                    us = listUser[k];
                }
            }

            us.diem = us.diem + 1;
            pool.query('update account set diem=? where username=?', [us.diem, ans.username], function (e, r, f) {
                for (var k = 0; k < listUser.length; k++) {
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
            time = 15;
        } else {
            io.sockets.emit('server-send-question', currentQuestion);
            io.sockets.emit('server-send-answer-final', {
                username: 'no',
                answer: currentQuestion.answer
            });
            time = 15;
        }


    } else if (time <= 15) {
        io.sockets.emit('server-send-question', currentQuestion);
        io.sockets.emit('server-send-time', time);
        time--;
    }
}, 1000);
app.use('/translate', function (req, res, n) {
    var api = req.query.api;
    var word = req.query.word;
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
                    for (var k = 0; k < listUser.length; k++) {
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
    io.sockets.emit('server-send-chat-all', listChat);
    socket.on('request-list-user', function (data) {
        console.log('Có gửi');
        io.sockets.emit('server-send-list-user', listUser);
    });

    socket.on('user-send-chat-all', function (data) {
        if (listChat.length === 30) {
            listChat.shift();
        }
        listChat.push(data);
        io.sockets.emit('server-send-chat-all', listChat);
    });

    socket.on('user-send-report', function (data) {
        var id = Date.now();
        pool.query('insert into report values (?,?)', [id, data], function (error, results, fields) {
            if (error) return socket.emit('server-send-result-login', 'fail');
            socket.emit('server-send-report', 'ok');
        });
    });

    socket.on('user-send-login', function (data) {
        var username = data.username;
        var password = data.password;
        var isExist = false;
        console.log(username);
        console.log(listUser);
        for (let a = 0; a < listUser.length; a++) {
            if (listUser[a].username === username)
                isExist = true;
        }


        if (isExist) {
            io.sockets.emit('server-send-error', {
                data: 'error',
                'content': 'Có người đăng nhập vào tài khoản của bạn. Vui lòng đăng xuất nếu không phải bạn',
                'username': username
            });
            socket.emit('server-send-result-login', {data: 'exist'});
        } else {
            pool.query('SELECT * FROM account WHERE username=? and password=?', [username, password], function (error, results, fields) {
                if (error) return res.status(500).json({data: 'fail'});
                var length = results.length;
                if (length === 0) {
                    return socket.emit('server-send-result-login', {data: 'fail', user: undefined});
                }
                var acc = results[0];
                socket.username = username;
                listUser.push(acc);
                io.sockets.emit('server-send-list-user', listUser);
                socket.emit('server-send-result-login', {data: 'ok', user: acc});
            });
        }
    });

    socket.on('user-send-register', function (data) {
        var username = data.username;
        var password = data.password;
        var email = data.email;
        var linkfb = data.linkfb;
        var diem = 0;
        var status = 0;
        var ip = '';
        var sdt = '';
        var diachi = '';
        var api = Date.now();
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
            var username = socket.username;
            var v = -1;
            for (var i = 0; i < listUser.length; i++) {
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

app.use('/user/getInfo', function (req, res) {
    var username = req.query.username;
    pool.query('select * from account where username=?', [username], function (e, r, f) {
        if (e) return res.json({data: 'ok'});
        return res.json({data: r[0]});
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
    }, 200);
});

app.use('/user/online', function (req, res) {
    var acc = req.session.acc;
    if (acc === undefined) return res.redirect('/');
    res.render('online', {dsUser: listUser, acc: acc, dangxem: 'online'});
});

app.use('/bangxephang', function (req, res) {
    pool.query('select * from account order by diem asc limit 1000 ', function (error, results, fields) {
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

module.exports.pool = pool;

module.exports = app;

