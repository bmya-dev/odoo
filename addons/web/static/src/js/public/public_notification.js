odoo.define('web.public.Notification', function (require) {
'use strict';

var notification = require('web.Notification');

notification.include({
    xmlDependencies: ['/web/static/src/xml/notification.xml'],
});
});
