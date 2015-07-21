var internal = {
	init: function() {
		console.info("Init internal code");

		function modalAlert(text) {
			TukTuk.Modal.hide();

			$("#modal_text").html(text + "<br/>");
			TukTuk.Modal.show("modal");
		}

		var sifter;
		var data_array = [];
		$.get('/message/users/', function(data) {
			localStorage.setItem('users', JSON.stringify(data));
			data_array = data;
			sifter = new Sifter(data);
		}, 'json').fail(function() {
			var ls = localStorage.getItem('users');

			if (ls) {
				data_array = JSON.parse(ls);
				sifter = new Sifter(data_array);
			} else {
				sifter = new Sifter([]);
			}
		});

		$("#message_receiver").on('keyup', function(e) {
			if ($(this).val().length == 0) {
				$("#message_results").html("");
				return;
			}

			var result = sifter.search($(this).val(), {
				fields: ['firstname', 'lastname'],
				sort: 'title',
				direction: 'desc',
				limit: 3
			});

			var items = result.items;
			var temp = "<ul>";
			_.each(items, function(data) {
				var dt = data_array[data.id];
				temp += '<li style="display: block;overflow: hidden; user-select: none; padding: 2px; vertical-align: middle;"><span style="vertical-align: middle;">' + dt.firstname + ' ' + dt.lastname + '</span><a href="#" data-id="' + dt._id + '" data-name="' + dt.firstname + ' ' + dt.lastname + '"  class="button tiny icon plus on-right message_add_user"></a></li>';
			});

			temp += "</ul>";

			$("#message_results").html(temp);

			return false;
		});

		$("#message_results").off('click').on('click', ".message_add_user", function(evt) {
			if ($("#message_users [data-id='" + $(this).attr('data-id') + "']").length == 0) {
				$("#message_users").append('<div class="on-left margin-right margin-bottom" style="cursor: pointer; user-select: none; -webkit-user-select: none;" data-id="' + $(this).attr('data-id') + '"><span class="icon small user"></span><span> ' + $(this).attr('data-name') + '</span></div>');
			}

			return false;
		});

		$("#message_users").off('dblclick').on('dblclick', "div", function(evt) {
			$(this).remove();

			return false;
		});

		$(".message_to_user").on('click', function(e) {
			$("#message_users").empty();
			//if( $("#message_users [data-id='" + $(this).attr('data-id') + "']").length == 0 ) {
			$("#message_users").append('<div class="on-left margin-right margin-bottom" style="cursor: pointer; user-select: none; -webkit-user-select: none;" data-id="' + $(this).attr('data-id') + '"><span class="icon small user"></span><span> ' + $(this).attr('data-name') + '</span></div>');
			//}
		});

		$("#send_message").on('click', function(e) {
			var name = $("#message_name").val();
			var text = $("#message_text").val();

			if (name == "") {
				$("#message_name").attr('required', 'required');
				return;
			} else {
				$("#message_name").removeAttr('required');
			}

			if (text == "") {
				$("#message_text").attr('required', 'required');
				return;
			} else {
				$("#message_text").removeAttr('required');
			}

			if ($("#message_users").children().length == 0) {
				$("#message_receiver").attr('required', 'required');
			}

			var users = [];
			$("#message_users").children().each(function() {
				users.push($(this).attr('data-id'));
			});

			$.post('/message/send', {
				name: name,
				text: text,
				receiver: users
			}, function(data) {
				TukTuk.Modal.hide();
				if (data.response) {
					location.reload(true);
				}
			}, 'json');

			return false;
		});

		$("#updateprofile").on('click', function(evt) {
			TukTuk.Modal.loading();

			var firstname = $("#firstname").val();
			var lastname = $("#lastname").val();
			var borndate = $("#borndate").val();
			var avatar = $("#avatar").val();

			if (firstname == "") {
				modalAlert("El nombre no puede quedar vacío.");
				return;
			}

			if (lastname == "") {
				modalAlert("El apellido no puede quedar vacío.");
				return;
			}

			$.post('/update_profile', {
				firstname: firstname,
				lastname: lastname,
				borndate: borndate,
				avatar: avatar
			}, function(data) {
				TukTuk.Modal.hide();
				location.reload(true);
			}, 'json');
			return false;
		});


		$("#change_picture").on('click', function(e) {
			Dropbox.choose({
				success: function(files) {
					$("#change_picture").attr('src', files[0].thumbnails['200x200']);
					$('[name="avatar"]').val(files[0].thumbnails['200x200']);
				},
				cancel: function() {},
				linkType: "preview",
				multiselect: false,
				extensions: ['.jpg', '.png'],
			});

			return false;
		});

		document.getElementById('borndate').valueAsDate = new Date("{{ user.born_date|date('m/d/Y') }}");
	}
};

var app = {
	messages: function() {
		$(".show-message").on('click', function(e) {
			$("#show_message_name").text($(this).attr('data-name'));
			$("#show_message_text").html($(this).attr('data-text').replace(/\n/g, '<br/>'));

			$("#show_message_read").attr('data-id', $(this).attr('data-id'));

			$("#show_message_read").attr('checked', $("#icon_" + $(this).attr('data-id')).hasClass('ok'));

			if( $(this).attr('data-type') == 'sent' ) {
				$("#show_message_reads").empty();
				$("#show_message_noreads").empty();

				$.post('/message/box/read', {
					id: $(this).attr('data-id')
				}, function(data) {
					for( var i in data.read ) {
						$("#show_message_reads").append('<div class="on-left margin-right margin-bottom" style="cursor: pointer; user-select: none; -webkit-user-select: none;"><span class="icon small user"></span><span> ' + data.read[i].firstname + ' ' + data.read[i].lastname + '</span></div>');
					}

					for( var i in data.no_read ) {
						$("#show_message_noreads").append('<div class="on-left margin-right margin-bottom" style="cursor: pointer; user-select: none; -webkit-user-select: none;"><span class="icon small user"></span><span> ' + data.no_read[i].firstname + ' ' + data.no_read[i].lastname + '</span></div>');
					}
				}, 'json');
			}

			return false;
		});

		$("#show_message_read").on('click', function(e) {
			var id = $("#show_message_read").attr('data-id');
			var ckval = $("#show_message_read").val();

			$.post('/message/mark', {
				id: id,
				read: ckval
			}, function(data) {
				if( data.response === true ) {
					if( ckval == 'on' ) {
						$("#icon_" + id).removeClass('asterisk');
						$("#icon_" + id).addClass('ok');
					} else {
						$("#icon_" + id).removeClass('ok');
						$("#icon_" + id).addClass('asterisk');
					}
				}
			}, 'json');

			return false;
		});
	},

	grade: function() {
		var files_count = 0;

		var remove = function(id) {
			$("#" + id).remove();
		};

		$("#social_attach").on('click', function(e) {
			Dropbox.choose({
				success: function(files) {
					for (var i in files) {
						$("#social_attachments").append('<div id="attach_' + files_count + '" ondblclick="remove(\'attach_' + files_count + '\');" style="width: 50%; float: left; margin-bottom: 10px; text-align: center;" data-icon="' + files[i].icon + '" data-link="' + files[i].link + '" data-name="' + files[i].name + '" class="radius light center"><img src="' + files[i].icon + '" /><p><small>' + files[i].name + '</small></p></div>');

						files_count++;
					}
				},
				cancel: function() {},
				linkType: "preview",
				multiselect: true
			});

			return false;
		});

		$("#sendsocialbtn").on('click', function(evt) {
			var name = $("#social_name").val();
			var text = $("#social_text").val();
			var grade = $("#social_grade").val();

			if (name == "") {
				$("#social_name").attr('required', 'required');
				return;
			} else {
				$("#social_name").removeAttr('required');
			}

			if (text == "") {
				$("#social_text").attr('required', 'required');
				return;
			}

			var attachments = [];
			$("#social_attachments").children().each(function() {
				attachments.push({
					icon: $(this).attr('data-icon'),
					link: $(this).attr('data-link'),
					name: $(this).attr('data-name')
				});
			});

			$.post('/add_social_stream', {
				name: name,
				text: text,
				grade: grade,
				attachments: attachments
			}, function(data) {
				TukTuk.Modal.hide();
				location.reload(true);
			}, 'json');
			return false;
		});
	},

	social: function() {
		$("#sendsocialbtn").on('click', function(evt) {
			TukTuk.Modal.loading();

			var name = $("#social_name").val();
			var text = $("#social_text").val();

			if (name == "") {
				modalAlert("El título no puede quedar vacío.");
				return;
			}

			if (text == "") {
				modalAlert("El texto no puede ser vacío.");
				return;
			}

			$.post('/add_social_stream', {
				name: name,
				text: text,
			}, function(data) {
				TukTuk.Modal.hide();
				location.reload(true);
			}, 'json');
			return false;
		});
	},

	login: function() {
		$("#loginbtn").on('click', function(evt) {
			$.post('/login', {
				username: $("#username").val(),
				password: $("#password").val()
			}, function(data) {
				if (data.response) {
					location.href = '/dashboard';
				} else {
					alert('Wrong username or password');
				}
			}, 'json');

			return false;
		});
	}
};