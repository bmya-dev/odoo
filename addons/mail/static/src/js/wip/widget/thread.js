odoo.define('mail.wip.widget.Thread', function (require) {
'use strict';

const MessageList = require('mail.wip.widget.MessageList');

const { Component, connect } = owl;

function mapStateToProps(state, ownProps) {
    const options = ownProps.options || {};
    const $threadCache = `${ownProps.$thread}_${JSON.stringify(options.domain || [])}`;
    const threadCache = state.threadCaches[$threadCache];
    return {
        $threadCache,
        threadCache,
    };
}

class Thread extends Component {

    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.Thread';
        this.widgets = { MessageList };
        this._$renderedThreadCache = null;
    }

    mounted() {
        if (!this.loaded) {
            this._loadThread();
        }
        this._$renderedThreadCache = this.$threadCache;
        this.env.discuss.dispatch('update_cp');
    }

    patched() {
        if (!this.loading && !this.loaded) {
            this._loadThread();
        }
        if (this.loaded && this.hasMessages) {
            if (this.options.scrollTop !== undefined) {
                this.refs.messageList.scrollTop = this.options.scrollTop;
            } else if (this._$renderedThreadCache !== this.$threadCache) {
                this.refs.messageList.scrollToLastMessage();
            }
        }
        this._$renderedThreadCache = this.$threadCache;
        this.env.discuss.dispatch('update_cp');
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
     * @return {string}
     */
    get $threadCache() {
        return this.props.$threadCache;
    }

    /**
     * @return {boolean}
     */
    get hasMessages() {
        return (
            (this.threadCache && this.threadCache.$messages.length > 0) || false
        );
    }

    /**
     * @return {boolean}
     */
    get loaded() {
        return (this.threadCache && this.threadCache.loaded) || false;
    }

    /**
     * @return {boolean}
     */
    get loading() {
        return (this.thread && this.threadCache.loading) || false;
    }

    /**
     * @return {Object}
     */
    get options() {
        return this.props.options || {};
    }

    /**
     * @return {boolean}
     */
    get redirectAuthor() {
        return this.options.redirectAuthor || false;
    }

    /**
     * @return {mail.wip.model.ThreadCache}
     */
    get threadCache() {
        return this.props.threadCache;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @return {integer}
     */
    getScrollTop() {
        return this.refs.messageList.scrollTop;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _loadThread() {
        this.env.store.dispatch('thread/load', {
            $thread: this.$thread,
            searchDomain: this.options.domain,
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onRedirect({ id, model }) {
        this.trigger('redirect', { id, model });
    }
}

return connect(mapStateToProps, { deep: false })(Thread);

});
