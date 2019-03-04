odoo.define('web_mobile.relational_fields', function (require) {
"use strict";

var config = require('web.config');
var core = require('web.core');
var relational_fields = require('web.relational_fields');

var _t = core._t;

if (!config.device.isMobile) {
    return;
}

/**
 * Override the Many2One to prevent autocomplete and open kanban view in mobile for search.
 */

relational_fields.FieldMany2One.include({

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Don't bind autocomplete in the mobile as it uses a different mechanism
     * On clicking Many2One will directly open popup with kanban view
     *
     * @private
     * @override
     */
    _bindAutoComplete: function () {},

    /**
     * Override to call name_search and directly open Search Create Popup 
     *
     * @override
     * @private
     * @param {string} search_val
     * @returns {Deferred}
     */
    _search: function (search_val) {
        var self = this;
        var def = $.Deferred();
        this.orderer.add(def);

        var context = this.record.getContext(this.recordParams);
        var domain = this.record.getDomain(this.recordParams);

        // Add the additionalContext
        _.extend(context, this.additionalContext);

        var blacklisted_ids = this._getSearchBlacklist();
        if (blacklisted_ids.length > 0) {
            domain.push(['id', 'not in', blacklisted_ids]);
        }

        self._rpc({
            model: self.field.relation,
            method: 'name_search',
            kwargs: {
                name: search_val,
                args: domain,
                operator: "ilike",
                limit: 160,
                context: context,
            },
        })
        .then(function (results) {
            var dynamicFilters;
            if (results) {
                var ids = _.map(results, function (x) {
                    return x[0];
                });
                dynamicFilters = [{
                    description: _.str.sprintf(_t('Quick search: %s'), search_val),
                    domain: [['id', 'in', ids]],
                }];
            }
            self._searchCreatePopup("search", ids, {}, dynamicFilters);
            def.resolve();
        });
        return def;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * We always open Many2One search dialog for select/update field value on click of Many2One element
     *
     * @override
     * @private
     */
    _onInputClick: function () {
        return this._search();
    },
});

});
