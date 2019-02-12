odoo.define('mail.wip.widget.MessageList', function (require) {
'use strict';

const Message = require('mail.wip.widget.Message');

const { Component, connect } = owl;

function mapStateToProps(state, ownProps) {
    const threadCache = state.threadCaches[ownProps.$threadCache];
    // aku todo: already sort message local IDs in store
    const $messages = threadCache ?
        threadCache.$messages
            .slice(0)
            .sort(($msg1, $msg2) => {
                let msg1 = state.messages[$msg1];
                let msg2 = state.messages[$msg2];
                return msg1.id > msg2.id ? 1 : -1;
            }) : [];
    const messages = $messages.map($message => state.messages[$message]);
    return {
        $messages,
        messages,
        partners: state.partners,
        thread: state.threads[ownProps.$thread],
        threadCache,
    };
}

class MessageList extends Component {
    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.MessageList';
        this.state = {
            $loadingMoreThreadCache: null,
            loadingMoreMessageCount: 0
        };
        this.widgets = { Message };
        this._$renderedThreadCache = null;
        this._autoLoadOnScroll = true;
        this._onScroll = _.throttle(this._onScroll.bind(this), 100);
    }

    mounted() {
        if (this.options.scrollTop) {
            this.scrollTop = this.options.scrollTop;
        } else {
            this.scrollToLastMessage();
        }
        this._$renderedThreadCache = this.$threadCache;
    }

    /**
     * @return {Object} snapshot object
     */
    willPatch() {
        const lastMessageRef = this.lastMessageRef;
        const { length: l, [l-1]: $lastMessage } = this.$messages;

        const hasNewMessages = !this._$renderedThreadCache === this.$threadCache &&
            lastMessageRef.$message !== $lastMessage;
        const isNewlyLoaded = this._$renderedThreadCache !== this.$threadCache;

        const loadedMore = !this.loadingMore && this.refs.loadMore;
        const scrollHeight = this.el.scrollHeight;
        const scrollTop = this.el.scrollTop;
        const scrollToLastMessage = (hasNewMessages && lastMessageRef.bottomVisible) ||
            isNewlyLoaded;

        return {
            loadedMore,
            scrollHeight,
            scrollToLastMessage,
            scrollTop,
        };
    }

    /**
     * @param {Object} snapshot
     * @param {boolean} [snapshot.loadedMore=false]
     * @param {integer} snapshot.scrollHeight
     * @param {boolean} [snapshot.scrollToLastMessage=false]
     * @param {integer} snapshot.scrollTop
     */
    patched(snapshot) {
        this.scrollTop =
            this.el.scrollHeight -
            snapshot.scrollHeight +
            snapshot.scrollTop;
        if (snapshot.scrollToLastMessage && this.hasMessages) {
            this._autoLoadOnScroll = false;
            this.lastMessageRef
                .scrollToVisibleBottom()
                .then(() => {
                    this._autoLoadOnScroll = true;
                    this._onScroll();
                });
        }
        this._$renderedThreadCache = this.$threadCache;
    }

    //--------------------------------------------------------------------------
    // Getters / Setters
    //--------------------------------------------------------------------------

    /**
     * @return {string}
     */
    get $loadingMoreThreadCache() {
        return this.state.loadingMoreThreadCache;
    }

    /**
     * @return {string[]}
     */
    get $messages() {
        return this.props.messages;
    }

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
        return this.messages.length > 0;
    }

    /**
     * @return {mail.wip.widget.Message}
     */
    get lastMessageRef() {
        let { length: l, [l - 1]: lastMessageRef } = this.messageRefs;
        return lastMessageRef;
    }

    /**
     * @return {boolean}
     */
    get loadingMore() {
        return (this.threadCache && this.threadCache.loadingMore) || false;
    }

    /**
     * @return {integer}
     */
    get loadingMoreMessageCount() {
        return this.state.loadingMoreMessageCount;
    }

    /**
     * @return {boolean}
     */
    get loadMoreVisible() {
        const loadMore = this.refs.loadMore;
        if (!loadMore) {
            return false;
        }
        const loadMoreRect = loadMore.getBoundingClientRect();
        const elRect = this.el.getBoundingClientRect();
        // intersection with 10px offset
        return (
            loadMoreRect.top < elRect.bottom + 10 &&
            elRect.top < loadMoreRect.bottom + 10
        );
    }

    /**
     * @return {mail.wip.widget.Message[]}
     */
    get messageRefs() {
        return Object.entries(this.refs)
            .filter(([refID, ref]) => refID.indexOf('mail.message') !== -1)
            .map(([refID, ref]) => ref)
            .sort((ref1, ref2) => (ref1.message.id < ref2.message.id ? -1 : 1));
    }

    /**
     * @return {mail.wip.model.Message[]}
     */
    get messages() {
        return this.props.messages;
    }

    /**
     * @return {Object}
     */
    get options() {
        return this.props.options || {};
    }

    /**
     * @return {integer}
     */
    get scrollTop() {
        return this.el.scrollTop;
    }

    /**
     * @return {mail.wip.model.Thread}
     */
    get thread() {
        return this.props.thread;
    }

    /**
     * @return {mail.wip.model.ThreadCache|undefined}
     */
    get threadCache() {
        return this.props.threadCache;
    }

    /**
     * @param {integer} val
     */
    set scrollTop(val) {
        this.el.scrollTop = val;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {mail.wip.model.Message} message
     * @return {string}
     */
    getDateDay(message) {
        var date = moment(message._date).format('YYYY-MM-DD');
        if (date === moment().format('YYYY-MM-DD')) {
            return this.env._t("Today");
        } else if (
            date === moment()
                .subtract(1, 'days')
                .format('YYYY-MM-DD')
        ) {
            return this.env._t("Yesterday");
        }
        return moment(message._date).format('LL');
    }

    /**
     * @param {boolean} squashed
     * @return {Object}
     */
    messageOptions(squashed) {
        return {
            ...this.options,
            squashed,
        };
    }

    /**
     * @return {Promise}
     */
    scrollToLastMessage() {
        if (!this.hasMessages) {
            return Promise.resolve();
        }
        this._autoLoadOnScroll = false;
        return this.lastMessageRef.scrollToVisibleBottom().then(() => {
            this._autoLoadOnScroll = true;
        });
    }

    /**
     * @param {mail.wip.model.Message} prevMessage
     * @param {mail.wip.model.Message} message
     * @return {boolean}
     */
    shouldSquash(prevMessage, message) {
        if (!this.options.squashCloseMessages) {
            return false;
        }
        const prevDate = moment(prevMessage._date);
        const date = moment(message._date);
        if (Math.abs(date.diff(prevDate)) > 60000) {
            // more than 1 min. elasped
            return false;
        }
        if (prevMessage.message_type !== 'comment' || message.message_type !== 'comment') {
            return false;
        }
        if (prevMessage.$author !== message.$author) {
            // from a different author
            return false;
        }
        if (prevMessage.$origin !== message.$origin) {
            return false;
        }
        const prevOrigin = this.env.store.state.threads[prevMessage.$origin];
        const origin = this.env.store.state.threads[message.$origin];
        if (
            prevOrigin && origin &&
            prevOrigin._model === origin._model &&
            origin._model !== 'mail.channel' &&
            prevOrigin.id !== origin.model
        ) {
            // messages linked to different document thread
            return false;
        }
        return true;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _loadMore() {
        this.env.store.dispatch('thread/load_more', {
            $thread: this.$thread,
            searchDomain: this.options.domain,
        });
    }

    /**
     * @private
     */
    _markAsSeen() {
        this.env.store.dispatch('thread/mark_as_seen', { $thread: this.$thread });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLoadMore(ev) {
        ev.preventDefault();
        this._loadMore();
    }

    /**
     * @private
     * @param {Object} param0
     * @param {integer} param0.id
     * @param {string} param0.model
     */
    _onRedirect({ id, model }) {
        this.trigger('redirect', { id, model });
    }

    /**
     * @private
     */
    _onScroll() {
        if (!this.el) {
            // could be unmounted in the meantime (due to throttled behavior)
            return;
        }
        if (!this._autoLoadOnScroll) {
            return;
        }
        if (this.loadMoreVisible) {
            this._loadMore();
        }
        if (
            this.options.domain &&
            !this.options.domain.length &&
            this.lastMessageRef.partiallyVisible
        ) {
            this._markAsSeen();
        }
    }
}

return connect(mapStateToProps, { deep: false })(MessageList);

});
