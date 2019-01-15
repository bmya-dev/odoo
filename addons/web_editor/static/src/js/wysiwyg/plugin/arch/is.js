odoo.define('wysiwyg.plugin.arch_tree', function (require) {
'use strict';
var ArchNode = require('wysiwyg.plugin.arch.node');
function True () { return true; };
function False () { return false; };
var extend = {};
var params = {
    styleTags: [
        'p',
        'td',
        'th',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'pre',
    ],
    formatTags: [
        'abbr',
        'acronym',
        'b',
        'bdi',
        'bdo',
        'big',
        'blink',
        'cite',
        'code',
        'dfn',
        'em',
        'font',
        'i',
        'ins',
        'kbd',
        'mark',
        'nobr',
        'q',
        's',
        'samp',
        'small',
        'span',
        'strike',
        'strong',
        'sub',
        'sup',
        'tt',
        'u',
        'var',
    ],
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
     */
    inlineTags: [
        'a',
        'abbr',
        'acronym',
        'audio',
        'b',
        'bdi',
        'bdo',
        'big',
        'br',
        'button',
        'canvas',
        'cite',
        'code',
        'data',
        'datalist',
        'del',
        'dfn',
        'em',
        'embed',
        'i',
        'iframe',
        'img',
        'input',
        'ins',
        'kbd',
        'label',
        'map',
        'mark',
        'meter',
        'noscript',
        'object',
        'output',
        'picture',
        'progress',
        'q',
        'ruby',
        's',
        'samp',
        'script',
        'select',
        'slot',
        'small',
        'span',
        'strong',
        'sub',
        'sup',
        'svg',
        'template',
        'textarea',
        'time',
        'u',
        'tt',
        'var',
        'video',
        'wbr',
    ],
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
     */
    blockTags: [
        'address',
        'article',
        'aside',
        'blockquote',
        'details',
        'dialog',
        'dd',
        'div',
        'dl',
        'dt',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'li',
        'main',
        'nav',
        'ol',
        'p',
        'pre',
        'section',
        'table',
        'ul',
    ],
};
Object.assign(extend, params);
var isType = {
    /**
     * Return true if the given node is an anchor element (A, BUTTON, .btn).
     *
     * @returns {Boolean}
     */
    isAnchor: function () {
        return (
                this.nodeName === 'a' ||
                this.nodeName === 'button' ||
                this.className && this.className.contains('btn')
            ) &&
            !this.className.contains('fa') &&
            !this.className.contains('o_image');
    },
    /**
     * Return true if the node is an architectural space node.
     *
     * @returns {Boolean}
     */
    isArchitecturalSpace: False,
    /**
     * Returns true if the node is a text node containing nothing
     *
     * @returns {Boolean}
     */
    isBlankText: False,
    /**
     * Returns true if the node is blank.
     * In this context, a blank node is understood as
     * a node expecting text contents (or with children expecting text contents)
     * but without any.
     * If a predicate function is included, the node is NOT blank if it matches it.
     *
     * @param {Function (Node) => Boolean} [isNotBlank]
     * @returns {Boolean}
     */
    isBlankNode: function (isNotBlank) {
        if (this.isVoid() || isNotBlank && isNotBlank(node)) {
            return false;
        }
        if (this.isBlankText()) {
            return true;
        }
        var isBlankNode = true;
        for (var k = 0; k < this.childNodes.length; k++) {
            if (!this.childNodes[k].isBlankNode(isNotBlank)) {
                isBlankNode = false;
                break;
            }
        }
        return isBlankNode;
    },
    /**
     * Return true if the given node is a block.
     *
     * @returns {Boolean}
     */
    isBlock: function () {
        return !this.isInline();
    },
    /**
     * Return true if the given node is a block quote element (BLOCKQUOTE).
     *
     * @returns {Boolean}
     */
    isBlockquote: function () {
        return this.nodeName === 'blockquote';
    },
    /**
     * Return true if the given node is a line break element (BR).
     *
     * @returns {Boolean}
     */
    isBR: False,
    /**
     * Return true if the given node is a table cell element (TD, TH).
     *
     * @returns {Boolean}
     */
    isCell: function () {
        return this.nodeName === 'td' || this.nodeName === 'th';
    },
    isClone: False,
    /**
     * Return true if the given node is a data element (DATA).
     *
     * @returns {Boolean}
     */
    isData: function () {
        return this.nodeName === 'data';
    },
    /**
     * Return true if the given node's type is element (1).
     *
     * @returns {Boolean}
     */
    isElement: True,
    isFragment: False,
    /**
     * Returns true if the node is a "format" node.
     * In this context, a "format" node is understood as
     * an editable block or an editable element expecting text
     * (eg.: p, h1, span).
     *
     * @returns {Boolean}
     */
    isFormatNode: function () {
        return this.styleTags.concat(this.formatTags).indexOf(this.nodeName) !== -1;
    },
    /**
     * Return true if the given node is a horizontal rule element (HR).
     *
     * @returns {Boolean}
     */
    isHr: function () {
        return this.nodeName === 'hr';
    },
    /**
     * Return true if the given node is an inline element.
     *
     * @returns {Boolean}
     */
    isInline: function () {
        return this.inlineTags.concat('font').indexOf(this.nodeName) !== -1;
         // &&
         //    !this.isCell() &&
         //    !this.isEditable() &&
         //    !this.isList() &&
         //    !this.isPre() &&
         //    !this._isHr() &&
         //    !this._isPara() &&
         //    !this._isTable() &&
         //    !this._isBlockquote() &&
         //    !this.isData();
    },
    isInlineFormatNode: function () {
        return this.formatTags.indexOf(this.nodeName) !== -1;
    },
    /**
     * Return true if the given node is an image element (IMG).
     *
     * @returns {Boolean}
     */
    isImg: function () {
        return this.nodeName === 'img';
    },
    isInvisibleBR: False,
    /**
     * Return true if the given node is a list item element (LI).
     *
     * @returns {Boolean}
     */
    isLi: function () {
        return this.nodeName === 'li';
    },
    /**
     * Return true if the given node is a (un-)ordered list element (UL, OL).
     *
     * @returns {Boolean}
     */
    isList: function () {
        return ['ul', 'ol'].indexOf(this.nodeName) !== -1;
    },
    /**
     * Return true if the given node is a paragraph element (DIV, P, LI, H[1-7]).
     *
     * @private
     * @returns {Boolean}
     */
    isPara: function () {
        // Chrome(v31.0), FF(v25.0.1) use DIV for paragraph
        return this.styleTags.concat(['div']).indexOf(this.nodeName) !== -1;
    },
    /**
     * Return true if the given node is a preformatted text element (PRE).
     *
     * @returns {Boolean}
     */
    isPre: function () {
        return this.nodeName === 'pre';
    },
    /**
     * Return true if the current node is the root node.
     */
    isRoot: False,
    /**
     * Return true if the given node is a span element (SPAN).
     *
     * @returns {Boolean}
     */
    isSpan: function () {
        return this.nodeName === 'span';
    },
    /**
     * Return true if the given node is a table element (TABLE).
     *
     * @private
     * @returns {Boolean}
     */
    isTable: function () {
        return this.nodeName === 'table';
    },
    /**
     * Return true if the given node's type is text (3).
     *
     * @returns {Boolean}
     */
    isText: False,
    /**
     * Return true if the given node is a text area element (TEXTAREA).
     *
     * @private
     * @returns {Boolean}
     */
    isTextarea: function () {
        return this.nodeName === 'textarea';
    },
    /**
     *
     * @returns {Boolean}
     */
    isVirtual: False,
    isVisibleBR: False,
    /**
     * Returns true if the node is a text node with visible text.
     *
     * @returns {Boolean}
     */
    isVisibleText: False,
    /**
     * Return true if the given node is a void element (BR, COL, EMBED, HR, IMG, INPUT, ...).
     *
     * @see http://w3c.github.io/html/syntax.html#void-elements
     * @returns {Boolean}
     */
    isVoid: function () {
        return this.params.voidTags.indexOf(this.nodeName) !== -1;
    },
    isVoidBlock: function () {
        return (!this.isBR() && this.isVoid()) || this.params.isVoidBlock(this);
    },
};
Object.assign(extend, isType);
var isInType = {
    /**
     * Return true if the given node is contained within a node of given tag name.
     *
     * @param {Boolean} tag eg: 'B', 'I', 'U'
     * @returns {Boolean}
     */
    isInTag: function (tag) {
        return !!this.ancestor(function (n) {
            return n.nodeName === tag;
        });
    },
};
Object.keys(isType).forEach(function (type) {
    isInType['isIn' + type.slice(2)] = function () {
        return !!this.ancestor(this[type]);
    };
});
Object.assign(extend, isInType);
var isBrowse = {
    isBlockFormattingContext: function () {
        return !this.isInlineFormattingContext();
    },
    /**
     * Return true if the node has no visible content.
     */
    isDeepEmpty: function () {
        if (!this.childNodes || !this.childNodes.length) {
            if (this.isBR()) {
                var prev = this.previousSibling();
                var next = this.nextSibling();
                return (!prev || !prev.isBR()) &&
                    !next || !next.isBR() && !next.isVirtual();
            }
            return this.isEmpty();
        }
        return this.childNodes.every(function (child) {
            return child.isDeepEmpty();
        });
    },
    /**
     * Return true if `node` is a descendent of `ancestor` (or is `ancestor` itself).
     *
     * @param {ArchNode} ancestor
     * @returns {Boolean}
     */
    isDescendentOf: function (ancestor) {
        var node = this;
        while (node) {
            if (node === ancestor) {
                return true;
            }
            node = node.parent;
        }
        return false;
    },
    /**
     * Return true if the given node is empty.
     *
     * @returns {Boolean}
     */
    isEmpty: function () {
        if (this.childNodes.length === 0) {
            return true;
        }
        var child = this.childNodes[0];
        if (this.childNodes.length === 1 && (child.isBR() || child.isText() && child.isEmpty())) {
            return true;
        }
        if (this.isFilledWithOnlyBlank()) {
            return true;
        }
        return false;
    },
    isFilledWithOnlyBlank: function () {
        return this.childNodes.every(function (child) {
            return child.isVirtual() || child.isArchitecturalSpace() || child.isBlankText();
        });
    },
    isInlineFormattingContext: function () {
        if (!this.parent) {
            return false;
        }
        return !this.parent.childNodes || this.parent.childNodes.every(function (child) {
            return child.isInline() || child.isVoid();
        });
    },
    /**
     * Return true if the given node is on a left edge (ignoring invisible text).
     *
     * @returns {Boolean}
     */
    isLeftEdge: function () {
        if (!this.parent) {
            return false;
        }
        var previousSibling = this.parent.childNodes.slice(0, this.index());
        while (previousSibling.length && previousSibling[0].isArchitecturalSpace()) {
            previousSibling.pop();
        }
        return !previousSibling.length;
    },
    /**
     * Return true if the given node is the left-most node of given ancestor.
     *
     * @param {Node} ancestor
     * @returns {Boolean}
     */
    isLeftEdgeOf: function (ancestor) {
        var node = this;
        while (node && node !== ancestor) {
            if (!node.isLeftEdge()) {
                return false;
            }
            node = node.parentNode;
        }
        return true;
    },
    isLeftEdgeOfBlock: function () {
        var node = this;
        while (node && !node.isBlock()) {
            if (!node.isLeftEdge()) {
                return false;
            }
            node = node.parentNode;
        }
        return true;
    },
    /**
     * Return true if the given node is on a right edge (ignoring invisible text).
     *
     * @returns {Boolean}
     */
    isRightEdge: function () {
        if (!this.parent) {
            return false;
        }
        var nextSibling = this.parent.childNodes.slice(this.index() + 1);
        while (nextSibling.length && nextSibling[0].isArchitecturalSpace()) {
            nextSibling.pop();
        }
        return !nextSibling.length;
    },
    /**
     * Return true if the given node is the right-most node of given ancestor.
     *
     * @param {Node} ancestor
     * @returns {Boolean}
     */
    isRightEdgeOf: function (ancestor) {
        var node = this;
        while (node && node !== ancestor) {
            if (!node.isRightEdge()) {
                return false;
            }
            node = node.parentNode;
        }
        return true;
    },
    isRightEdgeOfBlock: function () {
        var node = this;
        while (node && !node.isBlock()) {
            if (!node.isRightEdge()) {
                return false;
            }
            node = node.parentNode;
        }
        return true;
    },
};
Object.assign(extend, isBrowse);
var isEditable = {
    isContentEditable: function () {
        return this.isRoot() || (this.attributes && this.attributes.contentEditable === 'true') || this.params.isEditableNode(this);
    },
    isEditable: function () {
        var archNode = this.ancestor(function () {
            if (this.isRoot()) {
                return true;
            }
            if (this.isContentEditable()) {
                return true;
            }
            if (this.attributes && this.attributes.contentEditable === 'false') {
                return true;
            }
        });
        // if !archNode, the virtual DOM is in a free fragment
        return !archNode || archNode.isContentEditable();
    },
    /**
     * Returns true if the node is a block.
     *
     * @returns {Boolean}
     */
    isNodeBlockType: function () {
        console.warn('todo');
        return false;
        var display = window.getComputedStyle(node).display;
        // All inline elements have the word 'inline' in their display value, except 'contents'
        return display.indexOf('inline') === -1 && display !== 'contents';
    },
    isUnbreakable: function () {
        return ["td", "tr", "tbody", "tfoot", "thead", "table"].indexOf(this.nodeName) !== -1 ||
            this.isContentEditable() ||
            this.params.isUnbreakableNode(this);
    },
}
Object.assign(extend, isEditable);
var isNotType = {};
Object.keys(extend).forEach(function (type) {
    isNotType['isNot' + type.slice(2)] = function () {
        return !this.ancestor(this[type]);
    };
});
Object.assign(extend, isNotType);
ArchNode.include(extend);
});