odoo.define('mail.wip.widget.ThreadPreviewList', function (require) {
'use strict';

// const Preview = require('mail.wip.widget.ThreadPreview');

const { Component, connect } = owl;

function mapStateToProps(state, ownProps) {
    const options = ownProps.options || {};
    return {
        threads: Object.values(state.threads).filter(thread => {
            if (options.filter === 'mailbox') {
                return thread._model === 'mail.box';
            }
            if (options.filter === 'channel') {
                return thread.channel_type === 'channel';
            }
            if (options.filter === 'chat') {
                return thread.channel_type === 'chat';
            }
            return false;
        }),
    };
}

class Thread extends Component {

    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.ThreadPreviewList';
        // this.widgets = { Preview };
    }

    mounted() {
        if (!this.loaded) {
            this._loadPreviews();
        }
    }

    patched() {
        if (!this.loading && !this.loaded) {
            this._loadPreviews();
        }
    }

    //--------------------------------------------------------------------------
    // Getters / Setters
    //--------------------------------------------------------------------------

    /**
     * @return {string[]}
     */
    get $threads() {
        return this.props.threads.map(thread => thread.localID);
    }

    /**
     * @return {boolean}
     */
    get loaded() {
        // todo: some thread needs fetch preview
        // threadCategories[$threadCategory].loaded in store
        return true;
    }

    /**
     * @return {boolean}
     */
    get loading() {
        // todo: currently fetching some previews
        // threadCategories[$threadCategory].loading in store
        return false;
    }

    /**
     * @return {Object}
     */
    get options() {
        return this.props.options || {};
    }

    /**
     * @return {mail.wip.model.Thread[]}
     */
    get threads() {
        return this.props.threads;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {string} $thread
     * @return {string}
     */
    name($thread) {
        return this.env.store.getters['thread/name']($thread);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _loadPreviews() {
        this.env.store.dispatch('thread/load_previews', { $threads: this.$threads });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onClick($thread) {
        this.trigger('select-thread', { $thread });
    }
}

return connect(mapStateToProps, { deep: false })(Thread);

});
