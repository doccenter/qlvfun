$(document).ready(function () {

    var socket = io.connect('/');
    socket.on('server-send-result-login', function (data) {
        if (data.data === 'ok') {
            $('#login_full_box').hide();
            $('#main_full_box').show();
            $('.noacc').hide();
            $('.acc').show();
            $('#profile-username').html(data.user.username);
            $('#profile-diem').html(data.user.diem);
            $.ajax({url: '/user/login', data: {data: JSON.stringify(data.user)}})
        } else if (data.data === 'exist') {
            $('#log_notify').html('Tài khoản này đang online. Nếu cho rằng ai đang sử dụng tài khoản của bạn. Hãy cho chúng tôi biết');
        } else {
            $('#log_notify').html('Tài khoản hoặc mật khẩu không đúng.');
        }
    });
    $('#btnPlay').on('click', function () {
        enableAutoplay();

    });

    socket.on('server-send-error', function (data) {
        if (data.username === $('#profile-username').html()) {
            $('#ok').css('display','block');
            $('#error-server').html(data.content);
        }
    });

    $(document).on('keyup', function (e) {
        if (e.keyCode === 27) { // ctrl + x
            $('#btnLamMoi').click();
        }

    });

    $('#btnLamMoi').on('click', function () {
        $('#my-question').val('');
    });

    socket.on('server-send-result-register', function (data) {
        if (data.data === 'ok') {
            $('#login_full_box').hide();
            $('#main_full_box').show();
            $('.noacc').hide();
            $('.acc').show();
            $('#profile-username').html(data.user.username);
            $('#profile-diem').html(data.user.diem);
            $.ajax({url: '/user/register', data: {data: JSON.stringify(data.user)}})
        } else {
            $('#reg_notify').html('Tài khoản đã tồn tại.');
        }
    });

    var username = $('#log_username').val();
    var password = $('#log_password').val();
    if (username !== '' && password !== '') {
        socket.emit('user-send-login', {username: username, password: password});
    } else {
        $('.noacc').show();
        $('.acc').hide();
    }

    socket.on('server-send-report', function (data) {
        if (data === 'ok') {
            $('#btnBaoLoi').html('<i class="fa fa-info-circle" aria-hidden="true"></i> Đã gửi lỗi thành công');
            $('#btnBaoLoi').attr('disabled', 'disabled');
        } else {
            $('#btnBaoLoi').html('<i class="fa fa-info-circle" aria-hidden="true"></i> Có lỗi xảy ra !!!');
            $('#btnBaoLoi').attr('disabled', 'disabled');
        }
    });

    $('#btnBaoLoi').on('click', function () {
        socket.emit('user-send-report', $('#id').html());
    });

    socket.on('server-send-question', function (question) {
        $('#cauhoi').html(question.content);
        $('#id').html(question.id);
        $('#spelling').html(question.spelling);
        $('#typeword').html(question.typeword);
        $('#fileAudio').attr('src', question.audiofile);
        if (question.typequestion === 'av') {
            $('#type').html(' nghĩa là gì ?');
        } else {
            $('#type').html(' trong tiếng anh là gì ?');
        }
    });

    socket.on('server-send-answer-final', function (userQuestion) {
        $('#my-question').val('');
        $('#btnBaoLoi').removeAttr('disabled');
        $('#btnBaoLoi').html('<i class="fa fa-info-circle" aria-hidden="true"></i> Báo cáo 1 số sai lệch về từ này');
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
        for (var b = 0; b < listUser.length; b++) {
            if (b <= 10) {
                var data = listUser[b];
                if ($('#profile-username').html() === data.username) {
                    $('#profile-diem').html(data.diem);
                    $.ajax({url: '/user/update', data: {data: JSON.stringify(data)}});

                }
                if ($('#profile-username').html() === data.username) {
                    $('#user').append('<p>' + data.username + '<span style="float: right" class="badge">' + data.diem + '' + '</span></p>');

                } else {
                    $('#user').append('<p><b style="color: red">' + data.username + '<span style="float: right" class="badge">' + data.diem + '' + '</span></b> </p>');
                }
            }
        }
        if (listUser.length > 10) {
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

    $('#formLogin').on('keyup', function (e) {
        if (e.keyCode === 13) {
            $('#btnLogin').click();
        }
    });

    $('#formReg').on('keyup', function (e) {
        if (e.keyCode === 13) {
            $('#btnRegister').click();
        }
    });

    $('#btnLogin').on('click', function () {
        var username = $('#log_username').val();
        var password = $('#log_password').val();
        if (username === '' || password === '') {
            $('#log_notify').html('Tài khoản hoặc mật khẩu không được bỏ trống');
        } else {
            socket.emit('user-send-login', {username: username, password: password});
        }
    });

    $('#btnRegister').on('click', function () {
        var username = $('#reg_username').val();
        var password = $('#reg_password').val();
        var email = $('#reg_email').val();
        var linkfb = $('#reg_linkfb').val();
        if (username === '' || password === '' || email === '' || linkfb === '') {
            $('#reg_notify').html('Điền đầy đủ các thông tin');
        } else if (username.length > 12) {
            $('#reg_notify').html('Tài khoản không lớn hơn 10 kí tự');
        } else {
            socket.emit('user-send-register', {username: username, password: password, email: email, linkfb: linkfb});
        }
    });
});