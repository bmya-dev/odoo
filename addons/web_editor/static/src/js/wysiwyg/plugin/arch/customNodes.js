odoo.define('wysiwyg.plugin.arch.customNodes', function (require) {
'use strict';

var ArchNode = require('wysiwyg.plugin.arch.node');
var TextNode = require('wysiwyg.plugin.arch.text');
var VirtualText = require('wysiwyg.plugin.arch.virtualText');

function True () { return true; };
function False () { return false; };

ArchNode.include = function (argument) {
    throw new Error("Can not use include on ArchNode");
};
TextNode.include = function (argument) {
    throw new Error("Can not use include on TextNode");
};

var customNodes = {
    ArchNode: ArchNode,
    TEXT: TextNode,
    'TEXT-VIRTUAL': VirtualText,
};

customNodes.br = ArchNode.extend({
    addLine: function () {
        this.parent.addLine(this.index() + 1);
    },
    insert: function (archNode, offset) {
        if (archNode.isBR()) {
            this.params.change(archNode, archNode.length());
            this.after(archNode);
            return;
        }
        var prev = this.previousSibling();
        if (archNode.isText() && !archNode.isVirtual() &&
            (!prev || prev.isEmpty() && (!prev.isText() || prev.isVirtual()))) {
            this.params.change(archNode, archNode.length());
            this.before(archNode);
            this.remove();
            return;
        }
        this.parent.insert(archNode, this.index() + 1);
    },
    isBR: True,
    isInvisibleBR: function () {
        return !this.nextSibling();
    },
    /**
     * Return true if the BR is visible (it visibly shows a newline).
     */
    isVisibleBR: function () {
        return !this.isInvisibleBR();
    },
    removeLeft: function () {
        this._removeSide(true);
    },
    removeRight: function () {
        this._removeSide(false);
    },
    split: function () {
        return;
    },

    _removeSide: function (isLeft) {
        // TODO
        // remove only if offset justifies it
        // (isLeft && offset === 1 || !isLeft && !offset)
        var blockAncestor = this.ancestor(this.isBlock);
        var prev = this.previousSibling();
        if (blockAncestor.isDeepEmpty()) {
            blockAncestor.remove();
        } else if (prev) {
            this.params.change(prev, prev.length());
            this.remove();
        } else {
            this.params.change(this);
            this.parent.deleteEdge(isLeft);
        }
    },
});

// Note: this custom node can have any nodeName but
//       contains the class "fa"
// => see ArchPlugin._createArchNode
customNodes.FONTAWESOME = ArchNode.extend({
    isFormatNode: False,
    isIcon: True,
    isInline: True,
    isInlineFormatNode: False,
    isMedia: True,
    isVoid: True,
    removeLeft: function () {
        this.remove();
    },
    removeRight: function () {
        this.remove();
    },
    split: function () {
        return;
    },
});

return customNodes;

});
