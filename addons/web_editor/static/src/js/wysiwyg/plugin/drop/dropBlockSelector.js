odoo.define('web_editor.wysiwyg.plugin.dropBlockSelector', function (require) {
'use strict';

var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var Manager = require('web_editor.wysiwyg.plugin.manager');

var dropBlockSelector = AbstractPlugin.extend({
    dependencies: ['DropBlock', 'Selector'],

    /**
     *
     * @override
     *
     * @param {Object[]} params.blockSelector
     * @param {string} params.blockSelector.selector
     * @param {string} params.blockSelector.exclude
     * @param {string} params.blockSelector.dropIn
     * @param {string} params.blockSelector.dropNear
     **/
    init: function (parent, params) {
        this._super.apply(this, arguments);
        if (!this.options.blockSelector) {
            console.error("'DropblockSelector' plugin should use 'blockSelector' options");
        }
    },

    start: function () {
        var promise = this._super();
        this.dependencies.DropBlock.on('dropzone', this, this._onDragAndDropStart.bind(this));
        this.dependencies.DropBlock.on('item', this, this._onDragAndDropNeedItems.bind(this));
        return promise;
    },

    //--------------------------------------------------------------------------
    // Handle
    //--------------------------------------------------------------------------

    _onDragAndDropNeedItems: function (items) {
        var self = this;
        items.splice(0);
        var ids = [];
        this.options.blockSelector.forEach(function (zone) {
            if (zone.dropIn || zone.dropNear) {
                self.dependencies.Selector.search(zone.selector).forEach(function (id) {
                    if (ids.indexOf(id) === -1) {
                        ids.push(id);
                    }
                });
            }
        });
        ids.forEach(function (id) {
            items.push(self.dependencies.Arch.getElement(id));
        });
    },
    _onDragAndDropStart: function (dragAndDrop, dropZones) {
        if (dragAndDrop.elements.length > 1) {
            throw new Error("The dropable block content should contains only one child.");
        }
        var Selector = this.dependencies.Selector;
        var Arch = this.dependencies.Arch;
        var element = dragAndDrop.elements[0];
        dropZones.splice(0);
        this.options.blockSelector.forEach(function (zone) {
            if ((zone.dropIn || zone.dropNear) && Selector.is(element, zone.selector) && (!zone.exclude || !Selector.is(element, zone.exclude))) {
                var dropInIds = zone.dropIn && Selector.search(zone.dropIn) || [];
                var dropIn = [];
                dropInIds.forEach(function (id) {
                    if (!Arch.getNode(id).isEditable()) {
                        return;
                    }
                    var el = Arch.getElement(id);
                    if (el && el.parentNode) {
                        dropIn.push(el);
                    }
                });

                var dropNearIds = zone.dropNear && Selector.search(zone.dropNear) || [];
                var dropNear = [];
                dropNearIds.forEach(function (id) {
                    if (!Arch.getNode(id).isEditable()) {
                        return;
                    }
                    var el = Arch.getElement(id);
                    if (el && el.parentNode) {
                        dropNear.push(el);
                    }
                });

                dropZones.push({
                    dropIn: dropIn,
                    dropNear: dropNear,
                });
            }
        });
    },
});

Manager.addPlugin('dropBlockSelector', dropBlockSelector);



});
