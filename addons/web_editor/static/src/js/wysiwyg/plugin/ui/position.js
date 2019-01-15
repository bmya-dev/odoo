odoo.define('web_editor.wysiwyg.plugin.position', function (require) {
'use strict';

var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var Manager = require('web_editor.wysiwyg.plugin.manager');

var $ = require('web_editor.jquery');
var _ = require('web_editor._');

//--------------------------------------------------------------------------
// Position
//--------------------------------------------------------------------------

var PositionPlugin = AbstractPlugin.extend({
    dependencies: [],

    editableDomEvents: {
        'mousedown': '_onMouseDown',
        'scroll': '_onScroll',
        'mousemove': '_onMouseMove',
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    getMousePosition: function () {
        return Object.assign({}, this.mousePosition);
    },
    /**
     * Focus or range position
     * currently saved focused node or target or on the current range.
     *
     * @private
     * @returns {Object} {start: {top, left}, end: {top, left}}
     */
    getPosition: function (node, offset) {
        if (!node.tagName) {
            return this._getNodePosition(node, offset);
        } else {
            return node.getBoundingClientRect();
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _getNodePosition: function (node, offset) {
        if (!node.tagName) {
            var parent = node.parentNode;
            var clone = node.cloneNode();
            parent.insertBefore(clone, node);
            //parent.removeChild(node);

            var span = document.createElement('span');
            span.style.position = "absolute";
            var nextClone = clone.splitText(offset);
            parent.insertBefore(span, nextClone);

            box = span.getBoundingClientRect();

            //this.dom._insertAfter(node, nextClone);
            parent.removeChild(clone);
            parent.removeChild(span);
            parent.removeChild(nextClone);

            return {
                top: box.top,
                left: box.left,
            };
        } else if (offset === 0) {
            var box = node.getBoundingClientRect();
            return {
                top: box.top,
                left: box.left,
            };
        } else if (node.childNodes[offset]) {
            var box = node.childNodes[offset].getBoundingClientRect();
            return {
                top: box.top,
                left: box.left,
            };
        } else {
            var box = node.getBoundingClientRect();
            return {
                top: box.top,
                left: box.left + box.width,
            };
        }
    },

    //--------------------------------------------------------------------------
    // handle
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {jQueryEvent} e
     */
    _onMouseDown: function (e) {
        var clientRect = e.target.getBoundingClientRect();

        if (e.pageX) {
            this.mousePosition = {
                pageX: e.pageX,
                pageY: e.pageY,
            };
        } else {
            // for testing triggers
            this.mousePosition = {
                pageX: clientRect.left,
                pageY: clientRect.top,
            };
        }

        // we put the cursor to the left if we click in the first tier of the media
        var left = this.mousePosition.pageX < (clientRect.left + clientRect.width / 3);
        this.dependencies.Arch.setRangeOnVoidBlock(e.target, left);
    },
    /**
     * @private
     * @param {jQueryEvent} e
     */
    _onMouseMove: function (e) {
        this.mousePosition = {
            pageX: e.pageX,
            pageY: e.pageY,
        };
    },
    /**
     * @private
     */
    _onScroll: function () {
        var self = this;
        if (this._debounceTime) {
            return;
        }
        this._debounceTime = true;
        this.trigger('scroll');
        setTimeout(function () {
            self._debounceTime = false;
            self.trigger('scroll');
        }, 10);
    },
});

Manager.addPlugin('Position', PositionPlugin);

return PositionPlugin;

});
