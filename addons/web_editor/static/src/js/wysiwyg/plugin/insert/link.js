odoo.define('web_editor.wysiwyg.plugin.link', function (require) {
'use strict';

var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var LinkDialog = require('wysiwyg.widgets.LinkDialog');
var Manager = require('web_editor.wysiwyg.plugin.manager');

var $ = require('web_editor.jquery');
var _ = require('web_editor._');

//--------------------------------------------------------------------------
// link
//--------------------------------------------------------------------------

var LinkCreate = AbstractPlugin.extend({
    templatesDependencies: ['/web_editor/static/src/xml/wysiwyg_link.xml'],
    dependencies: [],

    buttons: {
        template: 'wysiwyg.buttons.link',
    },

    blankContent: "Label",

    showLinkDialog: function (value, range) {
        var self = this;
        return new Promise(function (resolve) {
            var linkDialog = new LinkDialog(self, {}, self._getLinkInfo(range));
            linkDialog.on('save', self, self._onSaveDialog.bind(self));
            linkDialog.on('closed', self, resolve);
            linkDialog.open();
        });
    },
    _getLinkInfo: function (range) {
        var nodes = this._getNodesToLinkify(range);
        var ancestor = range.commonAncestor();
        var anchorAncestor = ancestor.ancestor(ancestor.isAnchor);
        var text = this._getTextToLinkify(range, nodes);

        var linkInfo = {
            isAnchor: !!anchorAncestor,
            anchor: anchorAncestor,
            text: text,
            url: anchorAncestor ? anchorAncestor.attributes.href : '',
            needLabel: true, // TODO: see what was done before: !text or option ?
            className: anchorAncestor ? anchorAncestor.className.toString() : '',
        };

        return linkInfo;
    },
    _getNodesToLinkify: function (range) {
        var ancestor = range.commonAncestor();
        var anchorAncestor = ancestor.ancestor(ancestor.isAnchor);
        if (anchorAncestor) {
            return anchorAncestor.childNodes;
        }
        var nodes = [range.scArch];
        if (range.scArch !== range.ecArch) {
            range.scArch.nextUntil(function (next) {
                nodes.push(next);
                return next === range.ecArch;
            });
        }
        return nodes;
    },
    _getTextToLinkify: function (range, nodes) {
        if (nodes.length <= 0) {
            return;
        }

        var anchorAncestor = nodes[0].ancestor(nodes[0].isAnchor);
        var text = "";
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.ancestor(node.isVoidBlock)) {
                text += node.ancestor(node.isVoidBlock).toString();
            } else if (!anchorAncestor && nodes[i].nodeType === 1) {
                // just use text nodes from listBetween
            } else {
                var content = nodes[i].toString({onlyText: true});
                if (!anchorAncestor && i === nodes.length - 1 && node === range.ecArch && node.isText()) {
                    content = content.slice(0, range.eo);
                }
                if (!anchorAncestor && i === 0 && node === range.scArch && node.isText()) {
                    content = content.slice(range.so);
                }
                text += content;
            }
        }
        return text.replace(this.utils.getRegex('space', 'g'), ' ');
    },

    /**
     * @param {Object} linkInfo
     * @param {String} linkInfo.url
     * @param {String} linkInfo.className
     * @param {Object} linkInfo.style
     * @param {Boolean} linkInfo.replaceLink
     * @param {Boolean} linkInfo.isNewWindow
     */
    _onSaveDialog: function (linkInfo) {
        var anchor;
        if (linkInfo.isAnchor) {
            anchor = linkInfo.anchor;
            this.dependencies.Arch.setRange({scID: anchor.id});
            anchor.empty();
        } else {
            anchor = this.dependencies.Arch.parse('<a></a>').firstChild();
        }

        anchor.insert(this.dependencies.Arch.parse(linkInfo.text));
        anchor.attributes.add('href', linkInfo.url);
        anchor.attributes.add('class', linkInfo.className);
        if (linkInfo.isNewWindow) {
            anchor.attributes.add('target', '_blank');
        } else {
            anchor.attributes.remove('target');
        }
        if (linkInfo.style) {
            anchor.attributes.style.update(linkInfo.style);
        }

        if (linkInfo.isAnchor) {
            this.dependencies.Arch.importUpdate([anchor.toJSON()]);
        } else {
            this.dependencies.Arch.insert(anchor);
        }
    },
});

var Link = AbstractPlugin.extend({
    templatesDependencies: ['/web_editor/static/src/xml/wysiwyg_link.xml'],
    dependencies: ['LinkCreate'],

    buttons: {
        template: 'wysiwyg.popover.link',
        events: {
            'dblclick': '_onDblclick',
        },
    },

    get: function (range) {
        var anchor = range && range.scArch.ancestor(range.scArch.isAnchor);
        if (anchor) {
            return range.replace({
                scID: anchor.id,
                so: 0,
                ecID: anchor.id,
                eo: anchor.length(),
            });
        }
    },

    fillEmptyLink: function (link) {
        if (this.dependencies.Arch.isEditableNode(link)) {
            link.textContent = this.dependencies.LinkCreate.blankContent;
        }
    },
    /**
     * @param {Object} linkInfo
     * @param {WrappedRange} range
     * @returns {Promise}
     */
    showLinkDialog: function (value, range) {
        return this.dependencies.LinkCreate.showLinkDialog(value, range);
    },
    /**
     * Remove the current link, keep its contents.
     */
    unlink: function (value, range) {
        var ancestor = range.commonAncestor();
        var anchorAncestor = ancestor.ancestor(ancestor.isAnchor);
        if (anchorAncestor) {
            this.dependencies.Arch.unwrap(anchorAncestor.id);
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @param {jQueryEvent} e
     */
    _onDblclick: function (e) {
        return this.showLinkDialog(null, this.dependencies.Arch.getRange());
    },
});

Manager.addPlugin('Link', Link)
    .addPlugin('LinkCreate', LinkCreate);

return {
    LinkCreate: LinkCreate,
    Link: Link,
};

});