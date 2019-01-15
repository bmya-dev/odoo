odoo.define('wysiwyg.WrappedRange', function (require) {
'use strict';

var Class = require('web.Class');

var WrappedRange = Class.extend({
    /**
     * Note: the range is initialized on the given points.
     *  - If no end point is given:
     *      the range is collapsed on its start point
     *  - If no start offset is given:
     *      the range is selecting the whole start node
     *  - If no start point or start offset or range is given:
     *      get the current range from the selection in the DOM (native range).
     *
     * @param {Object} [range]
     * @param {Node} [range.sc]
     * @param {Number} range.so
     * @param {Node} [range.ec]
     * @param {Number} [range.eo]
     * @param {Node} [ownerDocument] the document containing the range
     * @param {Object} options
     * @param {Function (Node) => Boolean} options.isVoidBlock
     * @param {Function (Node) => Boolean} options.isEditableNode
     * @param {Function (Node) => Boolean} options.isUnbreakableNode
     * 
     */
    init: function (ArchPlugin, range, ownerDocument, options) {
        this.ArchPlugin = ArchPlugin;
        this.document = ArchPlugin.editable.ownerDocument;

        this.options = options || {};
        if (!range) {
            this.getFromSelection();
        } else if (typeof range.so !== 'number') {
            if (range.scArch || range.scID || range.sc) {
                this.getFromNode(range.scArch || range.scID || range.sc);
            } else {
                this.getFromSelection();
            }
        } else {
            this.replace(range);
        }
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Collapse the current range on its end point
     * (or start point if isCollapseToStart is true).
     *
     * @param {Boolean} isCollapseToStart
     * @returns {WrappedRange}
     */
    collapse: function (isCollapseToStart) {
        if (isCollapseToStart) {
            return this.replace({
                scID: this.scID,
                so: this.so,
                ecID: this.scID,
                eo: this.so,
            });
        } else {
            return this.replace({
                scID: this.ecID,
                so: this.eo,
                ecID: this.ecID,
                eo: this.eo,
            });
        }
    },
    /**
     * Get the common ancestor of the start and end
     * points of the current range.
     *
     * @returns {Node}
     */
    commonAncestor: function () {
        return this.scArch.commonAncestor(this.ecArch);
    },
    /**
     * Move the current range to the given node
     * (from its start to its end unless it's a void node).
     *
     * @param {Node} node
     * @returns {WrappedRange}
     */
    getFromNode: function (node) {
        var id, arch, len = 0;
        if (typeof node === 'object' && 'isRoot' in node && 'isUnbreakable' in node) {
            id = null;
            arch = node;
            node = null;
            len = node.length();
        } else if (typeof node === 'number') {
            id = node;
            arch = null;
            node = null;
            len = this.ArchPlugin.getNode(id).length();
        } else {
            if (node.nodeType === 3) {
                len = node.nodeValue.length;
            } else if (node) {
                len = node.childNodes.length;
            }
        }
        var range = {
            scID: id,
            scArch: arch,
            sc: node,
            so: 0,
            ecID: id,
            ecArch: arch,
            ec: node,
            eo: len,
        };
        return this.replace(range);
    },
    /**
     * Move the current range to the current selection in the DOM
     * (the native range).
     *
     * @returns {WrappedRange}
     */
    getFromSelection: function () {
        var selection = this.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return null;
        }
        var nativeRange = selection.getRangeAt(0);
        return this.replace({
            sc: nativeRange.startContainer,
            so: nativeRange.startOffset,
            ec: nativeRange.endContainer,
            eo: nativeRange.endOffset,
        });
    },
    /**
     * Get the current selection from the DOM.
     *
     * @returns {Selection}
     */
    getSelection: function () {
        return this.document.getSelection();
    },
    /**
     * Returns a list of all selected nodes in the range.
     *
     * @returns {Node []}
     */
    getSelectedNodes: function (pred) {
        throw new Error('TODO');
    },
    /**
     * Get the text contents of the current selection
     * from the DOM.
     *
     * @returns {String}
     */
    getSelectedText: function () {
        return this.getSelection().toString();
    },
    /**
     * Returns a list of all selected text nodes in the range.
     * If a predicate function is included, only nodes meeting its
     * conditions will be returned.
     *
     * @param {(Node) => Boolean} [pred]
     * @returns {Node []}
     */
    getSelectedTextNodes: function (pred) {
        throw new Error('TODO');
    },
    /**
     * Return true if the current range is collapsed
     * (its start and end offsets/nodes are the same).
     *
     * @returns {Boolean}
     */
    isCollapsed: function () {
        return this.scID === this.ecID && this.so === this.eo;
    },
    /**
     * Move the range to the given points.
     * It's possible to not pass two complete points:
     * - If only sc (technically, if no so) or if argument[0] is a Node:
     *  the range is a selection of the whole start container
     * - If only sc and so:
     *  the range is collapsed on its start point
     * - If only sc, so and eo (technically, if no so and no eo):
     *  the range is a selection on the start container at given offsets
     *
     * @param {Object|WrappedRange|Node} range
     * @param {Node} [range.sc]
     * @param {Number} [range.so]
     * @param {Node} [range.ec]
     * @param {Number} [range.eo]
     * @returns {WrappedRange}
     */
    replace: function (range) {
        if (!range.so && range.so !== 0) {
            var node = range.sc || range; // allow passing just a node
            range = this.getFromNode(node);
        }

        this.scID = range.scID;
        this.scArch = range.scArch;
        this.sc = range.sc;
        if (!this.scID && this.scArch) {
            this.scID = this.scArch.id;
        }
        if (!this.scID && this.sc) {
            this.scID = this.ArchPlugin.whoIsThisNode(this.sc);
        }
        this.scArch = this.scArch;
        if (!this.scArch && this.scID) {
            this.scArch = this.ArchPlugin.getNode(this.scID);
        }
        this.sc = this.ArchPlugin.getElement(this.scID);

        this.ecID = range.ecID;
        this.ecArch = range.ecArch;
        this.ec = range.ec;
        if (!this.ecID && this.ecArch) {
            this.ecID = this.ecArch.id;
        }
        if (!this.ecID && this.ec) {
            this.ecID = this.ArchPlugin.whoIsThisNode(this.ec);
        }
        if (!this.ecID) {
            this.ecID = this.scID;
        }
        if (!this.ecArch && this.ecID) {
            this.ecArch = this.ArchPlugin.getNode(this.ecID);
        }
        this.ec = this.ArchPlugin.getElement(this.ecID);

        this.so = range.so;
        this.eo = range.eo;

        if (!this.eo && this.eo !== 0) {
            return this.collapse(true);
        }
        return this;
    },
});

return WrappedRange;
});