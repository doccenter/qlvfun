$(document).ready(function () {
    var socket = io('/');
    socket.on('server-send-result-login', function (data) {
        if (data.data === 'ok') {
            $('#login_full_box').hide();
            $('#main_full_box').show();
            $('#profile-username').html(data.user.username);
            $('#profile-diem').html(data.user.diem);
            $.ajax({url: '/user/login', data: {data: JSON.stringify(data.user)}})
        }
    });
    var username = $('#log_username').val();
    var password = $('#log_password').val();
    if (username !== '' && password !== '') {
        socket.emit('user-send-login', {username: username, password: password});
    }


    socket.on('server-send-question', function (question) {
        $('#cauhoi').html(question.content);
        if (question.type === 'av') {
            $('#type').html(' nghĩa là gì ?');
        } else {
            $('#type').html(' trong tiếng anh là gì ?');
        }
    });

    socket.on('server-send-answer-final', function (userQuestion) {
        $('#my-question').val('');
        if (userQuestion.username === 'no') {
            $('#time').html('Không ai trả lời đúng câu hỏi này. Đáp án là: ' + userQuestion.answer);

        } else
            $('#time').html('Chúc mừng bạn ' + userQuestion.username + " đã trả lời đúng và nhanh nhất. Đáp án là: " + userQuestion.answer);
    });


    socket.on('server-send-time', function (time) {
        $('#time').html(time);
    });

    socket.on('server-send-answer', function (listQuestion) {
        $('#user-answer').empty();
        listQuestion.forEach(function (data) {
            $('#user-answer').prepend('<tr>' +
                '<td>' + data.username + '</td>' +
                '<td>' + data.answer + '</td>' +
                '</tr>');
        })
    });

    socket.on('server-send-list-user', function (listUser) {
        $('#user').empty();
        $('#numberOfOnline').html(listUser.length + ' người đang online');
        for (let b = 0; b < listUser.length; b++) {
            if (b <= 1) {
                let data = listUser[b];
                if ($('#profile-username').html() === data.username) {
                    $('#profile-diem').html(data.diem);
                    $.ajax({url: '/user/update', data: {data: JSON.stringify(data)}})
                }
                $('#user').append('<p>' + data.username + '<span style="float: right" class="badge">' + data.diem + '' + '</span></p>');
            }
        }
        if(listUser.length>1){
            $('#user').append('<a class="btn btn-success" href="/user/online">Xem tất cả</a>');
        }

    });

    $('#btnAnswerQuestion').on('click', function () {
        socket.emit('user-send-answer', {
            username: $('#profile-username').html(),
            answer: $('#my-question').val()
        });
    });

    $('#my-question').on('keyup', function (event) {
        if (event.keyCode === 13) {
            socket.emit('user-send-answer', {
                username: $('#profile-username').html(),
                answer: $('#my-question').val()
            });
        }
    });


    $('#btnLogin').on('click', function () {
        var username = $('#log_username').val();
        var password = $('#log_password').val();
        socket.emit('user-send-login', {username: username, password: password});
    });

    $('#btnRegister').on('click', function () {
        var username = $('#reg_username').val();
        var password = $('#reg_password').val();
        var email = $('#reg_email').val();
        var linkfb = $('#reg_linkfb').val();
        socket.emit('user-send-register', {username: username, password: password, email: email, linkfb: linkfb});
        socket.emit('login', username);
    });


    $('#btnRegister').on('click', function () {
        var username = $('#reg_username').val();
        var password = $('#reg_password').val();
        var email = $('#reg_email').val();
        var linkfb = $('#reg_linkfb').val();

        $.ajax({
            url: '/user/registry',
            data: {
                username: username,
                password: password,
                email: email,
                linkfb: linkfb
            },
            success: function (data) {
                var data1 = data.data;
                if (data1 === 'ok') {
                    window.location.reload();
                }
                if (data1 === 'fail') {
                    $('#reg_notify').html('Tài khoản đã tồn tại.');
                }
            },
            error: function (err) {
            }

        });
    });

});

// $('#emit').on('click', function () {
//     socket.emit('send-answer', $('#data').val());
// });
// socket.on('server-send-question', function (data) {
//     $('#ddd').html(data);
// });
// socket.on('server-send-question-2', function (data) {
//     $('#ddd2').html(data);
// });