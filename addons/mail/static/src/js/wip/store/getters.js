odoo.define('mail.wip.store.getters', function (require) {
"use strict";

const getters = {
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} $thread
     * @return {string}
     */
    'thread/name'({ state }, $thread) {
        const thread = state.threads[$thread];
        if (thread.channel_type === 'chat') {
            const directPartner = state.partners[thread.$directPartner];
            return thread.custom_channel_name || directPartner.name;
        }
        return thread.name;
    },
};

return getters;

});
