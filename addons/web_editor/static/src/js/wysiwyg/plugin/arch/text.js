odoo.define('wysiwyg.plugin.arch.text', function (require) {
'use strict';

var ArchNode = require('wysiwyg.plugin.arch.node');
function True () { return true; };
function False () { return false; };


return ArchNode.extend({
    init: function (params, nodeName, attributes, nodeValue) {
        this.params = params;
        this.nodeName = 'TEXT';
        this.nodeValue = nodeValue;
        this.params.change(this, nodeValue.length);
    },
    addLine: function (offset) {
        if (!this.isEditable()) {
            console.warn("can not split a not editable node");
            return;
        }

        var next = this.split(offset) || this.nextSibling() || this;
        if (next.isRightEdge()) {
            this.params.change(next, 0);
        }
        return this.parent.addLine(next.index());
    },
    empty: function () {
        this.nodeValue = '';
    },
    insert: function (archNode, offset) {
        if (!this.isEditable()) {
            console.warn("can not split a not editable node");
            return;
        }

        if (archNode.isText() && archNode.isVisibleText()) {
            this._insertTextInText(archNode.nodeValue, offset);
            return;
        }

        var next = this.split(offset);
        this.parent.insert(archNode, next.index());
    },
    toString: function (options) {
        options = options || {};
        if (this.isVirtual() && !options.keepVirtual) {
            return '';
        }
        if (options.showIDs) {
            if (this.isVirtual()) {
                return '[virtual archID="' + this.id + '"/]';
            }
            return '[text archID="' + this.id + '"]' + this.nodeValue + '[/text]';
        }
        return this.nodeValue || '';
    },
    length: function (argument) {
        return this.nodeValue.length;
    },
    /**
     * @override
     */
    isBlankNode: False,
    /**
     * @override
     */
    isBlankText: False,
    /**
     * @override
     */
    isElement: False,
    /**
     * @override
     */
    isEmpty: function () {
        return !this.nodeValue.length;
    },
    /**
     * @override
     */
    isInline: True,
    /**
     * @override
     */
    isNodeBlockType: False,
    /**
     * @override
     */
    isText: True,
    /**
     * @override
     */
    isVisibleText: True,
    removeLeft: function (offset) {
        this._removeSide(offset, true);
    },
    removeRight: function (offset) {
        this._removeSide(offset, false);
    },
    split: function (offset) {
        if (!this.isEditable()) {
            console.warn("can not split a not editable node");
            return;
        }

        var text = this.nodeValue.slice(offset);
        var archNode;

        if (offset === 0) {
            this.params.change(this, 0);
            archNode = this.params.create();
            this.before(archNode);
            return this;
        }
        if (!this.ancestor(this.isPre)) {
            text = text.replace(/^ | $/g, '\u00A0');
        }

        if (text.length) {
            archNode = new this.constructor(this.params, this.nodeName, null, text);
        } else {
            archNode = this.params.create();
        }
        this.params.change(archNode, 0); // set the last change to move range automatically

        this.nodeValue = this.nodeValue.slice(0, offset);
        this.params.change(this, offset);

        this.after(archNode);
        return archNode;
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _applyRulesPropagation: function () {},
    /**
     * Return a string  with clean handling of no-break spaces, which need to be replaced
     * by spaces when inserting next to them, while regular spaces can't ever be successive
     * or at the edges of the node.
     *
     * @param {String} text
     * @returns {String}
     */
    _handleNbsps: function (text) {
        return text.replace(/\u00A0/g, ' ').replace(/  /g, ' \u00A0').replace(/^ | $/g, '\u00A0');
    },
    /**
     * Insert a string in a text node (this) at given offset.
     *
     * @param {String} text
     * @param {Number} offset
     */
    _insertTextInText(text, offset) {
        var start = this.nodeValue.slice(0, offset);
        var end = this.nodeValue.slice(offset);
        var isInPre = !!this.ancestor(this.isPre);
        this.nodeValue = isInPre ? start + text + end : this._handleNbsps(start + text + end);
        this.params.change(this, offset + text.length);
    },
    _removeSide: function (offset, isLeft) {
        if (isLeft && offset <= 0 || !isLeft && offset >= this.length()) {
            var next = this[isLeft ? 'previousSibling' : 'nextSibling']();
            if (!next) {
                var parent = this.parent;
                while (parent && !parent.isRoot()) {
                    var auntie = parent[isLeft ? 'previousSibling' : 'nextSibling']();
                    if (auntie && (!auntie.isBlock() || auntie.isVoid())) {
                        var virtual = this.params.create();
                        parent[isLeft ? 'before' : 'after'](virtual);
                        virtual[isLeft ? 'removeLeft' : 'removeRight'](isLeft ? 0 : virtual.length());
                        virtual.remove();
                        return this.parent.deleteEdge(isLeft, {
                            doNotBreakBlocks: true
                        });
                    }
                    parent = parent.parent;
                }
                return this.parent.deleteEdge(isLeft);
            }
            var nextOffset = isLeft ? (next.childNodes ? next.childNodes.length : next.length()) : 0;
            next[isLeft ? 'removeLeft' : 'removeRight'](nextOffset);
        } else if (this.length() === 1) {
            if (!this.previousSibling() || !this.nextSibling()) {
                this.after(this.params.create());
            }
            this.remove();
        } else {
            offset = isLeft ? offset - 1 : offset;
            this.nodeValue = this.nodeValue.slice(0, offset) + this.nodeValue.slice(offset + 1, this.length());
            this.params.change(this, offset);
        }
    },
});

});
