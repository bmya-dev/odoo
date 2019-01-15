odoo.define('wysiwyg.plugin.arch.node', function (require) {
'use strict';

var Class = require('web.Class');
function True () { return true; };

var regMultiSpace = /\s\s+/g;
var regSplitStyles = /\s*;\s*/;
var regSplitStyle = /\s*:\s*/;

//////////////////////////////////////////////////////////////

function ClassName (archNode, classNames) {
    this.archNode = archNode;
    this.value = classNames.replace(regMultiSpace, ' ').split(' ');
}
ClassName.prototype = {
    add: function (classNames) {
        classNames.replace(regMultiSpace, ' ').split(' ').forEach(function (className) {
            var index = this.value.indexOf(className);
            if (index === -1) {
                this.value.push(className);
                this.archNode.params.change(this.archNode);
            }
        });
    },
    contains: function (className) {
        return this.value.indexOf(className) !== -1;
    },
    isEqual: function (obj, options) {
        if (!obj) {
            return !this.value.length;
        }
        var self = this;
        var isEqual = true;
        this.value.concat(obj.value).forEach(function (className) {
            if (!isEqual || options && options.blackListClassNames && options.blackListClassNames.indexOf(className) !== -1) {
                return;
            }
            if (self.value.indexOf(className) === -1 || obj.value.indexOf(className) === -1) {
                isEqual = false;
            }
        });
        return isEqual;
    },
    remove: function (classNames) {
        classNames.replace(regMultiSpace, ' ').split(' ').forEach(function (className) {
            var index = this.value.indexOf(className);
            if (index !== -1) {
                this.value.splice(index, 1);
                this.archNode.params.change(this.archNode);
            }
        });
    },
    toString: function () {
        return this.value.sort().join(' ');
    },
    get length () {
        return this.toString().length;
    },
};

//////////////////////////////////////////////////////////////

function Attributes (archNode, attributes) {
    var self = this;
    this.archNode = archNode;
    this.__order__ = [];
    attributes.forEach(function (attribute) {
        self.add(attribute[0], attribute[1]);
    });
}
Attributes.prototype = {
    add: function (name, value) {
        if (this.__order__.indexOf(name) === -1) {
            this.__order__.push(name);
        }
        if (name === 'class') {
            value = new ClassName(this.archNode, value + '');
        }
        if (name === 'style') {
            value = new Style(this.archNode, value + '');
        }
        if (value === null || value === '') {
            return this.remove(name);
        }
        if (this[name] !== value) {
            this[name] = value;
            this.archNode.params.change(this.archNode);
        }
    },
    clear: function () {
        var self = this;
        this.__order__.forEach(function (name) {
            delete self[name];
        });
        this.__order__ = [];
    },
    isEqual: function (obj, options) {
        if (!obj) {
            return !this.__order__.length;
        }
        var self = this;
        var isEqual = true;
        var list = Object.keys(this);
        Object.keys(obj).forEach(function (name) {
            if (list.indexOf(name) === -1) {
                list.push(name);
            }
        });
        list.forEach(function (name) {
            if (!name.indexOf('_') || !isEqual || options && options.blackList && options.blackList.indexOf(name) !== -1) {
                return;
            }
            if (name === 'class') {
                isEqual = self[name].isEqual(obj[name], options);
            } else if (self[name] instanceof Array && obj[name] instanceof Array) {
                isEqual = self[name].every(function (item, index) {
                    return obj[name][index] && item === obj[name][index];
                });
            } else if (self[name] !== obj[name]) {
                isEqual = false;
            }
        });
        return isEqual;
    },
    forEach: function (fn) {
        this.__order__.forEach(fn.bind(this));
    },
    remove: function (name) {
        var index = this.__order__.indexOf(name);
        if (index !== -1) {
            this.__order__.splice(index, 1);
            this.archNode.params.change(this.archNode);
        }
        delete this[name];
    },
    toJSON: function () {
        var self = this;
        var attributes = [];
        this.__order__.forEach(function (name) {
            var value = self[name].toString();
            if (value.length) {
                attributes.push([name, value]);
            }
        });
        return attributes;
    },
    toString: function () {
        var self = this;
        var string = '';
        this.__order__.forEach(function (name) {
            var value = self[name].toString();
            if (!value.length) {
                return;
            }
            if (string.length) {
                string += ' ';
            }
            string += name + '="' + value.replace('"', '\\"') + '"';
        });
        return string;
    },
};

//////////////////////////////////////////////////////////////

function Style (archNode, style) {
    var self = this;
    this.archNode = archNode;
    this.__order__ = [];
    style.trim().split(regSplitStyles).forEach(function (style) {
        var split = style.split(regSplitStyle);
        if (split.length === 2) {
            self.add(split[0], split[1]);
        }
    });
}
Style.prototype = Object.assign({}, Attributes.prototype, {
    add: function (name, value) {
        if (value.trim() === '') {
            return this.remove(name);
        }
        if (this.__order__.indexOf(name) === -1) {
            this.__order__.push(name);
        }
        if (this[name] !== value) {
            this[name] = value;
            this.archNode.params.change(this.archNode);
        }
    },
    update: function (style) {
        var self = this;
        Object.keys(style).forEach (function (key) {
            self.add(key, style[key]);
        });
    },
    toString: function () {
        var self = this;
        var string = '';
        this.__order__.forEach(function (name) {
            var value = self[name].toString();
            if (!value.length) {
                return;
            }
            if (string.length) {
                string += '; ';
            }
            string += name + ':' + value.replace('"', '\\"');
        });
        return string;
    },
});

//////////////////////////////////////////////////////////////

return Class.extend({
    init: function (params, nodeName, attributes) {
        this.params = params;
        this.nodeName = nodeName && nodeName.toLowerCase();
        this.attributes = new Attributes(this, attributes || []);
        if (!this.attributes.class) {
            this.attributes.add('class', '');
        }
        if (!this.attributes.style) {
            this.attributes.add('style', '');
        }
        this.className = this.attributes.class;
        this.style = this.attributes.style;
        this.childNodes = [];

        this.params.change(this, this.length());
    },

    //--------------------------------------------------------------------------
    // Public: Export
    //--------------------------------------------------------------------------

    toJSON: function (options) {
        var data = {};
        if (this.id) {
            data.id = this.id;
        }

        if (this.childNodes) {
            var childNodes = [];
            this.childNodes.forEach(function (archNode) {
                var json = archNode.toJSON(options);
                if (json) {
                    if (json.nodeName || json.nodeValue) {
                        childNodes.push(json);
                    } else if (json.childNodes) {
                        childNodes = childNodes.concat(json.childNodes);
                    }
                }
            });
            if (childNodes.length) {
                data.childNodes = childNodes;
            }
        }

        if (this.isVirtual()) {
            data.isVirtual = true;
            if (!options || !options.keepVirtual) {
                return data;
            }
        }

        if (this.nodeName) {
            data.nodeName = this.nodeName;
        }
        if (this.nodeValue) {
            data.nodeValue = this.nodeValue;
        }
        if (this.attributes) {
            var attributes = this.attributes.toJSON();
            if (attributes.length) {
                data.attributes = attributes;
            }
        }

        return data;
    },
    toString: function (options) {
        options = options || {};
        var string = '';

        if ((!this.isVirtual() || options.keepVirtual) && !options.onlyText) {
            string += '<' + this.nodeName;
            var attributes = this.attributes.toString(options);
            if (attributes.length) {
                string += ' ';
                string += attributes;
            }
            if (options.showIDs) {
                string += ' archID="' + this.id + '"';
            }
            if (this.isVoid() && !this.childNodes.length) {
                string += '/';
            }
            string += '>';
        }
        var i = 0;
        while (i < this.childNodes.length) {
            string += this.childNodes[i].toString(options);
            i++;
        }
        if ((!this.isVirtual() || options.keepVirtual) && !options.onlyText && (!this.isVoid() || this.childNodes.length)) {
            string += '</' + this.nodeName + '>';
        }
        return string;
    },
    clone: function (options) {
        var clone = new this.constructor(this.params, this.nodeName, this.attributes && this.attributes.toJSON(), this.nodeValue);
        clone.isClone = True;
        clone.id = this.id;

        if (this.childNodes) {
            this.childNodes.forEach(function (child) {
                if (!child.isArchitecturalSpace() && (!child.isVirtual() || options && options.keepVirtual)) {
                    var clonedChild = child.clone(options);
                    clonedChild.parent = clone;
                    clone.childNodes.push(clonedChild);
                }
            });
        }
        return clone;
    },

    //--------------------------------------------------------------------------
    // Public: Update (to check if private ?)
    //--------------------------------------------------------------------------

    /**
     * Insert a(n) (list of) archNode(s) after the current archNode
     *
     * @param {ArchNode|ArchNode []} archNode
     */
    after: function (archNode) {
        if (Array.isArray(archNode)) {
            return archNode.slice().forEach(this.after.bind(this));
        }
        return this.parent.insertAfter(archNode, this);
    },
    /**
     * Insert a(n) (list of) archNode(s) before the current archNode
     *
     * @param {ArchNode|ArchNode []} archNode
     */
    before: function (archNode) {
        if (Array.isArray(archNode)) {
            return archNode.slice().forEach(this.before.bind(this));
        }
        return this.parent.insertBefore(archNode, this);
    },
    /**
     * Insert a(n) (list of) archNode(s) at the end of the current archNode's children
     *
     * @param {ArchNode|ArchNode []} archNode
     */
    append: function (archNode) {
        if (Array.isArray(archNode)) {
            return archNode.slice().forEach(this.append.bind(this));
        }
        return this._changeParent(archNode, this.childNodes.length);
    },
    /**
     * Delete the edges between this node and its siblings of which it's at the
     * left or right edge (given the value of `isLeft`), from top to bottom.
     *
     * @param {Boolean} isLeft true to delete the left edge
     * @param {Object} [options]
     * @param {Boolean} [options.doNotBreakBlocks] true to prevent the merging of block-type nodes
     * @param {Boolean} [options.doNotRemoveEmpty] true to prevent the removal of empty nodes
     * @param {Boolean} [options.mergeOnlyIfSameType] true to prevent the merging of nodes of different types (eg p & h1)
     */
    deleteEdge: function (isLeft, options) {
        options = options || {};
        var node = this;
        var edges = [];
        while (node && !node.isRoot() && (!options.doNotBreakBlocks || !node.isBlock())) {
            if (!node.isText()) {
                edges.push(node);
            }
            if (!node.parent || !node[isLeft ? 'isLeftEdgeOf' : 'isRightEdgeOf'](node.parent)) {
                break;
            }
            node = node.parent;
        }
        edges.reverse().slice().forEach(function (node) {
            var next = node[isLeft ? 'previousSibling' : 'nextSibling']();
            if (!next) {
                return;
            }
            if (!options.doNotRemoveEmpty && node.isDeepEmpty()) {
                if (next.isVoid() || next.isText()) {
                    node.unwrap();
                    return;
                }
                node._mergeInto(next, isLeft);
                return;
            }

            if (node.isFormatNode() && next.isList()) {
                next = next[isLeft ? 'lastChild' : 'firstChild'](function (descendent) {
                    return descendent.parent.isLi();
                });
                if (next.isText()) {
                    next = next.isText() ? next.wrap('p') : next;
                }
                next[isLeft ? 'after' : 'before'](node);
                options.mergeOnlyIfSameType = true;
            }
            if (!next.isText() && !next.isVoid() && next.childNodes.length === 1 && next.firstChild().isBR()) {
                next.empty();
            }
            var areMergeableDifferentTypes = !options.mergeOnlyIfSameType && node.isBlock() && next.isFormatNode();
            if (areMergeableDifferentTypes || node._isMergeableWith(next)) {
                if (areMergeableDifferentTypes && node.nextSibling() === next) {
                    next._mergeInto(node, true); // non-similar merging always happens from right to left
                } else {
                    node._mergeInto(next, isLeft);
                }
            }
        });
    },
    _isMergeableWith: function (node) {
        var haveSameNodeNames = this.nodeName === node.nodeName;
        var haveSameAttributes = this.attributes.isEqual(node.attributes);
        var haveSameClasses = this.className.isEqual(node.className);
        return haveSameNodeNames && haveSameAttributes && haveSameClasses;
    },
    insertAfter: function (archNode, ref) {
        return this._changeParent(archNode, ref.index() + 1);
    },
    insertBefore: function (archNode, ref) {
        return this._changeParent(archNode, ref.index());
    },
    _mergeInto: function (next, isLeft) {
        var childNodes = this.childNodes.slice();
        next[isLeft ? 'append' : 'prepend'](isLeft ? childNodes : childNodes.reverse());
        this.remove();
    },
    /**
     * Insert a(n) (list of) archNode(s) at the beginning of the current archNode's children
     *
     * @param {ArchNode|ArchNode []} archNode
     */
    prepend: function (archNode) {
        if (Array.isArray(archNode)) {
            return archNode.slice().forEach(this.prepend.bind(this));
        }
        return this._changeParent(archNode, 0);
    },
    empty: function () {
        if (!this.isEditable()) {
            console.warn("cannot empty a non editable node");
            return;
        }
        this.childNodes.slice().forEach(function (archNode) {
            archNode.remove();
        });
        this.params.change(this, 0);
    },
    remove: function () {
        if (this.parent) {
            if (!this.parent.isEditable()) {
                console.warn("cannot remove a node in a non editable node");
                return;
            }
            var offset = this.index();
            this.parent.childNodes.splice(offset, 1);
            this.params.change(this.parent, offset);
        }
        this.params.remove(this);
        this.parent = null;
        this.__removed = true;
    },
    removeLeft: function (offset) {
        if (!this.childNodes.length) {
            return this.remove();
        }
        return this.childNodes[offset - 1].removeLeft(this.childNodes[offset - 1].length());
    },
    removeRight: function (offset) {
        if (!this.childNodes.length) {
            return this.remove();
        }
        return this.childNodes[offset].removeRight(0);
    },
    split: function (offset) {
        if (this.isUnbreakable()) {
            console.warn("cannot split an unbreakable node");
            return;
        }
        if (!this.isEditable()) {
            console.warn("cannot split a non editable node");
            return;
        }

        var Constructor = this.constructor;
        var archNode = new Constructor(this.params, this.nodeName, this.attributes ? this.attributes.toJSON() : []);
        this.params.change(archNode, 0);

        if (this.childNodes) {
            var childNodes = this.childNodes.slice(offset);
            while (childNodes.length) {
                archNode.prepend(childNodes.pop());            
            }
        }

        this.after(archNode);
        return archNode;
    },
    splitUntil: function (ancestor, offset) {
        if (this === ancestor || this.isUnbreakable()) {
            return this;
        }
        var right = this.split(offset);
        return right.parent.splitUntil(ancestor, right.index());
    },
    unwrap: function () {
        this.before(this.childNodes);
        this.remove();
    },
    wrap: function (nodeName) {
        var wrapper = this.params.create(nodeName);
        this.before(wrapper);
        wrapper.append(this);
        return wrapper;
    },

    //--------------------------------------------------------------------------
    // Public: Update
    //--------------------------------------------------------------------------

    insert: function (archNode, offset) {
        if (!this.isEditable()) {
            console.warn("can not split a not editable node");
            return;
        }
        if (this.isVoid()) {
            this.parent.insert(archNode, this.index());
            return;
        }
        this.params.change(archNode, archNode.length());
        var ref = this.childNodes[offset];
        if (ref) {
            this.insertBefore(archNode, ref);
        } else {
            this.append(archNode);
        }
    },
    addLine: function (offset) {
        if (!this.ancestor(this.isPara)) {
            return;
        }

        if (!this.isEditable()) {
            console.warn("can not split a not editable node");
            return;
        }

        var child = this.childNodes[offset];
        var isChildRightEdgeVirtual = child && child.isRightEdge() && child.isVirtual();
        if (isChildRightEdgeVirtual && !this.isUnbreakable() && (this.isFormatNode() || this.isPara())) {
            var virtual = this.childNodes[offset];
            this.after(virtual);
            if (this.isEmpty()) {
                this.append(this.params.create());
            }
            return virtual.parent.addLine(virtual.index());
        }
        var next = this.split(offset);
        if (!next) {
            this.insert(this.params.create('br'), offset);
            return ;
        }

        return this.parent.addLine(next.index());
    },

    //--------------------------------------------------------------------------
    // Public: Browse
    //--------------------------------------------------------------------------

    childNodesIDs: function () {
        var ids = [];
        if (this.childNodes) {
            this.childNodes.forEach(function (node) {
                ids.push(node.id);
            });
        }
        return ids;
    },
    firstChild: function (fn) {
        var first = this.childNodes && this.childNodes.length ? this.childNodes[0] : null;
        if (!first || !fn || fn.call(this, first)) {
            return first;
        }
        return first.firstChild(fn);
    },
    index: function (options) {
        return this.parent.childNodes.indexOf(this);
    },
    lastChild: function (fn) {
        var last = this.childNodes && this.childNodes.length ? this.childNodes[this.childNodes.length - 1] : null;
        if (!last || !fn || fn.call(this, last)) {
            return last;
        }
        return last.lastChild(fn);
    },
    nextSibling: function (fn) {
        if (!this.parent) {
            return false;
        }
        var next = this.parent.childNodes[this.index() + 1];
        return next && next._nextSibling(fn);
    },
    previousSibling: function (fn) {
        if (!this.parent) {
            return false;
        }
        var prev = this.parent.childNodes[this.index() - 1];
        return prev && prev._previousSibling(fn);
    },
    /**
     * Return a list of child nodes that are not architectural space.
     */
    visibleChildren: function () {
        if (!this.childNodes) {
            return;
        }
        var visibleChildren = [];
        this.childNodes.forEach(function (child) {
            if (!child.isArchitecturalSpace()) {
                visibleChildren.push(child);
            }
        });
        return visibleChildren;
    },
    ancestor: function (fn) {
        var parent = this;
        while (parent && !fn.call(parent, parent)) {
            parent = parent.parent;
        }
        return parent;
    },
    contains: function (archNode) {
        var parent = archNode.parent;
        while (parent && parent !== this) {
            parent = parent.parent;
        }
        return !!parent;
    },
    commonAncestor: function (otherArchNode) {
        var ancestors = this.listAncestor();
        for (var n = otherArchNode; n; n = n.parent) {
            if (ancestors.indexOf(n) > -1) {
                return n;
            }
        }
        return null; // difference document area
    },
    listAncestor: function (pred) {
        var ancestors = [];
        this.ancestor(function (el) {
            if (!el.isContentEditable()) {
                ancestors.push(el);
            }
            return pred ? pred(el) : false;
        });
        return ancestors;
    },
    next: function () {
        return this._prevNextUntil(false);
    },
    /**
     * @param {function} fn called on this and get the next point as param
     *          return true if the next node is available
     * @returns {ArchNode}
     **/
    nextUntil: function (fn) {
        return this._prevNextUntil(false, fn);
    },
    prev: function () {
        return this._prevNextUntil(true);
    },
    prevUntil: function (fn) {
        return this._prevNextUntil(true, fn);
    },
    length: function () {
        return this.childNodes.length;
    },
    path: function (ancestor) {
        var path = [];
        var node = this;
        while (node.parent && node.parent !== ancestor) {
            path.unshift(node.index());
            node = node.parent;
        }
        return path;
    },
    /**
     * Get a representation of the Arch with architectural space, node IDs and virtual nodes
     */
    repr: function () {
        return this.parent && this.parent.repr();
    },
    getNode: function (id) {
        if (this.id === id) {
            return this;
        }
        if (this.childNodes) {
            for (var k = 0, len = this.childNodes.length; k < len; k++) {
                var archNode = this.childNodes[k].getNode(id);
                if (archNode) {
                    return archNode;
                }
            }
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _changeParent: function (archNode, index) {
        var self = this;
        if (this.isVoid()) {
            throw new Error("You can't add a node into a void node");
        }

        if (!this.childNodes) {
            throw new Error("You can't add a child into this node");
        }

        if (!this.isEditable()) { // id is setted only if the node is contains in the root
            console.warn("cannot add a node into a non editable node");
            return;
        }
        if (archNode.parent && !archNode.parent.isEditable()) {
            console.warn("cannot remove a node from a non editable node");
            return;
        }

        if (this.ancestor(function (node) { return node === archNode;})) {
            console.warn("cannot add a node into itself");
            return;
        }

        if (archNode.isFragment()) {
            var ids = [];
            archNode.childNodes.slice().forEach(function (archNode) {
                ids = ids.concat(self._changeParent(archNode, index++));
            });
            archNode.remove();
            return ids;
        }

        if (archNode.parent) {
            if (archNode.parent === this && archNode.index() < index) {
                index--;
            }
            var i = archNode.parent.childNodes.indexOf(archNode);
            this.params.change(archNode.parent, i);
            archNode.parent.childNodes.splice(i, 1);
        }

        archNode.parent = this;
        this.childNodes.splice(index, 0, archNode);
        if (archNode.__removed) {
            this.params.change(archNode, 0);
            archNode.__removed = false;
        }

        this.params.add(archNode);

        this.params.change(this, index);
    },
    _nextSibling: function (fn) {
        if (this.isEditable() && (!fn || fn(this))) {
            return this;
        } else {
            return this.nextSibling(fn);
        }
    },
    _previousSibling: function (fn) {
        if (this.isEditable() && (!fn || fn(this))) {
            return this;
        } else {
            return this.previousSibling(fn);
        }
    },
    /**
     * Return the next or previous node until predicate hit or end of tree,
     * following a pre-order tree traversal.
     * This ignores architectural space and prevents getting out of an unbreakable node.
     * If no suitable previous/next node is found, a virtual text node will be inserted and
     * returned. If the insertion is not allowed, the last found legal node is returned.
     * If no predicate function is provided, just give the previous/next node.
     *
     * @param {boolean} isPrev true to get the previous node, false for the next node
     * @param {function (ArchNode)} [pred] called on this and takes the previous/next node as argument
     *          return true if the requested node was found
     * @returns {ArchNode}
     **/
    _prevNextUntil: function (isPrev, pred) {
        var next = this._walk(isPrev);
        if (!next || next.isUnbreakable()) {
            if (this.isEditable() && !this.isRoot() && !this.isClone()) {
                var virtualText = this.params.create();
                this[isPrev ? 'before' : 'after'](virtualText);
                return virtualText;
            }
            return this;
        }
        if (next.isArchitecturalSpace()) {
            return next._prevNextUntil(isPrev, pred);
        }
        if (!pred || pred.call(next, next)) {
            return next;
        }
        return next._prevNextUntil(isPrev, pred);
    },
    /**
     * Return the next or previous node (if any), following a pre-order tree traversal.
     * Return null if no node was found.
     * If a function is provided, apply it to the node that was found, if any.
     *
     * @param {Boolean} isPrev true to get the previous node, false for the next node
     * @param {Function (ArchNode)} [fn] called on this and takes the previous/next node as argument
     */
    _walk: function (isPrev, fn) {
        var next = this[isPrev ? '_walkPrev' : '_walkNext']();
        if (next && fn) {
            fn.call(this, next);
        }
        return next;
    },
    /**
     * Return the next node (if any), following a pre-order tree traversal.
     * Return null if no node was found.
     *
     * @returns {ArchNode|null}
     */
    _walkNext: function () {
        if (this.childNodes && this.childNodes.length) {
            return this.firstChild();
        }
        var next = this;
        while (next.parent) {
            var parent = next.parent;
            var index = next.index();
            if (parent && parent.childNodes.length > index + 1) {
                return parent.childNodes[index + 1];
            }
            next = parent;
        }
        return null;
    },
    /**
     * Return the previous node (if any), following a pre-order tree traversal.
     * Return null if no node was found.
     *
     * @returns {ArchNode|null}
     */
    _walkPrev: function () {
        var prev = this;
        if (prev.parent) {
            var parent = prev.parent;
            var index = prev.index();
            if (parent && index - 1 >= 0) {
                prev = parent.childNodes[index - 1];
                while (prev.childNodes && prev.childNodes.length) {
                    prev = prev.lastChild();
                }
                return prev;
            }
            return parent;
        }
        return null;
    },
});

});
