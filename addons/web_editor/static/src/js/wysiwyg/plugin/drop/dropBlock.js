odoo.define('web_editor.wysiwyg.plugin.dropblock', function (require) {
'use strict';

var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var Manager = require('web_editor.wysiwyg.plugin.manager');


var DropBlock = AbstractPlugin.extend({
    templatesDependencies: ['/web_editor/static/src/xml/wysiwyg_dropblock.xml'],
    buttons: {
        template: 'wysiwyg.buttons.dropblock',
        active: '_isActive',
        enabled: '_enabled',
    },

    sidebarEvents: {
        'mousedown': '_onMouseDownBlock',
        'touchstart': '_onTouchStartBlock',
    },
    documentDomEvents: {
        'mousemove': '_onMouseMove',
        'mouseup': '_onMouseUp',
        'touchstart': '_onTouchStart',
        'touchmove': '_onTouchMove',
        'touchend': '_onTouchEnd',
        'touchcancel': '_onTouchEnd',
    },
    editableDomEvents: {
        'mouseenter': '_onMouseEnter',
        'mouseleave': '_onMouseLeave',
        'mousedown we3-dropblock-buttons we3-button': '_onMouseDownHandleButton',
        'touchstart we3-dropblock-buttons we3-button': '_onTouchStartHandleButton',
    },
    pluginEvents: {
        'item': '_onDragAndDropNeedItems',
        'dropzone': '_onDragAndDropNeedDropZone',
        'drag': '_onDragAndDropStart',
        'dragAndDrop': '_onDragAndDropMove',
        'drop': '_onDragAndDropEnd',
    },

    /**
     *
     * @override
     *
     * @param {Object} parent
     * @param {Object} params
     *
     * @param {Object} params.dropblocks
     * @param {string} params.dropblocks.title
     * @param {Object[]} params.dropblocks.blocks
     * @param {string} params.dropblocks.blocks.title
     * @param {string} params.dropblocks.blocks.thumbnail
     * @param {string} params.dropblocks.blocks.content
     * @param {Object} params.dropblockOpenDefault
     * @param {Object} params.dropblockStayOpen
     * @param {Object} params.autoCloseDropblock
     **/
    init: function (parent, params) {
        this._super.apply(this, arguments);

        this._origin = document.createElement('we3-dropblock-dropzone-origin');
        this._origin.setAttribute('contentEditable', "false");
        this._blockContainer = document.createElement('we3-dropblock');
        if (this.options.dropblocks) {
            this._createBlocks(this.options.dropblocks);
        }
        params.insertBeforeEditable(this._blockContainer);

        this._dragAndDropMoveSearch = this._throttled(50, this._dragAndDropMoveSearch.bind(this));

        this._moveAndDropButtons = [];
    },
    start: function () {
        var self = this;
        var promise = this._super();
        if (!this.options.dropblocks) {
            promise = promise.then(this._loadTemplateBlocks.bind(this, this.options.dropBlockTemplate || 'wysiwyg.dropblock.defaultblocks'));
        }
        if (this.options.dropblockStayOpen || this.options.dropblockOpenDefault) {
            this.open();
        }
        return promise.then(this._bindEvents.bind(this));
    },
    /**
     * Prepares the page so that it may be saved:
     * - Asks the snippet editors to clean their associated snippet
     * - Remove the 'contentEditable' attributes
     **/
    saveEditor: function () {
    },
    blurEditor: function () {
        this._dragAndDropEnd();
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    close: function () {
        if (!this.options.dropblockStayOpen) {
            this.isOpen = false;
            this._blockContainer.style.display = 'none';
        }
    },
    open: function () {
        this.isOpen = true;
        this._blockContainer.style.display = 'block';
    },
    /**
     * Toggle the code view
     **/
    toggle: function () {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     *
     * @private
     **/
    _bindEvents: function () {
        this._bindDOMEvents(this._blockContainer, this.sidebarEvents);
    },
    /**
     * 
     * @params {object[]}   dropblocks
     * @params {string}     dropblocks[0].title
     * @params {object[]}   dropblocks[0].blocks
     * @params {string}     dropblocks[0].blocks.title
     * @params {string}     dropblocks[0].blocks.thumbnail
     * @params {string}     dropblocks[0].blocks.content
     **/
    _createBlocks: function (dropblocks) {
        var self = this;
        var blocks = [];
        var blockContainer = this._blockContainer;
        dropblocks.forEach(function (groupBlocks) {
            var nodeBlocks = document.createElement('we3-blocks');

            var title = document.createElement('we3-title');
            title.innerHTML = groupBlocks.title;
            nodeBlocks.appendChild(title);

            groupBlocks.blocks.forEach(function (block) {
                var blockNode = document.createElement('we3-block');
                var thumbnail = self._createBlockThumbnail(block);
                blocks.push(blockNode);
                nodeBlocks.appendChild(blockNode);
                blockNode.appendChild(thumbnail);
                blockNode.setAttribute('data-content', block.content);
            });

            blockContainer.appendChild(nodeBlocks);
        });
        this._blockNodes = blocks;
    },
    _createBlockThumbnail: function (thumbnailParams) {
        var thumbnail = document.createElement('we3-dropblock-thumbnail');
        var preview = document.createElement('we3-preview');
        preview.style.backgroundImage = 'url(' + thumbnailParams.thumbnail + ')';
        var title = document.createElement('we3-title');
        title.innerHTML = thumbnailParams.title;
        thumbnail.appendChild(preview);
        thumbnail.appendChild(title);
        return thumbnail;
    },
    /**
     * Return true if the codeview is active
     *
     * @returns {Boolean}
     **/
    _enabled: function () {
        return true;
    },
    /**
     * Return true if the container is open
     *
     * @returns {Boolean}
     **/
    _isActive: function () {
        return this.isOpen;
    },
    /**
     * The template must have the same structure created by '_createBlocks'
     * method
     * 
     * @params {string} dropBlockTemplate
     **/
    _loadTemplateBlocks: function (dropBlockTemplate) {
        this._blockContainer.innerHTML = this.options.renderTemplate('DropBlock', dropBlockTemplate);
        this._blockNodes = this._blockContainer.querySelectorAll('we3-block');
    },
    _dragAndDropStartCloneSidebarElements: function (block) {
        var thumbnail = block.querySelector('we3-dropblock-thumbnail');
        var box = thumbnail.getBoundingClientRect();
        var content = block.getAttribute('data-content');
        var el = document.createElement('we3-content');
        el.innerHTML = content;
        var childNodes = el.childNodes;

        this._dragAndDrop = {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            thumbnail: this.utils.clone(thumbnail),
            elements: [].slice.call(childNodes),
            content: content,
        };
    },
    _dragAndDropStartCloneEditableElements: function (block, id, button) {
        var box = button.parentNode.getBoundingClientRect();
        var content = document.createElement('we3-content');
        content.innerHTML = block.outerHTML;
        var buttons = content.querySelector('we3-dropblock-buttons');
        buttons.parentNode.removeChild(buttons);
        var childNodes = content.childNodes;

        this._dragAndDrop = {
            width: box.width,
            height: box.height,
            thumbnail: button.parentNode,
            elements: [].slice.call(childNodes),
            content: block.outerHTML,
            id: id,
        };
    },
    _dragAndDropStart: function (clientX, clientY) {
        this._origin.appendChild(this._dragAndDrop.thumbnail);
        this._dragAndDrop.thumbnail.style.width = this._dragAndDrop.width + 'px';
        this._dragAndDrop.thumbnail.style.height = this._dragAndDrop.height + 'px';
        this._enabledDropZones = [];
        this._createDropZoneOriginPosition();
        this._dragAndDropMove(clientX, clientY);
        var dropZones = [];
        this.trigger('dropzone', Object.assign(this._dragAndDrop), dropZones);
        this.trigger('drag', Object.assign(this._dragAndDrop), dropZones);
        this.editable.setAttribute('contentEditable', 'false');
    },
    _dragAndDropMove: function (clientX, clientY) {
        if (!this._dragAndDrop) {
            return;
        }
        var originBox = this._origin.getBoundingClientRect()
        this._dragAndDrop.dx = clientX - originBox.left;
        this._dragAndDrop.dy = clientY - originBox.top;

        var handlePosition = this.editable.getBoundingClientRect();
        var left = this._dragAndDrop.left = clientX - handlePosition.left - this._dragAndDrop.width/2;
        var top = this._dragAndDrop.top = clientY - handlePosition.top - this._dragAndDrop.height/2;
        this._dragAndDrop.thumbnail.style.left = (left >= 0 ? '+' : '') + left + 'px';
        this._dragAndDrop.thumbnail.style.top = (top >= 0 ? '+' : '') + top + 'px';
    },
    _dragAndDropMoveSearch: function () {
        if (!this._dragAndDrop) {
            return;
        }
        var left = this._dragAndDrop.dx;
        var top = this._dragAndDrop.dy;

        var select, size = Infinity;
        this._enabledDropZones.forEach(function (dropzone) {
            var dtop = dropzone.top - 5;
            var dbottom = dropzone.top + dropzone.height + 5;
            var dleft = dropzone.left - 5;
            var dright = dropzone.left + dropzone.width + 5;
            if (!dropzone.vertical) {
                dtop -= dropzone.height/2;
                dbottom -= dropzone.height/2;
            }
            if (top >= dtop && top <= dbottom &&
                left >= dleft && left <= dright) {
                var dsize = Math.pow(dropzone.top - top, 2) + Math.pow(dropzone.left - top, 2);
                if (dsize < size) {
                    dsize = size;
                    select = dropzone;
                }
            }
        });

        if (select) {
            if (this._selectedDragAndDrop !== select.node) {
                this.trigger('dragAndDrop', Object.assign(this._dragAndDrop), select.node, this._selectedDragAndDrop);
                this._selectedDragAndDrop = select.node;
            }
        } else if (this._selectedDragAndDrop) {
            this.trigger('dragAndDrop', Object.assign(this._dragAndDrop), null, this._selectedDragAndDrop);
            this._selectedDragAndDrop = null;
        }
    },
    _dragAndDropEnd: function (ev) {
        this.editable.setAttribute('contentEditable', 'true');

        if (!this._dragAndDrop) {
            return;
        }

        this._origin.removeChild(this._dragAndDrop.thumbnail);
        this._removeMoveAndDropButtons();

        if (this._dragAndDropMoveBlock) {
            this._dragAndDropMoveBlock();
            this._dragAndDropMoveBlock = null;
        }

        var id, position;
        if (this._selectedDragAndDrop) {
            this._dragAndDrop.elements.forEach(function (node) {
                node.parentNode.removeChild(node);
            });
            id = +this._selectedDragAndDrop.getAttribute('data-id');
            position = this._selectedDragAndDrop.getAttribute('data-position');
            this._selectedDragAndDrop = null;
        }

        this._removeDropZoneOriginPosition();

        var dragAndDrop = this._dragAndDrop;
        this._dragAndDrop = null;

        this._removeDropZones();

        this.trigger('drop', dragAndDrop, id, position);
    },
    _removeDropZones: function () {
        this._enabledDropZones.forEach(function (zone) {
            zone.node.parentNode && zone.node.parentNode.removeChild(zone.node);
        });
        this._enabledDropZones = [];
    },

    /*
    _insertDropZoneChild: function (parent) {
        var self = this;
        var css = this.window.getComputedStyle(parent);
        var parentCss = this.window.getComputedStyle(parent.parentNode);
        var float = css.float || css.cssFloat;
        var parentDisplay = parentCss.display;
        var parentFlex = parentCss.flexDirection;
        var dropzones = [];

        function isFullWidth (child) {
            return child.parent.clientWidth === child.clientWidth;
        }
        function _insertDropZoneChildOrientation (parent, child, insert) {
            var dropzone;
            var test = !!(child && ((!child.tagName && child.textContent.match(/\S/)) || child.tagName === 'BR'));
            if (test) {
                dropzone = self._insertDropZoneVertical(child, insert);
            } else if (float === 'left' || float === 'right' || (parentDisplay === 'flex' && parentFlex === 'row')) {
                dropzone = isFullWidth(parent) ? self._insertDropZoneHorizontal(child, insert) : self._insertDropZoneVertical(child, insert);
                dropzone.style.float = float;
            }
        }

        _insertDropZoneChildOrientation(parent, parent.lastChild, function (child) {
            dropzones.push(child);
            parent.appendChild(child);
        });
        _insertDropZoneChildOrientation(parent, parent.firstChild, function (child, test) {
            dropzones.push(child);
            self.utils.prependChild(parent, child);
        });

        return dropzones;
    },
    */
    _removeDropZoneOriginPosition: function () {
        this._origin.parentNode && this._origin.parentNode.removeChild(this._origin);
    },
    /**
     *
     * @params {enum<before|after|append|prepend>} position
     * @params {Node} node
     * @params {boolean} [vertical]
     * @returns {Node}
     **/
    _createDropZone: function (position, node, vertical) {
        var id = this.dependencies.Arch.whoIsThisNode(node);
        if (!id) {
            return;
        }

        var dropzone = document.createElement('we3-dropblock-dropzone');
        dropzone.setAttribute('contentEditable', "false");
        dropzone.setAttribute('data-position', position);
        dropzone.setAttribute('data-id', id);

        if (vertical) {
            dropzone.setAttribute('orientation', 'vertical');
            dropzone.style.float = 'node';
            dropzone.style.display = 'inline-block';
        }
        switch (position) {
            case 'before':
                if (node.previousSibling && node.previousSibling.tagName === 'WE3-DROPBLOCK-DROPZONE') {
                    return;
                }
                node.parentNode.insertBefore(dropzone, node);
                break;
            case 'after':
                if (node.nextSibling && node.nextSibling.tagName === 'WE3-DROPBLOCK-DROPZONE') {
                    return;
                }
                if (node.nextSibling) {
                    node.parentNode.insertBefore(dropzone, node.nextSibling);
                } else {
                    node.parentNode.appendChild(dropzone);
                }
                break;
            case 'append':
                if (node.lastChild && node.lastChild.tagName === 'WE3-DROPBLOCK-DROPZONE') {
                    return;
                }
                node.appendChild(dropzone);
                break;
            case 'prepend':
                if (node.firstChild && node.firstChild.tagName === 'WE3-DROPBLOCK-DROPZONE') {
                    return;
                }
                var firstChild = node.firstChild;
                if (firstChild.tagName === 'WE3-DROPBLOCK-DROPZONE-ORIGIN') {
                    firstChild = firstChild.nextSibling;
                }
                if (firstChild) {
                    node.insertBefore(dropzone, firstChild);
                } else {
                    node.appendChild(dropzone);
                }
                break;
        }

        this._getDropZoneBoundingClientRect(dropzone, vertical);

        // _insertDropZoneChild => dropzone size
    },
    _getDropZoneBoundingClientRect: function (dropzone, vertical) {
        var box = dropzone.getBoundingClientRect();
        this._enabledDropZones.push({
            node: dropzone,
            vertical: dropzone.getAttribute('orientation') === 'vertical',
            top: box.top + (vertical ? 0 : 20) - this._originBox.top,
            left: box.left - this._originBox.left,
            width: box.width,
            height: box.height,
        });
    },
    _createDropZones: function (dropZones) {
        var self = this;
        dropZones.forEach(function (dropZone) {
            if (dropZone.dropIn) {
                dropZone.dropIn.forEach(function (dropIn) {
                    [].slice.call(dropIn.children).map(function (child) {
                        self._createDropZone('before', child);
                    });
                    self._createDropZone('append', dropIn);
                });
            }
            if (dropZone.dropNear) {
                dropZone.dropNear.forEach(function (dropNear) {
                    self._createDropZone('before', dropNear);
                    self._createDropZone('after', dropNear);
                });
            }
        });
    },
    _createDropZoneOriginPosition: function () {
        if (this.editable.firstChild) {
            this.editable.insertBefore(this._origin, this.editable.firstChild);
        } else {
            this.editable.appendChild(this._origin);
        }
        this._originBox = this._origin.getBoundingClientRect();
    },
    _createMoveAndDropButtons: function () {
        var self = this;
        this._moveAndDropButtons = [];
        var items = [];
        this.trigger('item', items);

        items.forEach(function (target) {
            var buttons = document.createElement('we3-dropblock-buttons');
            var button = document.createElement('we3-button');
            button.textContent = '';
            buttons.appendChild(button);
            if (target.firstChild) {
                target.insertBefore(buttons, target.firstChild);
            } else {
                target.appendChild(buttons);
            }
            self._moveAndDropButtons.push(buttons);
        });
        this._hasMoveAndDropButtons = true;
    },
    _removeMoveAndDropButtons: function () {
        this._hasMoveAndDropButtons = false;
        this._moveAndDropButtons.forEach(function (el) {
            el.parentNode && el.parentNode.removeChild(el);
        });
        this._moveAndDropButtons = [];
    },
    _eventStartNewBlock: function (target) {
        this._dragAndDropEnd();
        var block;
        this._blockNodes.forEach(function (blockNode) {
            if (blockNode.contains(target)) {
                block = blockNode;
            }
        });
        if (block) {
            this._dragAndDropStartCloneSidebarElements(block);
            return true;
        }
    },
    _eventStartMoveBlock: function (button) {
        var block = button.parentNode.parentNode;
        var id = this.dependencies.Arch.whoIsThisNode(block);
        if (!id || id === 1) {
            return;
        }
        this._dragAndDropStartCloneEditableElements(block, id, button);

        this._removeMoveAndDropButtons();

        var nextSibling = block.nextSibling;
        var parent = block.parentNode;
        parent.removeChild(block);
        this._dragAndDropMoveBlock = function reset () {
            if (nextSibling) {
                parent.insertBefore(block, nextSibling);
            } else {
                parent.appendChild(block);
            }
        };
        return id;
    },

    //--------------------------------------------------------------------------
    // Handle pluginEvents
    //--------------------------------------------------------------------------

    _onDragAndDropEnd: function (dragAndDrop, id, position) {
        if (!id) {
            if (dragAndDrop.id) {
                this.dependencies.Arch.remove(dragAndDrop.id);
            }
            return;
        }
        var add = dragAndDrop.id || dragAndDrop.content;
        switch (position) {
            case 'before': this.dependencies.Arch.insertBefore(add, id);
                break;
            case 'after': this.dependencies.Arch.insertAfter(add, id);
                break;
            case 'append': this.dependencies.Arch.insert(add, id, Infinity);
                break;
            case 'prepend': this.dependencies.Arch.insert(add, id, 0);
                break;
        }
    },
    _onDragAndDropMove: function (dragAndDrop, dropzone, previousDropzone) {
        if (previousDropzone) {
            previousDropzone.style.display = '';
        }

        if (dropzone) {
            dragAndDrop.elements.forEach(function (node) {
                dropzone.parentNode.insertBefore(node, dropzone);
            });
            dropzone.style.display = 'none';
        } else {
            dragAndDrop.elements.forEach(function (node) {
                node.parentNode.removeChild(node);
            });
        }
    },
    _onDragAndDropNeedDropZone: function (dragAndDrop, dropZones) {
        dropZones.push({
            dropIn: [this.editable],
            // dropNear: this.editable.children,
        });
    },
    _onDragAndDropNeedItems: function (items) {
        items.push.apply(items, [].slice.call(this.editable.children));
    },
    _onDragAndDropStart: function (dragAndDrop, dropZones) {
        this._createDropZones(dropZones);
    },

    //--------------------------------------------------------------------------
    // Handle MouseEvent
    //--------------------------------------------------------------------------

    _onMouseDownBlock: function (ev) {
        if (this.options.autoCloseDropblock) {
            this.close();
        }
        if (this._eventStartNewBlock(ev.target)) {
            ev.preventDefault();
            ev.stopPropagation();
            this._dragAndDropStart(ev.clientX, ev.clientY);
        }
    },
    _onMouseDownHandleButton: function (ev) {
        if (this.options.autoCloseDropblock) {
            this.close();
        }
        ev.preventDefault();
        ev.stopPropagation();
        if (this._eventStartMoveBlock(ev.target)) {
            this._dragAndDropStart(ev.clientX, ev.clientY);
        }
    },
    _onMouseEnter: function () {
        if (!this._dragAndDrop && !this._hasMoveAndDropButtons) {
            this._createMoveAndDropButtons();
        }
    },
    _onMouseLeave: function (ev) {
        if (ev.target === this.editable && this._hasMoveAndDropButtons) {
            this._removeMoveAndDropButtons();
        }
    },
    _onMouseMove: function (ev) {
        this._dragAndDropMove(ev.clientX, ev.clientY);
        this._dragAndDropMoveSearch();
    },
    _onMouseUp: function (ev) {
        this._dragAndDropEnd();
    },

    //--------------------------------------------------------------------------
    // Handle TouchEvent
    //--------------------------------------------------------------------------

    _onTouchEnd: function (ev) {
        if (!this._selectedDragAndDrop && ev.path[0].tagName === "WE3-DROPBLOCK-DROPZONE") {
            this._selectedDragAndDrop = ev.path[0];
        }
        this._dragAndDropEnd();
    },
    _onTouchMove: function (ev) {
        this._dragAndDropMove(ev.touches[0].clientX, ev.touches[0].clientY);
        this._dragAndDropMoveSearch();
    },
    _onTouchStart: function (ev) {
        if (!this._dragAndDrop && !this._hasMoveAndDropButtons && this.editable.contains(ev.target)) {
            this._createMoveAndDropButtons();
        } else if (this._hasMoveAndDropButtons && !this.editable.contains(ev.target)) {
            this._removeMoveAndDropButtons();
        }
    },
    _onTouchStartBlock: function (ev) {
        this.close();
        if (this._eventStartNewBlock(ev.target)) {
            ev.preventDefault();
            ev.stopPropagation();
            this._dragAndDropStart(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    },
    _onTouchStartHandleButton: function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.close();
        if (this._eventStartMoveBlock(ev.target)) {
            this._dragAndDropStart(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    },
});

Manager.addPlugin('DropBlock', DropBlock);

});
