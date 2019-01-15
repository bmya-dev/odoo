odoo.define('wysiwyg.plugin.ui.popover', function (require) {
'use strict';

var core = require('web.core');
var AbstractPlugin = require('web_editor.wysiwyg.plugin.abstract');
var Manager = require('web_editor.wysiwyg.plugin.manager');
var defaultOptions = require('wysiwyg.options');

var $ = require('web_editor.jquery');
var _ = require('web_editor._');


var handleSelector = function (element, selector, callback) {
    return function (ev) {
        var nodelist = element.querySelectorAll(selector);
        for (var k = nodelist.length - 1; k >= 0; k--) {
            var el = nodelist[k];
            if (el === ev.target || el.contains(ev.target)) {
                callback(ev);
                break;
            }
        }
    };
};


var PopoverPlugin = AbstractPlugin.extend({
    dependencies: ['Position'],

    editableDomEvents: {
        'keydown': '_onKeyPress',
        'keyup': '_onKeyPress',
    },

    POPOVER_MARGIN_LEFT: 5,
    POPOVER_MARGIN_TOP: 5,

    init: function (parent, params) {
        this._super.apply(this, arguments);
        this._setOptionalDependencies(params);
        this._createPopover(params.insertBeforeContainer);
    },
    blurEditor: function () {
        this._hidePopovers();
    },
    focusEditor: function () {
        this._onFocusNode(this.dependencies.Arch.getFocusedNode());
    },
    changeEditorValue: function () {
        this._onFocusNode(this.dependencies.Arch.getFocusedNode());
    },
    setEditorValue: function (value) {
        this._hidePopovers();
        return value;
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    start: function () {
        this._createPopoverCheckMethod();
        this._createPopoverButtons();
        this._toggleDropDownEnabled();
        this.dependencies.Position.on('scroll', this, this._onScroll.bind(this));
        this.dependencies.Arch.on('focus', this, this._onFocusNode.bind(this));
        this.dependencies.Arch.on('range', this, this._onRange.bind(this));
        return this._super();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Create popover container and add it to the beforeEditable list.
     * Create the local popover definitions
     *
     * @returns [elements]
     */
    _createPopover: function (insertCallback) {
        var self = this;
        this.popovers = [];
        var popovers = this.popoverOptions;
        Object.keys(popovers).forEach(function (checkMethodKey) {
            var pluginNames = popovers[checkMethodKey];
            var checkMethodPluginName = checkMethodKey.split('.')[0];

            var popover = document.createElement('we3-popover');
            popover.setAttribute('name', checkMethodPluginName);
            insertCallback(popover);

            self.popovers.push({
                pluginNames: pluginNames,
                checkMethodPluginName: checkMethodPluginName,
                checkMethodName: checkMethodKey.split('.')[1],
                element: popover,
                display: false,
            });
        });
    },
    _createPopoverCheckMethod: function () {
        var self = this;
        this.popovers.forEach(function (popover) {
            var plugin = self.dependencies[popover.checkMethodPluginName];
            popover.checkMethod = plugin[popover.checkMethodName].bind(plugin);
        });
    },
    /**
     * Create buttons into the created popovers
     */
    _createPopoverButtons: function () {
        var self = this;
        this.popovers.forEach(function (popover) {
            popover.buttons = [];
            popover.pluginNames.forEach(function (pluginName) {
                var render = self._renderButtons(pluginName);
                popover.element.appendChild(render.element);
                popover.buttons = popover.buttons.concat(render.buttons);
            });
        });
    },
    _hidePopovers: function () {
        this.popovers.forEach(function (popover) {
            popover.element.style.display = '';
            popover.display = false;
        });
    },
    _renderButtons: function (pluginName) {
        var self = this;
        var plugin = self.dependencies[pluginName];
        if (!plugin.buttons || !plugin.buttons.template) {
            throw new Error('Button template of "' + pluginName + '" plugin is missing.');
        }

        var group = document.createElement('we3-group');
        group.innerHTML = this.options.renderTemplate(plugin.pluginName, plugin.buttons.template, {
            plugin: plugin,
            options: this.options,
        });
        var element = group.children.length === 1 ? group.children[0] : group;
        element.setAttribute('data-plugin', plugin.pluginName);

        this._addButtonHandlers(plugin, element);
        var buttons = this._recordPluginButtons(plugin, element);

        return {
            element: element,
            buttons: buttons,
        };
    },
    _addButtonHandlers: function (plugin, element) {
        this._addButtonHandlersEvents(plugin, element);
        this._addButtonHandlersDataMethod(plugin, element);
        this._addButtonHandlersDropdown(element);

        // prevent all click (avoid href...)
        element.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
        }, false);
        element.addEventListener('click', function (ev) {
            ev.preventDefault();
        }, false);
    },
    _addButtonHandlersEvents: function (plugin, element) {
        // add plugins button event as handler
        var events = plugin.buttons.events;
        if (events) {
            Object.keys(events).forEach(function (key) {
                var handle = events[key];
                var eventName = key.split(' ').shift();
                var selector = key.split(' ').slice(1).join(' ');
                if (typeof handle === 'string') {
                    handle = plugin[handle];
                }
                handle = handle.bind(plugin);

                if (selector) {
                    handle = handleSelector(element, selector, handle);
                }
                element.addEventListener(eventName, handle, false);
            });
        }
    },
    _addButtonHandlersDataMethod: function (plugin, element) {
        var _onButtonMousedown = this._onButtonMousedown.bind(this, plugin);
        if (!element.getAttribute('data-method')) {
            _onButtonMousedown = handleSelector(element, 'we3-button[data-method]', _onButtonMousedown);
        }
        element.addEventListener('mousedown', _onButtonMousedown, false);
    },
    _addButtonHandlersDropdown: function (element) {
        var dropdowns = element.tagName === 'WE3-DROPDOWN' ? [element] : element.querySelectorAll('we3-dropdown');
        dropdowns.forEach(function (dropdown) {
            var toggler = dropdown.querySelector('we3-toggler');
            var dropdownContents = dropdown.lastElementChild;
            dropdownContents.style.display = 'none';

            var mousedownCloseDropdown = function (ev) {
                if (!dropdown.contains(ev.target)) {
                    dropdownContents.style.display = 'none';
                    document.removeEventListener('click', mousedownCloseDropdown);
                }
            }

            dropdown.addEventListener('click', function () {
                var open = dropdownContents.style.display !== 'none';
                if (!toggler.classList.contains('disabled')) {
                    dropdownContents.style.display = open ? 'none' : '';
                    document.addEventListener('click', mousedownCloseDropdown, false);
                } else if (open) {
                    dropdownContents.style.display = 'none';
                }
            }, false);
        });
    },
    _recordPluginButtons: function (plugin, element) {
        // add created dom on plugin buttons object
        if (!plugin.buttons.elements) {
            plugin.buttons.elements = [];
            plugin.buttons.buttons = [];
        }
        plugin.buttons.elements.push(element);
        var buttons = [].slice.call(element.getElementsByTagName('we3-button'));
        if (element.tagName === 'WE3-BUTTON') {
            buttons.push(element);
        }
        buttons.forEach(function (button) {
            button.setAttribute('data-plugin', plugin.pluginName);
            plugin.buttons.buttons.push(button);
            if (button.getAttribute('name')) {
                button.classList.add('disabled');
            }
        });

        return buttons;
    },
    _domFind: function (selector) {
        var elements = [];
        this.popovers.forEach(function (popover) {
            elements = elements.concat([].slice.call(popover.element.querySelectorAll(selector)));
        });
        return elements;
    },
    _setOptionalDependencies: function () {
        var self = this;
        this.popoverOptions = Object.assign(JSON.parse(JSON.stringify(defaultOptions.popover)), this.options.popover);
        var dependencies = this.dependencies.slice();
        Object.keys(this.popoverOptions).forEach(function (checkMethod) {
            var plugins = self.popoverOptions[checkMethod];
            if (checkMethod.indexOf('.') !== -1) {
                dependencies.push(checkMethod.split('.')[0]);
            }
            plugins.forEach(function (plugin) {
            if (dependencies.indexOf(plugin) === -1)
                dependencies.push(plugin);
            });
        });
        this.dependencies = dependencies;
    },
    _toggleDropDownEnabled: function () {
        this.popovers.forEach(function (popover) {
            if (!popover.display) {
                return;
            }
            popover.element.querySelectorAll('we3-dropdown').forEach(function (dropdown) {
                var toggler = dropdown.querySelector('we3-toggler');
                var dropdownContents = dropdown.lastElementChild;
                toggler.classList.toggle('disabled', !dropdownContents.querySelector('we3-button[name]:not(.disabled)'));
            });
        });
    },
    _togglePluginButtonToggle: function (plugin, focusNode, buttonName, methodName) {
        var enabledMedthodName = plugin.buttons[methodName];
        if (enabledMedthodName) {
            var active = true;
            if (typeof enabledMedthodName === 'string') {
                active = !!plugin[enabledMedthodName](buttonName, focusNode);
            } else {
                active = !!enabledMedthodName.call(plugin, buttonName, focusNode);
            }
            if (active) {
                return true;
            }
        }
        return focusNode ? null : false;
    },
    _updatePluginButton: function (plugin, focusNode, button) {
        var enabled = this._togglePluginButtonToggle(plugin, focusNode, button.getAttribute('name'), 'enabled');
        if (enabled || enabled === null) {
            button.classList.remove('disabled');
            var active = this._togglePluginButtonToggle(plugin, focusNode, button.getAttribute('name'), 'active');
            if (active) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        } else {
            button.classList.add('disabled');
        }
    },
    _updatePluginPlaceholder: function (plugin, focusNode, button) {
        this.popovers.forEach(function (popover) {
            popover.element.querySelectorAll('we3-dropdown').forEach(function (dropdown) {
                var placeholder = dropdown.querySelector('we3-placeholder');
                if (!placeholder || dropdown.querySelector('we3-toggler').classList.contains('disabled')) {
                    return;
                }

                placeholder.innerHTML = '';
                var activeButton = dropdown.querySelector('we3-button.active');
                if (!activeButton) {
                    return;
                }

                var clone = activeButton.cloneNode(true);
                clone.removeAttribute('data-method');
                clone.removeAttribute('data-value');
                clone.classList.remove('active');
                placeholder.appendChild(clone);
            });
        });
    },
    _updatePopovers: function (range) {
        var self = this;
        this._hasDisplayedPopoverTargetText = false;
        this._hidePopovers();
        this.popovers.forEach(function (popover) {
            self._updatePopover(popover, range);
            if (popover.targetText) {
                self._hasDisplayedPopoverTargetText = true;
            }
        });
        this._updatePositionAvoidOverlap();
    },
    _updatePopover: function (popover, range) {
        var targetRange = popover.checkMethod(range);
        if (!targetRange) {
            popover.targetRange = null;
            return;
        }
        if (range.scArch.isText() || !range.scArch.isVoid() && range.scArch.isInline()) {
            popover.targetText = true;
        }
        popover.display = true;
        popover.targetRange = targetRange;

        this._updatePosition(popover, range);
    },
    _updatePopoverButtons: function (focusNode) {
        var self = this;
        this.popovers.forEach(function (popover) {
            if (!popover.display) {
                return;
            }

            var buttons = [].slice.call(popover.element.getElementsByTagName('we3-button'));
            if (popover.element.tagName === 'WE3-BUTTON') {
                buttons.push(popover.element);
            }

            buttons.forEach(function (button) {
                if (!button.getAttribute('name')) {
                    return;
                }
                self._updatePluginButton(self.dependencies[button.getAttribute('data-plugin')], focusNode, button);
            });
        });
        this._toggleDropDownEnabled();
        this._updatePluginPlaceholder();
    },
    /**
     * Update the position of the popover in CSS.
     *
     * @private
     */
    _updatePosition: function (popover, range) {
        var targetRange = popover.targetRange;
        var popoverElement = popover.element;
        var top = this.POPOVER_MARGIN_TOP;

        if (popover.targetText) {
            targetRange = range;
            var fontSize = this.window.getComputedStyle(targetRange.sc.parentNode, null).getPropertyValue('font-size');
            top += parseInt(fontSize);
        } else if (targetRange.sc !== range.sc && targetRange.sc.contains(range.sc)) {
            top += targetRange.sc.offsetHeight;
        }

        var position = this.dependencies.Position.getPosition(targetRange.sc, targetRange.so);
        var pos = this.editable.parentNode.getBoundingClientRect();
        var newPos = {
            left: position.left - pos.left + this.POPOVER_MARGIN_LEFT,
            top: position.top - pos.top + top,
        };
        if (newPos.top < 0) {
            popoverElement.style.display = 'none';
            return;
        }

        var mouse = this.dependencies.Position.getMousePosition();
        var top = mouse.pageY - pos.top;
        var height = 40;
        if (newPos.top <= top && newPos.top + height >= top) {
            newPos.top = top;
        }

        // var $container = $(this.options.container);
        // var containerWidth = $container.width();
        // var containerHeight = $container.height();

        // var popoverWidth = $popover.width();
        // var popoverHeight = $popover.height();

        // var isBeyondXBounds = pos.left + popoverWidth >= containerWidth - this.POPOVER_MARGIN_LEFT;
        // var isBeyondYBounds = pos.top + popoverHeight >= containerHeight - this.POPOVER_MARGIN_TOP;
        // pos = {
        //     left: isBeyondXBounds ?
        //         containerWidth - popoverWidth - this.POPOVER_MARGIN_LEFT :
        //         pos.left,
        //     top: isBeyondYBounds ?
        //         pos.top = containerHeight - popoverHeight - this.POPOVER_MARGIN_TOP :
        //         (pos.top > 0 ? pos.top : this.POPOVER_MARGIN_TOP),
        // };

        popoverElement.style.display = 'block';
        popoverElement.style.left = newPos.left + 'px';
        popoverElement.style.top = newPos.top + 'px';
    },
    _updatePositions: function (range) {
        var self = this;
        this.popovers.forEach(function (popover) {
            if (popover.display) {
                self._updatePosition(popover, range);
            }
        });
        this._updatePositionAvoidOverlap();
    },
    _updatePositionAvoidOverlap: function () {
        var popovers = [];
        this.popovers.forEach(function (popover) {
            if (popover.display) {
                popovers.push(popover);
            }
        });
        popovers.sort(function (a, b) {
            return a.targetRange.sc.contains(b.targetRange.sc) ? 1 : -1;
        });
        var bottom = 0;
        popovers.forEach(function (popover) {
            var pos = popover.element.getBoundingClientRect();
            var top = parseInt(popover.element.style.top);
            if (top < bottom) {
                popover.element.style.top = bottom + 'px';
            } else {
                bottom = top;
            }
            bottom += pos.height;
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onButtonMousedown: function (plugin, ev) {
        ev.preventDefault();
        if (ev.which !== 1) {
            return;
        }
        var button = ev.target;
        while (button !== this.editable.parentNode && button.tagName !== 'WE3-BUTTON') {
            button = button.parentNode;
        }

        if (button.classList.contains('disabled')) {
            return;
        }

        var method = button.getAttribute('data-method');
        var value = button.getAttribute('data-value');
        var popover;
        this.popovers.forEach(function (p) {
            if (p.buttons.indexOf(button) !== -1) {
                popover = p;
            }
        });
        var checkMethod = popover && popover.checkMethod;
        var range = this.dependencies.Arch.getRange();
        if (checkMethod) {
            range = checkMethod(range);
            if (!range) {
                return;
            }
        }
        var buttonOptions;
        if (button.getAttribute('options')) {
            buttonOptions = JSON.parse(button.getAttribute('options'));
        }
        plugin[method](value, range);
    },
    /**
     * On change focus node, update the popover position and the active button
     *
     * @private
     */
    _onFocusNode: function (focusNode) {
        var range = this.dependencies.Arch.getRange();
        this._updatePopovers(range);
        this._updatePopoverButtons(focusNode);
    },
    /**
     * On keydown or keyup, update the popover position
     *
     * @private
     */
    _onKeyPress: function () {
        this._updatePopovers(this.dependencies.Arch.getRange());
    },
    /**
     * @private
     */
    _onRange: function () {
        var self = this;
        if (this._hasDisplayedPopoverTargetText) {
            var range = this.dependencies.Arch.getRange();
            this.popovers.forEach(function (popover) {
                if (popover.targetText) {
                    self._updatePosition(popover, range);
                }
            });
            this._updatePositionAvoidOverlap();
        }
    },
    /**
     * @private
     */
    _onScroll: function () {
        this._updatePositions(this.dependencies.Arch.getRange());
    },
});

Manager.addPlugin('Popover', PopoverPlugin);

return PopoverPlugin;
});
