odoo.define('mail.wip.widget.DiscussRoot', function (require) {
'use strict';

const Composer = require('mail.wip.widget.Composer');
const MobileMailboxSelection = require('mail.wip.widget.DiscussMobileMailboxSelection');
const MobileNavbar = require('mail.wip.widget.DiscussMobileNavbar');
const Sidebar = require('mail.wip.widget.DiscussSidebar');
const Thread = require('mail.wip.widget.Thread');
const ThreadPreviewList = require('mail.wip.widget.ThreadPreviewList');

const { Component, connect } = owl;

/**
 * @param {Object} state
 * @return {Object}
 */
function mapStateToProps(state) {
    return {
        discuss: state.discuss,
        isMobile: state.isMobile,
        threadCaches: state.threadCaches,
        threads: state.threads,
    };
}

class Root extends Component {
    /**
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.DiscussRoot';
        this.state = {
            mobileNavbarTab: 'mailbox',
            threadCachesInfo: {},
        };
        this.widgets = {
            Composer,
            MobileMailboxSelection,
            MobileNavbar,
            Sidebar,
            Thread,
            ThreadPreviewList,
        };
        /**
         * Last rendering "isMobile" status. Used to notify old_widget discuss
         * in case it changes, in order to update control panel.
         */
        this._wasMobile = undefined;
    }

    mounted() {
        this._wasMobile = this.isMobile;
        this.env.discuss.dispatch('ready');
    }

    patched() {
        if (this._wasMobile === this.isMobile) {
            return;
        }
        this._wasMobile = this.isMobile;
        if (this.isMobile) {
            // adapt active mobile navbar tab based on thread in desktop
            this.mobileNavbarTab = !this.thread ? this.mobileNavbarTab
                : this.thread._model === 'mail.box' ? 'mailbox'
                : this.thread.channel_type === 'channel' ? 'channel'
                : this.thread.channel_type === 'chat' ? 'chat'
                : this.mobileNavbarTab;
        }
        this.env.discuss.dispatch('update_cp');
    }

    //--------------------------------------------------------------------------
    // Getters / Setters
    //--------------------------------------------------------------------------

    /**
     * @return {string}
     */
    get $threadCache() {
        return `${this.$thread}_${this.stringifiedDomain}`;
    }

    /**
     * @return {string}
     */
    get $thread() {
        return this.discuss.$thread;
    }

    /**
     * @return {Object}
     */
    get discuss() {
        return this.props.discuss;
    }

    /**
     * @return {boolean}
     */
    get hasThreadMessages() {
        if (!this.threadCache) {
            return false;
        }
        return this.threadCache.$messages.length > 0;
    }

    /**
     * @return {boolean}
     */
    get isMobile() {
        return this.props.isMobile;
    }

    /**
     * @return {string}
     */
    get mobileNavbarTab() {
        return this.state.mobileNavbarTab;
    }

    /**
     * @return {boolean}
     */
    get showComposer() {
        return this.discuss.showComposer;
    }

    /**
     * @return {string}
     */
    get stringifiedDomain() {
        return this.discuss.stringifiedDomain;
    }

    /**
     * @return {Object} key: {string}, value: {mail.wip.model.Thread}
     */
    get threads() {
        return this.props.threads;
    }

    /**
     * @return {mail.wip.model.Thread}
     */
    get thread() {
        return this.threads[this.$thread];
    }

    /**
     * @return {mail.wip.model.ThreadCache}
     */
    get threadCache() {
        return this.threadCaches[this.$threadCache];
    }

    /**
     * @return {Object} key: {string}, value: {mail.wip.model.ThreadCache}
     */
    get threadCaches() {
        return this.props.threadCaches;
    }

    /**
     * @return {Object}
     */
    get threadOptions() {
        let scrollTop;
        const threadCacheInfo = this.state.threadCachesInfo[this.$threadCache];
        if (threadCacheInfo) {
            scrollTop = threadCacheInfo.scrollTop;
        } else {
            scrollTop = undefined;
        }
        return {
            domain: this.discuss.domain,
            redirectAuthor: this.thread.channel_type !== 'chat',
            scrollTop,
            squashCloseMessages: this.thread._model !== 'mail.box',
        };
    }

    /**
     * @return {Object}
     */
    get threadPreviewListOptions() {
        return { filter: this.mobileNavbarTab };
    }

    /**
     * @param {string} tab
     */
    set mobileNavbarTab(tab) {
        this.state.mobileNavbarTab = tab;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {Array} domain
     */
    updateDomain(domain) {
        this.env.store.commit('discuss/update', { domain });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} param0
     * @param {integer} param0.id
     * @param {string} param0.model
     */
    _onRedirect({ id, model }) {
        if (model === 'mail.channel') {
            const $thread = `${model}_${id}`;
            const channel = this.threads[$thread];
            if (!channel) {
                this.env.store.dispatch('channel/join', {
                    autoselect: true,
                    channelID: id,
                });
            } else {
                this.env.store.commit('discuss/update', { $thread });
            }
        } else if (model === 'res.partner') {
            const dm = Object.values(this.threads).find(thread =>
                thread.$directPartner === `res.partner_${id}`);
            if (!dm) {
                this.env.store.dispatch('channel/create', {
                    autoselect: true,
                    partnerID: id,
                    type: 'chat',
                });
            } else {
                this.env.store.commit('discuss/update', { $thread: dm.localID });
            }
        }
    }

    /**
     * @private
     * @param {Object} param0
     * @param {string} param0.tab
     */
    _onSelectMobileNavbarTab({ tab }) {
        if (this.mobileNavbarTab === tab) {
            return;
        }
        this.env.store.commit('discuss/update', {
            $thread: tab === 'mailbox' ? 'mail.box_inbox' : undefined,
        });
        this.mobileNavbarTab = tab;
        this.env.discuss.dispatch('update_cp');
    }

    /**
     * @private
     * @param {Object} param0
     * @param {string} param0.$thread
     */
    _onSelectThread({ $thread }) {
        if (this.refs.thread && this.refs.thread.hasMessages) {
            this.state.threadCachesInfo[this.$threadCache] = {
                scrollTop: this.refs.thread.getScrollTop(),
            };
        }
        this.env.store.commit('discuss/update', { $thread });
        this.env.discuss.dispatch('thread_selected');
    }
}

return connect(mapStateToProps, { deep: false })(Root);

});
