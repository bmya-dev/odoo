odoo.define('mass_mailing.website_integration', function (require) {
"use strict";

var config = require('web.config');
var core = require('web.core');
var utils = require('web.utils');
var publicWidget = require('web.public.widget');

var qweb = core.qweb;
var _t = core._t;

publicWidget.registry.subscribe = publicWidget.Widget.extend({
    selector: ".js_subscribe",
    disabledInEditableMode: false,
    read_events: {
        'click .js_subscribe_btn': '_onClickSubscribe',
    },

    /**
     * @override
     * @param {Object} parent
     * @param {Object} options
     */
    init: function (parent, options) {
        this.$popup = options.$popup || false;
        this._super.apply(this, arguments);
    },
    /**
     * @override
     */
    start: function () {
        var self = this;
        var defs = [this._super.apply(this, arguments)];

        var always = function (data) {
            var isSubscriber = data.is_subscriber;
            self.$('.js_subscribe_btn')
                .attr("disabled", isSubscriber ? "disabled" : false);
            self.$('input.js_subscribe_email')
                .val(data.email || "")
                .attr("disabled", isSubscriber ? "disabled" : false);
            self.$target.removeClass('d-none');
            self.$('.js_subscribe_btn').toggleClass('d-none', !!isSubscriber);
            self.$('.js_subscribed_btn').toggleClass('d-none', !isSubscriber);
        };
        defs.push(this._rpc({
            route: '/website_mass_mailing/is_subscriber',
            params: {
                list_id: this.$target.data('list-id'),
            },
        }).then(always).guardedCatch(always));
        return Promise.all(defs);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickSubscribe: function () {
        var self = this;
        var $email = this.$(".js_subscribe_email:visible");

        if ($email.length && !$email.val().match(/.+@.+/)) {
            this.$target.addClass('o_has_error').find('.form-control').addClass('is-invalid');
            return false;
        }
        this.$target.removeClass('o_has_error').find('.form-control').removeClass('is-invalid');
        var listID = this.$popup ? parseInt(this.$popup.attr('data-list-id')) : this.$target.data('list-id');
        this._rpc({
            route: '/website_mass_mailing/subscribe',
            params: {
                'list_id': listID,
                'email': $email.length ? $email.val() : false,
            },
        }).then(function (result) {
            if (self.$popup) {
                self.$popup.find('.o_newsletter_modal').modal('hide');
            }
            self.$(".js_subscribe_btn").addClass('d-none');
            self.$(".js_subscribed_btn").removeClass('d-none');
            self.$('input.js_subscribe_email').attr("disabled", result ? "disabled" : false);
            self.displayNotification(_t('Success'), result.toast_content, 'success', true);
        });
    },
});

publicWidget.registry.newsletter_popup = publicWidget.Widget.extend({
    selector: ".o_newsletter_popup",
    disabledInEditableMode: false,

    xmlDependencies: ['/website_mass_mailing/static/src/xml/website_mass_mailing.xml'],

    /**
     * @override
     */
    start: function () {
        var self = this;
        var defs = [this._super.apply(this, arguments)];
        this.websiteID = this._getContext().website_id;
        this.listID = parseInt(this.$target.attr('data-list-id'));
        var modalID = _.uniqueId("newsletter_modal_");
        this.$('.o_edit_popup').attr('data-target', "#" + modalID);

        if (!this.listID || (utils.get_cookie(_.str.sprintf("newsletter-popup-%s-%s", this.listID, this.websiteID)) && !self.editableMode)) {
            return Promise.all(defs);
        }
        defs.push(this._rpc({
            route: '/website_mass_mailing/get_content',
            params: {
                newsletter_id: self.listID,
            },
        }).then(function (data) {
            self.$('.o_newsletter_modal').remove();
            self.$target.append(qweb.render('website_mass_mailing.popup', {
                content: data.popup_content,
                isEditMode: self.editableMode,
                modalID: modalID,
            }));
            self.$('.o_newsletter_modal').on('shown.bs.modal', function () {
                // [TO-DO] must be generic for all 'oe_structure' element if possible
                self.$('.modal-body').attr('data-editor-message', _t('DRAG BUILDING BLOCKS HERE'));
                self.trigger_up('widgets_start_request', {
                    editableMode: false,
                    $target: self.$('.js_subscribe'),
                    options: {$popup: self.$target},
                });
            });
            // Newsletter input inside modal must subscribe to mail list that set for popup snippet
            self.$('.js_subscribe').data('list-id', self.listID);
            if (!self.editableMode && !data.is_subscriber) {
                if (config.device.isMobile) {
                    setTimeout(function () {
                        self._showBanner();
                    }, 5000);
                } else {
                    $(document).on('mouseleave.open_popup_event', self._showBanner.bind(self));
                }
            } else {
                $(document).off('mouseleave.open_popup_event');
            }
            // show popup after choosing a newsletter
            if (self.$target.attr('quick-open')) {
                self.$('.o_newsletter_modal').modal('show');
                self.$target.removeAttr('quick-open');
            }
        }));
        return Promise.all(defs);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _showBanner: function () {
        this.$('.o_newsletter_modal').modal('show');
        utils.set_cookie(_.str.sprintf("newsletter-popup-%s-%s", this.listID, this.websiteID), true);
        $(document).off('mouseleave.open_popup_event');
    },
});
});
