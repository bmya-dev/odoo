odoo.define('mail.wip.old_widget.Discuss', function (require) {
"use strict";

const InvitePartnerDialog = require('mail.wip.old_widget.DiscussInvitePartnerDialog');
const StoreMixin = require('mail.wip.old_widget.StoreMixin');
const Root = require('mail.wip.widget.DiscussRoot');

const AbstractAction = require('web.AbstractAction');
const config = require('web.config');
const core = require('web.core');
const session = require('web.session');

const _t = core._t;
const qweb = core.qweb;


const Discuss = AbstractAction.extend(StoreMixin, {
    DEBUG: true,
    template: 'mail.wip.Discuss',
    hasControlPanel: true,
    loadControlPanel: true,
    withSearchBar: true,
    searchMenuTypes: ['filter', 'favorite'],
    custom_events: {
        search: '_onSearch',
    },
    /**
     * @override {web.AbstractAction}
     * @param {web.ActionManager} parent
     * @param {Object} action
     * @param {Object} [action.context]
     * @param {string} [action.context.active_id]
     * @param {Object} [action.params]
     * @param {string} [action.params.default_active_id]
     * @param {Object} [options={}]
     */
    init(parent, action, options={}) {
        this._super.apply(this, arguments);

        // render buttons in control panel
        this.$buttons = $(qweb.render('mail.wip.discuss.ControlButtons'));
        this.$buttons.find('button').css({ display:'inline-block' });
        this.$buttons.on('click', '.o_invite', ev => this._onClickInvite(ev));
        this.$buttons.on('click', '.o_mark_all_read', ev => this._onClickMarkAllAsRead(ev));
        this.$buttons.on('click', '.o_unstar_all', ev => this._onClickUnstarAll(ev));

        // control panel attributes
        this.action = action;
        this.actionManager = parent;
        this.controlPanelParams.modelName = 'mail.message';
        this.options = options;

        // owl components
        this.root = undefined;

        this._$initThread = this.options.active_id ||
            (this.action.context && this.action.context.active_id) ||
            (this.action.params && this.action.params.default_active_id) ||
            'mail.box_inbox';

        if (this.DEBUG) {
            window.discuss = this;
        }
    },
    /**
     * @override {web.AbstractAction}
     * @return {Promise}
     */
    willStart() {
        return Promise.all([
            this._super.apply(this, arguments),
            this.awaitStore()
        ]);
    },
    /**
     * @override {web.AbstractAction}
     */
    destroy() {
        if (this.root) {
            this.root.destroy();
        }
        if (this.$buttons) {
            this.$buttons.off().remove();
        }
        this._super.apply(this, arguments);
    },
    /**
     * @override {web.AbstractAction}
     */
    on_attach_callback() {
        this._super.apply(this, arguments);
        if (this.root) {
            // prevent twice call to on_attach_callback (FIXME)
            return;
        }
        if (!this.store) {
            throw new Error('[discuss] not yet store awaited...');
        }
        this.store.commit('discuss/update', {
            $thread: this._$initThread,
            domain: [],
            open: true,
        });
        const env = {
            _t,
            discuss: {
                dispatch: (...args) => this._onDispatch(...args),
            },
            qweb: core.qwebOwl,
            session,
            store: this.store,
            call: (...args) => this.call(...args),
            do_action: (...args) => this.do_action(...args),
            rpc: (...args) => this._rpc(...args),
        };
        this.root = new Root(env);
        this.root.mount(this.$el[0]);
    },
    /**
     * @override {web.AbstractAction}
     */
    on_detach_callback() {
        this._super.apply(this, arguments);
        if (this.root) {
            this.root.destroy();
        }
        this.root = undefined;
        this.store.commit('discuss/update', { open: false });
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _pushStateActionManager() {
        this.actionManager.do_push_state({
            action: this.action.id,
            active_id: this.root.$thread,
        });
    },
    /**
     * @private
     */
    _updateControlPanel() {
        const $thread = this.root.$thread;
        const hasMessages = this.root.hasThreadMessages;
        const isMobile = this.root.isMobile;
        const thread = this.root.thread;
        // Invite
        if ($thread && thread.channel_type === 'channel') {
            this.$buttons
                .find('.o_invite')
                .removeClass('o_hidden');
        } else {
            this.$buttons
                .find('.o_invite')
                .addClass('o_hidden');
        }
        // Mark All Read
        if ($thread === 'mail.box_inbox') {
            this.$buttons
                .find('.o_mark_all_read')
                .removeClass('o_hidden')
                .prop('disabled', !hasMessages);
        } else {
            this.$buttons
                .find('.o_mark_all_read')
                .addClass('o_hidden');
        }
        // Unstar All
        if ($thread === 'mail.box_starred') {
            this.$buttons
                .find('.o_unstar_all')
                .removeClass('o_hidden')
                .prop('disabled', !hasMessages);
        } else {
            this.$buttons
                .find('.o_unstar_all')
                .addClass('o_hidden');
        }
        // Add channel
        if (isMobile && this.root.mobileNavbarTab === 'channel') {
            this.$buttons
                .find('.o_new_channel')
                .removeClass('o_hidden');
        } else {
            this.$buttons
                .find('.o_new_channel')
                .addClass('o_hidden');
        }
        // Add message
        if (isMobile && this.root.mobileNavbarTab === 'chat') {
            this.$buttons
                .find('.o_new_message')
                .removeClass('o_hidden');
        } else {
            this.$buttons
                .find('.o_new_message')
                .addClass('o_hidden');
        }
        if (isMobile) {
            this._setTitle(_t("Discuss"));
        } else {
            let title;
            if ($thread) {
                const threadName = this.store.getters['thread/name']($thread);
                const prefix = thread.channel_type === 'channel' && thread.public !== 'private' ? '#' : '';
                title = `${prefix}${threadName}`;
            } else {
                title = _t("Discuss");
            }
            this._setTitle(title);
        }
        this.updateControlPanel({
            cp_content: {
                $buttons: this.$buttons,
            },
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickInvite() {
        new InvitePartnerDialog(this, {
            $thread: this.root.$thread,
            store: this.store,
        }).open();
    },
    /**
     * @private
     */
    _onClickMarkAllAsRead() {
        this.store.dispatch('message/mark_all_as_read', { domain: this.domain });
    },
    /**
     * @private
     */
    _onClickUnstarAll() {
        this.store.dispatch('message/unstar_all');
    },
    /**
     * @private
     * @param {string} type
     */
    _onDispatch(type) {
        switch (type) {
            case 'ready':
                this._pushStateActionManager();
                this._updateControlPanel();
                break;
            case 'thread_selected':
                this._pushStateActionManager();
                break;
            case 'update_cp':
                this._updateControlPanel();
                break;
        }
    },
    /**
     * @private
     * @param {OdooEvent} ev
     * @param {Array} ev.data.domain
     */
    _onSearch(ev) {
        ev.stopPropagation();
        this.root.updateDomain(ev.data.domain);
    },
});

core.action_registry.add('mail.wip.discuss', Discuss);

return Discuss;

});
