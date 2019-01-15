odoo.define('web_editor.wysiwyg.plugin.customizeBlock', function (require) {
'use strict';

var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var Manager = require('web_editor.wysiwyg.plugin.manager');

var customizeBlock = AbstractPlugin.extend({
    dependencies: ['Selector'],

    editableDomEvents: {
        'mousedown': '_onMouseDown',
        'touchend': '_onTouchEnd',
        'touchstart': '_onTouchStart',
    },

    /**
     *
     * @override
     *
     * @param {Object[]} params.blockSelector
     * @param {string} params.blockSelector.selector
     * @param {string} params.blockSelector.exclude
     * @param {boolean} params.blockSelector.customizeAllowNotEditable
     * @param {string} params.blockSelector.customizeType
     * @param {string} params.blockSelector.customizeTargets
     **/
    init: function (parent, params) {
        this._super.apply(this, arguments);
        if (!this.options.blockSelector) {
            console.error("'customizeBlock' plugin should use 'blockSelector' options");
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     *
     * @private
     *
     * @param {DOM} deepestTarget
     *
     * @returns {Object[]} deepest to upper ArchNode who match with selector
     **/
    _getCustomizableArchNode: function (deepestTarget) {
        var selected = [];
        var Selector = this.dependencies.Selector;
        var archNode = this.dependencies.Arch.getNode(deepestTarget);
        if (archNode) {
            while (archNode) {
                var isEditable = archNode.isEditable();

                this.options.blockSelector.forEach(function (zone) {
                    if (!zone.customizeType) {
                        return;
                    }
                    if (!isEditable && !zone.customizeAllowNotEditable) {
                        return;
                    }
                    if (Selector.is(archNode, zone.selector) && (!zone.exclude || !Selector.is(archNode, zone.exclude))) {
                        selected.push({
                            target: archNode,
                            targets: zone.customizeTargets ? Selector.search(archNode, zone.customizeTargets, {returnArchNodes: true}) : [archNode],
                            customizeType: zone.customizeType,
                        });
                    }
                });
                archNode = archNode.parent;
            }
        }
        return selected;
    },

    //--------------------------------------------------------------------------
    // Handle
    //--------------------------------------------------------------------------

    _onMouseDown: function (ev) {
        var selected = this._getCustomizableArchNode(ev.target);
        console.log(selected);
    },
    _onTouchEnd: function (ev) {
        // TODO
    },
    _onTouchStart: function (ev) {
        // on long touch open customize
        // TODO
    },
});

Manager.addPlugin('customizeBlock', customizeBlock);



});
