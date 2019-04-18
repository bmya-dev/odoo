odoo.define("pos_restaurant.tipping", function(require) {
    "use strict";

    var ScreenWidget = require("point_of_sale.screens").ScreenWidget;
    var PosBaseWidget = require("point_of_sale.BaseWidget");
    var chrome = require("point_of_sale.chrome");
    var gui = require("point_of_sale.gui");

    var TippingWidget = PosBaseWidget.extend({
        template: "TippingWidget",

        start: function() {
            var self = this;
            this.$el.click(function() {
                self.gui.show_screen("tipping");
            });
        }
    });

    chrome.Chrome.include({
        init: function() {
            this._super();
            this.widgets.push({
                name: "tipping",
                widget: TippingWidget,
                replace: ".placeholder-TippingWidget"
            });
        }
    });

    var TippingScreenList = PosBaseWidget.extend({
        template: "TippingScreenList",

        init: function(parent, options) {
            this._super(parent, options);
            this.parent = parent;
        }
    });

    var TippingScreenWidget = ScreenWidget.extend({
        template: "TippingScreenWidget",

        init: function(parent, options) {
            this._super(parent, options);
            this.filtered_confirmed_orders = [];
            this.current_search = "";
            this.tipping_screen_list_widget = new TippingScreenList(
                this,
                options
            );
        },

        show: function() {
            var self = this;
            this._super();
            this.filtered_confirmed_orders = this.pos.db.confirmed_orders;

            // re-render the template when showing it to have the
            // latest orders.
            this.renderElement();
            this.render_orders();

            this.$(".back").click(function() {
                self.gui.back();
            });

            var search_timeout = undefined;

            // use keydown because keypress isn't triggered for backspace
            this.$(".searchbox input").on("keydown", function(_) {
                var searchbox = this;
                clearTimeout(search_timeout);

                console.log("got ", self.current_search);
                search_timeout = setTimeout(function() {
                    if (self.current_search != searchbox.value) {
                        self.current_search = searchbox.value;
                        self.search(self.current_search);
                    } else {
                        console.log(
                            "skipping re-render cause search term didn't change"
                        );
                    }
                }, 70);
            });
        },

        render_orders: function() {
            this.tipping_screen_list_widget.renderElement();
            this.$el
                .find(".list-table-contents")
                .replaceWith(this.tipping_screen_list_widget.el);
        },

        // TODO JOV: document
        search: function(term) {
            var self = this;

            term = term.toLowerCase();
            this.filtered_confirmed_orders = this.pos.db.confirmed_orders;

            term.split(" ").forEach(function(term) {
                self.filtered_confirmed_orders = _.filter(
                    self.filtered_confirmed_orders,
                    function(order) {
                        return _.some(_.values(order), function(value) {
                            return (
                                String(value)
                                    .toLowerCase()
                                    .indexOf(term) !== -1
                            );
                        });
                    }
                );
            });

            this.render_orders();
        },

        // todo is this still necessary?
        close: function() {
            this._super();
            if (
                this.pos.config.iface_vkeyboard &&
                this.chrome.widget.keyboard
            ) {
                this.chrome.widget.keyboard.hide();
            }
        }
    });
    gui.define_screen({ name: "tipping", widget: TippingScreenWidget });

    return {
        TippingWidget: TippingWidget,
        TippingScreenWidget: TippingScreenWidget
    };
});
