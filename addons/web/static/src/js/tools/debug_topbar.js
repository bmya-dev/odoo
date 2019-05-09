odoo.define('web.DebugTopbar', function (require) {
"use strict";

var Widget = require('web.Widget');

var DebugTopbar = Widget.extend({
    events: {
        "click a": "leave_debug_mode",
    },
    leave_debug_mode: function () {
        var qs = $.deparam.querystring();
        qs.debug = '';
        window.location.search = '?' + $.param(qs);
    },
});

return DebugTopbar;

});

odoo.define('web.DebugTopbar.instance', function (require) {
    $(function () {
        var DebugTopbarWidget = require('web.DebugTopbar');
        var debugTopbar = new DebugTopbarWidget();
        debugTopbar.attachTo(".o_debug_mode");
    });
});
