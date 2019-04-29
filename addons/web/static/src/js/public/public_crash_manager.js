odoo.define('web.public.CrashManager', function (require) {
"use strict";

var core = require('web.core');
var CrashManager = require('web.CrashManager').CrashManager;
var mixins = require('web.mixins');
var ServicesMixin = require('web.ServicesMixin');
var ServiceProviderMixin = require('web.ServiceProviderMixin');

var _t = core._t;

var PublicCrashManager = CrashManager.extend(mixins.EventDispatcherMixin, ServicesMixin, ServiceProviderMixin, {
    /**
     *
     * @override
     */
    init: function () {
        mixins.EventDispatcherMixin.init.call(this);
        this._super.apply(this, arguments);
        ServiceProviderMixin.init.call(this);
    },
    /**
     *
     * @override
     */
    show_warning: function (error) {
        if (!this.active) {
            return;
        }
        var message = error.data ? error.data.message : error.message;
        var title = _.str.capitalize(error.type) || _t("Oops Something went wrong !");
        var subtitle = error.data.title;
        this.displayNotification({
            title: title,
            message: message,
            subtitle: subtitle,
            sticky: true,
        });
    },
});

return {
    PublicCrashManager: PublicCrashManager,
};
});

odoo.define('web.crash_manager', function (require) {
"use strict";

var PublicCrashManager = require('web.public.CrashManager').PublicCrashManager;
return new PublicCrashManager();

});
