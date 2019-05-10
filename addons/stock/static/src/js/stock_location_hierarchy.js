odoo.define('stock.stock_location_hierarchy_qweb', function (require) {
"use strict";

var core = require('web.core');
var QwebView = require('web.qweb');
var registry = require('web.view_registry');

var RelationalFields = require('web.relational_fields');
var StandaloneFieldManagerMixin = require('web.StandaloneFieldManagerMixin');
var Widget = require('web.Widget');

var StockLocationMany2One = Widget.extend(StandaloneFieldManagerMixin, {
    init: function (parent, modelName, fieldName, value) {
        this._super.apply(this, arguments);
        StandaloneFieldManagerMixin.init.call(this);
        this.modelName = modelName;
        this.fieldName = fieldName;
        this.value = value;
    },
    willStart: function () {
        var self = this;
        var options = {};
        options[this.fieldName] = {
            options: {
                no_open: true,
                no_create: true,
            },
        };
        return this.model.makeRecord(this.modelName, [{
            fields: [{
                name: 'id',
                type: 'integer',
            }, {
                name: 'display_name',
                type: 'char',
            }],
            name: this.fieldName,
            relation: this.modelName,
            type: 'many2one',
            value: this.value,
        }], options).then(function (recordID) {
            self.field = new RelationalFields.FieldMany2One(self,
                self.fieldName,
                self.model.get(recordID),
                {mode: 'edit'},
            );
            self._registerWidget(recordID, self.fieldName, self.field);
        });
    },
    start: function () {
        return $.when(
            this.field.appendTo(this.$el),
            this._super.apply(this, arguments),
        );
    },
    _onFieldChanged: function (event) {
        StandaloneFieldManagerMixin._onFieldChanged.apply(this, arguments);
        this.trigger_up('search_value_changed', {
            value: event.data.changes[this.fieldName].id,
        });
    },
});

var Model = QwebView.Model.extend({
    init: function () {
        this._super.apply(this, arguments);
        this._state.parent_id = false;
    },
    reload: function (_id, _params) {
        if (_params.parent_id) {
            this._state.context.parent_id = _params.parent_id;
        }
        return this._super.apply(this, arguments);
    }
});

var Renderer = QwebView.Renderer.extend({

});

var Controller = QwebView.Controller.extend({
    custom_events: _.extend({}, QwebView.Controller.prototype.custom_events, {
        search_value_changed: '_onSearchValueChanged',
    }),
    renderPager: function ($node) {
        if ($node) {
            this.$searchView = $('<div><strong class="mr-2">Location : </strong></div>');
            this.$searchView.appendTo($node);
            this.many2one = new StockLocationMany2One(
                this,
                this.modelName,
                'location_id',
                this.model.get().parent_id,
            );
            this.many2one.appendTo(this.$searchView);
        }
    },
    _onSearchValueChanged: function (event) {
        this.update({parent_id: event.data.value || false});
    },
});

/**
 * view
 */
var QWebView = QwebView.View.extend({
    config: {
        Model: Model,
        Renderer: Renderer,
        Controller: Controller,
    },
    withSearchBar: false,
    searchMenuTypes: [],
});

registry.add('stock_location_hierarchy_qweb', QWebView);

return {
    View: QWebView,
    Controller: Controller,
    Renderer: Renderer,
    Model: Model,
};

});
