odoo.define('openerp_website.event_editor', function (require) {
'use strict';

var rte = require('web_editor.rte');

rte.Class.include({
    /**
     * @override
     */
    _saveElement: function ($el, context, withLang) {
        // Add the ability to save the o_event_banner banner url
        if ($el.is('#o_event_banner')) {
            var eventID = $el.data('eventId');
            if (!eventID) {
                return $.when();
            }

            var imageURL = $el.css('background-image').replace(/"/g, '').replace(window.location.protocol + '//' + window.location.host, '');
            if (imageURL === 'none') {
                imageURL = false;
            }

            return this._rpc({
                model: 'event.event',
                method: 'write',
                args: [eventID, {custom_banner_url: imageURL}],
            });
        }
        return this._super.apply(this, arguments);
    },
});
});
