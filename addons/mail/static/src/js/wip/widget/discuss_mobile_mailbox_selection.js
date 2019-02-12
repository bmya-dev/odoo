odoo.define('mail.wip.widget.DiscussMobileMailboxSelection', function (require) {
'use strict';

const { Component, connect } = owl;

/**
 * @param {Object} state
 * @return {Object}
 */
function mapStateToProps(state) {
    return {
        mailboxes: Object.values(state.threads).filter(thread =>
            thread._model === 'mail.box'),
    };
}

class MobileMailboxSelection extends Component {
    /**
     * @param  {...any} args
     */
    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.DiscussMobileMailboxSelection';
    }

    //--------------------------------------------------------------------------
    // Getters / Setters
    //--------------------------------------------------------------------------

    /**
     * @return {string}
     */
    get $thread() {
        return this.props.$thread;
    }

    /**
     * @return {mail.wip.model.Thread[]}
     */
    get mailboxes() {
        return this.props.mailboxes;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {string} $thread
     * @return {boolean}
     */
    active($thread) {
        return this.$thread === $thread;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} param0
     * @param {string} param0.$thread
     */
    _onClick({ $thread }) {
        this.trigger('select', { $thread });
    }
}

return connect(mapStateToProps, { deep: false })(MobileMailboxSelection);

});
