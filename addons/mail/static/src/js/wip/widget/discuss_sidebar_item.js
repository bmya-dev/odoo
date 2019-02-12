odoo.define('mail.wip.widget.DiscussSidebarItem', function (require) {
'use strict';

const EditableText = require('mail.wip.widget.EditableText');

const Dialog = require('web.Dialog');

const { Component, connect } = owl;

/**
 * @param {Object} state
 * @param {Object} ownProps
 * @param {string} ownProps.$thread
 * @param {Object} state.getters
 * @return {Object}
 */
function mapStateToProps(state, ownProps, getters) {
    const thread = state.threads[ownProps.$thread];
    return {
        directPartner: state.partners[thread.$directPartner],
        name: getters['thread/name'](ownProps.$thread),
        thread,
    };
}

class DiscussSidebarItem extends Component {

    /**
     * @param  {...any} args
     */
    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.DiscussSidebarItem';
        this.state = { renaming: false };
        this.widgets = { EditableText };
    }

    /**
     * @return {string}
     */
    get $thread() {
        return this.props.$thread;
    }

    /**
     * @return {integer}
     */
    get counter() {
        if (this.thread._model === 'mail.box') {
            return this.thread.counter;
        } else if (this.thread.channel_type === 'channel') {
            return this.thread.message_needaction_counter;
        } else if (this.thread.channel_type === 'chat') {
            return this.thread.message_unread_counter;
        }
        return 0;
    }

    /**
     * @return {mail.wip.model.partner|undefined}
     */
    get directPartner() {
        return this.props.directPartner;
    }

    /**
     * @return {boolean}
     */
    get isActive() {
        return this.props.isActive;
    }

    /**
     * @return {string}
     */
    get name() {
        return this.props.name;
    }

    /**
     * @return {mail.wip.model.Thread}
     */
    get thread() {
        return this.props.thread;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @return {Promise}
     */
    _askAdminConfirmation() {
        return new Promise(resolve => {
            Dialog.confirm(
                this,
                this.env._t("You are the administrator of this channel. Are you sure you want to leave?"),
                {
                    buttons: [
                        {
                            text: this.env._t("Leave"),
                            classes: 'btn-primary',
                            close: true,
                            click: resolve
                        },
                        {
                            text: this.env._t("Discard"),
                            close: true
                        }
                    ]
                }
            );
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onCancelRenaming() {
        this.state.renaming = false;
    }

    /**
     * @private
     */
    _onClick() {
        this.trigger('click', { $thread: this.$thread });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLeave(ev) {
        ev.stopPropagation();
        let prom;
        if (this.thread.create_uid === this.env.session.uid) {
            prom = this._askAdminConfirmation();
        } else {
            prom = Promise.resolve();
        }
        return prom.then(() =>
            this.env.store.dispatch('channel/unsubscribe', { $thread: this.$thread }));
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickRename(ev) {
        ev.stopPropagation();
        this.state.renaming = true;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSettings(ev) {
        ev.stopPropagation();
        return this.env.do_action({
            type: 'ir.actions.act_window',
            res_model: this.thread._model,
            res_id: this.thread.id,
            views: [[false, 'form']],
            target: 'current'
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickUnpin(ev) {
        ev.stopPropagation();
        return this.env.store.dispatch('channel/unsubscribe', { $thread: this.$thread });
    }

    /**
     * @private
     * @param {Object} param0
     * @param {string} param0.newName
     */
    _onRename({ newName }) {
        this.state.renaming = false;
        this.env.store.dispatch('thread/rename', {
            $thread: this.$thread,
            name: newName
        });
    }
}

return connect(mapStateToProps, { deep: false })(DiscussSidebarItem);

});
