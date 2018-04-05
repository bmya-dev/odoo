odoo.define('mail.discuss_test', function (require) {
"use strict";

var ChatManager = require('mail.ChatManager');
var Composers = require('mail.composer');
var mailTestUtils = require('mail.testUtils');

var Bus = require('web.Bus');
var concurrency = require('web.concurrency');
var testUtils = require('web.test_utils');

var BasicComposer = Composers.BasicComposer;
var createBusService = mailTestUtils.createBusService;
var createDiscuss = mailTestUtils.createDiscuss;
var patchWindowGetSelection = testUtils.patchWindowGetSelection;

QUnit.module('mail', {}, function () {

QUnit.module('Discuss client action', {
    beforeEach: function () {
        this.data = {
            'mail.message': {
                fields: {},
            },
        };
        this.services = [ChatManager, createBusService()];
    },
});

QUnit.test('basic rendering', function (assert) {
    assert.expect(5);
    var done = assert.async();

    createDiscuss({
        id: 1,
        context: {},
        params: {},
        data: this.data,
        services: this.services,
    })
    .then(function (discuss) {
        // test basic rendering
        var $sidebar = discuss.$('.o_mail_chat_sidebar');
        assert.strictEqual($sidebar.length, 1,
            "should have rendered a sidebar");

        assert.strictEqual(discuss.$('.o_mail_chat_content').length, 1,
            "should have rendered the content");
        assert.strictEqual(discuss.$('.o_mail_no_content').length, 1,
            "should display no content message");

        var $inbox = $sidebar.find('.o_mail_chat_channel_item[data-channel-id=channel_inbox]');
        assert.strictEqual($inbox.length, 1,
            "should have the channel item 'channel_inbox' in the sidebar");

        var $starred = $sidebar.find('.o_mail_chat_channel_item[data-channel-id=channel_starred]');
        assert.strictEqual($starred.length, 1,
            "should have the channel item 'channel_starred' in the sidebar");
        discuss.destroy();
        done();
    });
});

QUnit.test('@ mention in channel', function (assert) {
    assert.expect(34);
    var done = assert.async();

    // Remove throttles to speed up the test
    var channelThrottle = ChatManager.prototype.CHANNEL_SEEN_THROTTLE;
    var mentionThrottle = BasicComposer.prototype.MENTION_THROTTLE;
    ChatManager.prototype.CHANNEL_SEEN_THROTTLE = 1;
    BasicComposer.prototype.MENTION_THROTTLE = 1;

    var bus = new Bus();
    var BusService = createBusService(bus);
    var fetchListenersDef = $.Deferred();
    var receiveMessageDef = $.Deferred();

    this.data.initMessaging = {
        channel_slots: {
            channel_channel: [{
                id: 1,
                channel_type: "channel",
                name: "general",
            }],
        },
    };

    createDiscuss({
        id: 1,
        context: {},
        params: {},
        data: this.data,
        services: [ChatManager, BusService],
        mockRPC: function (route, args) {
            if (args.method === 'channel_fetch_listeners') {
                fetchListenersDef.resolve();
                return $.when([
                    {id: 1, name: 'Admin'},
                    {id: 2, name: 'TestUser'},
                    {id: 3, name: 'DemoUser'}
                ]);
            }
            if (args.method === 'message_post') {
                var data = {
                    author_id: ["42", "Me"],
                    body: args.kwargs.body,
                    channel_ids: [1],
                };
                var notification = [[false, 'mail.channel'], data];
                bus.trigger('notification', [notification]);
                receiveMessageDef.resolve();
                return $.when(42);
            }
            return this._super.apply(this, arguments);
        },
    })
    .then(function (discuss) {
        var $general = discuss.$('.o_mail_chat_sidebar')
                        .find('.o_mail_chat_channel_item[data-channel-id=1]');
        assert.strictEqual($general.length, 1,
            "should have the channel item with id 1");
        assert.strictEqual($general.attr('title'), 'general',
            "should have the title 'general'");

        // click on general
        $general.click();
        var $input = discuss.$('.o_composer_input').first();
        assert.ok($input.length, "should display a composer input");

        // Simulate '@' typed by user with mocked Window.getSelection
        // Note: focus is needed in order to trigger rpc 'channel_fetch_listeners'
        $input.focus();
        $input.text("@");
        var unpatchWindowGetSelection = patchWindowGetSelection();
        $input.trigger('keyup');

        fetchListenersDef
            .then(concurrency.delay.bind(concurrency, 0))
            .then(function () {
                assert.strictEqual(discuss.$('.dropup.o_composer_mention_dropdown.open').length, 1,
                "dropup menu for partner mentions should be open");

                var $mentionPropositions = discuss.$('.o_mention_proposition');
                assert.strictEqual($mentionPropositions.length, 3,
                    "should display 3 partner mention propositions");

                var $mention1 = $mentionPropositions.first();
                var $mention2 = $mentionPropositions.first().next();
                var $mention3 = $mentionPropositions.first().next().next();

                // correct 1st mention proposition
                assert.ok($mention1.hasClass('active'),
                    "first partner mention should be active");
                assert.strictEqual($mention1.data('id'), 1,
                    "first partner mention should link to the correct partner id");
                assert.strictEqual($mention1.find('.o_mention_name').text(), "Admin",
                    "first partner mention should display the correct partner name");
                // correct 2nd mention proposition
                assert.notOk($mention2.hasClass('active'),
                    "second partner mention should not be active");
                assert.strictEqual($mention2.data('id'), 2,
                    "second partner mention should link to the correct partner id");
                assert.strictEqual($mention2.find('.o_mention_name').text(), "TestUser",
                    "second partner mention should display the correct partner name");
                // correct 3rd mention proposition
                assert.notOk($mention3.hasClass('active'),
                    "third partner mention should not be active");
                assert.strictEqual($mention3.data('id'), 3,
                    "third partner mention should link to the correct partner id");
                assert.strictEqual($mention3.find('.o_mention_name').text(), "DemoUser",
                    "third partner mention should display the correct partner name");

                // check DOWN event
                $input.trigger($.Event('keyup', {which: $.ui.keyCode.DOWN}));
                assert.notOk($mention1.hasClass('active'),
                    "first partner mention should not be active");
                assert.ok($mention2.hasClass('active'),
                    "second partner mention should be active");
                assert.notOk($mention3.hasClass('active'),
                    "third partner mention should not be active");

                // check UP event
                $input.trigger($.Event('keyup', {which: $.ui.keyCode.UP}));
                assert.ok($mention1.hasClass('active'),
                    "first partner mention should be active");
                assert.notOk($mention2.hasClass('active'),
                    "second partner mention should not be active");
                assert.notOk($mention3.hasClass('active'),
                    "third partner mention should not be active");

                // check TAB event (full cycle, hence 3 TABs)
                $input.trigger($.Event('keyup', {which: $.ui.keyCode.TAB}));
                assert.notOk($mention1.hasClass('active'),
                    "first partner mention should not be active");
                assert.ok($mention2.hasClass('active'),
                    "second partner mention should be active");
                assert.notOk($mention3.hasClass('active'),
                    "third partner mention should not be active");

                $input.trigger($.Event('keyup', {which: $.ui.keyCode.TAB}));
                assert.notOk($mention1.hasClass('active'),
                    "first partner mention should not be active");
                assert.notOk($mention2.hasClass('active'),
                    "second partner mention should not be active");
                assert.ok($mention3.hasClass('active'),
                    "third partner mention should be active");

                $input.trigger($.Event('keyup', {which: $.ui.keyCode.TAB}));
                assert.ok($mention1.hasClass('active'),
                    "first partner mention should be active");
                assert.notOk($mention2.hasClass('active'),
                    "second partner mention should not be active");
                assert.notOk($mention3.hasClass('active'),
                    "third partner mention should not be active");

                // equivalent to $mentionPropositions.find('active').click();
                $input.trigger($.Event('keyup', {which: $.ui.keyCode.ENTER}));
                assert.strictEqual(discuss.$('.o_mention_proposition').length, 0,
                    "should not have any partner mention proposition after ENTER");
                assert.strictEqual($input.find('a').text() , "@Admin",
                    "should have the correct mention link in the composer input");

                // send message
                $input.trigger($.Event('keydown', {which: $.ui.keyCode.ENTER}));

                receiveMessageDef
                    .then(concurrency.delay.bind(concurrency, 0))
                    .then(function () {
                        assert.strictEqual(discuss.$('.o_thread_message_content').length, 1,
                            "should display one message with some content");
                        assert.strictEqual(discuss.$('.o_thread_message_content a').length, 1,
                            "should contain a link in the message content");
                        assert.strictEqual(discuss.$('.o_thread_message_content a').text(),
                            "@Admin", "should have correct mention link in the message content");

                        // Restore throttles and window.getSelection
                        BasicComposer.prototype.MENTION_THROTTLE = mentionThrottle;
                        ChatManager.prototype.CHANNEL_SEEN_THROTTLE = channelThrottle;
                        unpatchWindowGetSelection();
                        discuss.destroy();
                        done();
                });
        });
    });
});

QUnit.test('no crash focusout emoji button', function (assert) {
    assert.expect(3);
    var done = assert.async();

    // Remove channel throttle to speed up the test
    var channelThrottle = ChatManager.prototype.CHANNEL_SEEN_THROTTLE;
    ChatManager.prototype.CHANNEL_SEEN_THROTTLE = 1;

    this.data.initMessaging = {
        channel_slots: {
            channel_channel: [{
                id: 1,
                channel_type: "channel",
                name: "general",
            }],
        },
    };

    createDiscuss({
        id: 1,
        context: {},
        params: {},
        data: this.data,
        services: this.services,
    })
    .then(function (discuss) {
        var $general = discuss.$('.o_mail_chat_sidebar')
            .find('.o_mail_chat_channel_item[data-channel-id=1]');
        assert.strictEqual($general.length, 1,
            "should have the channel item with id 1");
        assert.strictEqual($general.attr('title'), 'general',
            "should have the title 'general'");

        // click on general
        $general.click();
        discuss.$('.o_composer_button_emoji').focus();
        try {
            discuss.$('.o_composer_button_emoji').focusout();
            assert.ok(true, "should not crash on focusout of emoji button");
        } finally {
            // Restore throttle
            ChatManager.prototype.CHANNEL_SEEN_THROTTLE = channelThrottle;
            discuss.destroy();
            done();
        }
    });
});

QUnit.test('input not cleared on unresolved message_post rpc', function (assert) {
    assert.expect(2);
    var done = assert.async();

    // Deferred to simulate late server response on message post
    var messagePostDef = $.Deferred();

    this.data.initMessaging = {
        channel_slots: {
            channel_channel: [{
                id: 1,
                channel_type: "channel",
                name: "general",
            }],
        },
    };

    createDiscuss({
        id: 1,
        context: {},
        params: {},
        data: this.data,
        services: this.services,
        mockRPC: function (route, args) {
            if (args.method === 'message_post') {
                // unresolved deferred to simulates message not posted
                return messagePostDef;
            }
            return this._super.apply(this, arguments);
        },
    })
    .then(function (discuss) {
        // Click on channel 'general'
        var $general = discuss.$('.o_mail_chat_sidebar')
            .find('.o_mail_chat_channel_item[data-channel-id=1]');
        $general.click();

        // Type message
        var $input = discuss.$('.o_composer_input').first();
        $input.text('test message');

        // Send message
        $input.trigger($.Event('keydown', { which: $.ui.keyCode.ENTER }));
        assert.strictEqual($input.text(), 'test message',
            "composer should not be cleared on send without server response");

        // Simulate server response
        messagePostDef.resolve();
        assert.strictEqual($input.text(), '',
            "composer should be cleared on send after server response");
            discuss.destroy();
            done();
    });
});

QUnit.test('older messages are loaded on scroll', function (assert) {
    assert.expect(4);
    var done = assert.async();

    // remove throttling
    testUtils.patch(BasicComposer, {MENTION_THROTTLE: 0});
    testUtils.patch(ChatManager, {CHANNEL_SEEN_THROTTLE: 0});

    this.data.initMessaging = {
        channel_slots: {
            channel_channel: [{
                id: 1,
                channel_type: "channel",
                name: "general",
                static: true,
            }],
        },
    };

    var limit;
    var loadDef = $.Deferred();
    var loadedMessages;
    var msgData = [];
    for (var i = 0; i < 35; i++) {
        msgData.push({
            author_id: ['1', 'Me'],
            body: '<p>test ' + i + '</p>',
            channel_ids: [1],
            id: i,
        });
    }
    msgData.reverse();

    createDiscuss({
        context: {},
        data: this.data,
        params: {},
        services: [ChatManager, createBusService()],
        mockRPC: function (route, args) {
            if (args.method === 'message_fetch') {
                limit = args.kwargs.limit;
                loadedMessages += limit;
                var message = msgData.slice(0, loadedMessages);
                if (loadedMessages >= msgData.length) {
                    loadDef.resolve();
                }
                return $.when(message);
            }
            return this._super.apply(this, arguments);
        },
    }).then(function (discuss) {
        var $general = discuss.$('.o_mail_chat_channel_item[data-channel-id=1]');
        assert.strictEqual($general.length, 1,
            "should have a channel item with id 1");

        // switch to 'general'
        loadedMessages = 0;
        $general.click();

        assert.ok(limit < 35, "there should be more messages than the limit");
        assert.strictEqual(discuss.$('.o_thread_message').length, limit,
            "should display the 'limit' first messages");

        // simulate a scroll to top to load more messages
        discuss.$('.o_mail_thread').scrollTop(0);

        loadDef
            .then(concurrency.delay.bind(concurrency, 0))
            .then(function () {
                assert.strictEqual(discuss.$('.o_thread_message').length, 35,
                    "all messages should now be loaded");

                // restore throttling
                testUtils.unpatch(BasicComposer);
                testUtils.unpatch(ChatManager);

                discuss.destroy();
                done();
            });
    });
});

QUnit.test('"Unstar all" button should reset the starred counter', function (assert) {
    assert.expect(2);
    var done = assert.async();

    var bus = new Bus();
    var BusService = createBusService(bus);
    var msgData = [];
    _.each(_.range(1, 41), function (num) {
        msgData.push({
                id: num,
                body: "<p>test" + num + "</p>",
                author_id: ["1", "Me"],
                channel_ids: [1],
                starred: true,
                starred_partner_ids: [1],
            }
        );
    });

    this.data = {
        initMessaging: {
            channel_slots: {
                channel_channel: [{
                    id: 1,
                    channel_type: "channel",
                    name: "general",
                }],
            },
            starred_counter: msgData.length,
        },
        'mail.message': {
            fields: {
                body: {
                    string: "Contents",
                    type: 'html',
                },
                author_id: {
                    string: "Author",
                    relation: 'res.partner',
                },
                channel_ids: {
                    string: "Channels",
                    type: 'many2many',
                    relation: 'mail.channel',
                },
                starred: {
                    string: "Starred",
                    type: 'boolean',
                },
                needaction: {
                string: "Need Action",
                type: 'boolean',
            },
            starred_partner_ids: {
                string: "partner ids",
                type: 'integer',
            }
            },
            records: msgData,
        },
    };

    createDiscuss({
        id: 1,
        context: {},
        params: {},
        data: this.data,
        services: [ChatManager, BusService],
        mockRPC: function (route, args) {
            if (args.method === 'unstar_all') {
                var data = {
                    message_ids: _.range(1, 41),
                    starred: false,
                    type: 'toggle_star',
                };
                var notification = [[false, 'res.partner'], data];
                bus.trigger('notification', [notification]);
                return $.when(42);
            }
            return this._super.apply(this, arguments);
        },
        session: {partner_id: 1},
    })
    .then(function (discuss) {
        var $starred = discuss.$('.o_mail_chat_sidebar').find('.o_mail_chat_title_starred');
        var $starredCounter = $('.o_mail_chat_title_starred > .o_mail_sidebar_needaction');

        // Go to Starred channel
        $starred.click();
        // Test Initial Value
        assert.strictEqual($starredCounter.text().trim(), "40", "40 messages should be starred");

        // Unstar all and wait 'update_starred'
        $('.o_control_panel .o_mail_chat_button_unstar_all').click();
        $starredCounter = $('.o_mail_chat_title_starred > .o_mail_sidebar_needaction');
        assert.strictEqual($starredCounter.text().trim(), "0",
            "All messages should be unstarred");

        discuss.destroy();
        done();
    });
});

});
});