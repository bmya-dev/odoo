odoo.define('sale.sales_team_dashboard', function (require) {
"use strict";

var core = require('web.core');
var KanbanRecord = require('web.KanbanRecord');
var ListRenderer = require('web.ListRenderer');
var EditableListRenderer = require('web.EditableListRenderer');
var _t = core._t;

KanbanRecord.include({
    events: _.defaults({
        'click .sales_team_target_definition': '_onSalesTeamTargetClick',
    }, KanbanRecord.prototype.events),

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @param {MouseEvent} ev
     */
    _onSalesTeamTargetClick: function (ev) {
        ev.preventDefault();

        this.$target_input = $('<input>');
        this.$('.o_kanban_primary_bottom').html(this.$target_input);
        this.$('.o_kanban_primary_bottom').prepend(_t("Set an invoicing target: "));
        this.$target_input.focus();

        var self = this;
        this.$target_input.blur(function() {
            var value = Number(self.$target_input.val());
            if (isNaN(value)) {
                self.do_warn(_t("Wrong value entered!"), _t("Only Integer Value should be valid."));
            } else {
                self._rpc({
                        model: 'crm.team',
                        method: 'write',
                        args: [[self.id], { 'invoiced_target': value }],
                    })
                    .done(function() {
                        self.trigger_up('kanban_record_update', {id: self.id});
                    });
            }
        });
    },

});

ListRenderer.include({
    _renderRows: function () {
        this._super.apply(this, arguments);
        var self = this
        var $rows = this._super();
        console.log("$rows", $rows)
        if (this.addCreateLine) {
            var $a = $('<a href="#">').text(_t("Add an item"));
            var $b = $('<a href="#">').css({'margin-left': '12px'}).text(_t("Add a Section"));
            var $td = $('<td>')
                        .addClass('o_field_x2many_list_row_add')
                        .append($b);

            $b.on('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                self.do_action('sale.action_view_sale_order_line_section');
            });
            $rows[$rows.length - 1].append($td);
        }
        return $rows;
    },
});

});
