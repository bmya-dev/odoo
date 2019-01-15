odoo.define('web.test_utils_dom', function (require) {
"use strict";

var concurrency = require('web.concurrency');

/**
 * DOM Test Utils
 *
 * This module defines various utility functions to help simulate DOM events.
 *
 * Note that all methods defined in this module are exported in the main
 * testUtils file.
 */


/**
 * simulate a drag and drop operation between 2 jquery nodes: $el and $to.
 * This is a crude simulation, with only the mousedown, mousemove and mouseup
 * events, but it is enough to help test drag and drop operations with jqueryUI
 * sortable.
 *
 * @todo: remove the withTrailingClick option when the jquery update branch is
 *   merged.  This is not the default as of now, because handlers are triggered
 *   synchronously, which is not the same as the 'reality'.
 *
 * @param {jqueryElement} $el
 * @param {jqueryElement} $to
 * @param {Object} [options]
 * @param {string|Object} [options.position='center'] target position:
 *   can either be one of {'top', 'bottom', 'left', 'right'} or
 *   an object with two attributes (top and left))
 * @param {boolean} [options.disableDrop=false] whether to trigger the drop action
 * @param {boolean} [options.continueMove=false] whether to trigger the
 *   mousedown action (will only work after another call of this function with
 *   without this option)
 * @param {boolean} [options.withTrailingClick=false] if true, this utility
 *   function will also trigger a click on the target after the mouseup event
 *   (this is actually what happens when a drag and drop operation is done)
 */
function dragAndDrop($el, $to, options) {
    options = options || {};
    var position = options.position || 'center';
    var elementCenter = $el.offset();
    var toOffset = $to.offset();

    if (_.isObject(position)) {
        toOffset.top += position.top;
        toOffset.left += position.left;
    } else {
        toOffset.top += $to.outerHeight() / 2;
        toOffset.left += $to.outerWidth() / 2;
        var vertical_offset = (toOffset.top < elementCenter.top) ? -1 : 1;
        if (position === 'top') {
            toOffset.top -= $to.outerHeight() / 2 + vertical_offset;
        } else if (position === 'bottom') {
            toOffset.top += $to.outerHeight() / 2 - vertical_offset;
        } else if (position === 'left') {
            toOffset.left -= $to.outerWidth() / 2;
        } else if (position === 'right') {
            toOffset.left += $to.outerWidth() / 2;
        }
    }

    if ($to[0].ownerDocument !== document) {
        // we are in an iframe
        var bound = $('iframe')[0].getBoundingClientRect();
        toOffset.left += bound.left;
        toOffset.top += bound.top;
    }
    $el.trigger($.Event("mouseenter"));
    if (!(options.continueMove)) {
        elementCenter.left += $el.outerWidth() / 2;
        elementCenter.top += $el.outerHeight() / 2;

        $el.trigger($.Event("mousedown", {
            which: 1,
            pageX: elementCenter.left,
            pageY: elementCenter.top
        }));
    }

    $el.trigger($.Event("mousemove", {
        which: 1,
        pageX: toOffset.left,
        pageY: toOffset.top
    }));

    if (!options.disableDrop) {
        $el.trigger($.Event("mouseup", {
            which: 1,
            pageX: toOffset.left,
            pageY: toOffset.top
        }));
        if (options.withTrailingClick) {
            $el.click();
        }
    } else {
        // It's impossible to drag another element when one is already
        // being dragged. So it's necessary to finish the drop when the test is
        // over otherwise it's impossible for the next tests to drag and
        // drop elements.
        $el.on("remove", function () {
            $el.trigger($.Event("mouseup"));
        });
    }
    return concurrency.delay(0);
}

/**
 * simulate a mouse event with a custom event who add the item position. This is
 * sometimes necessary because the basic way to trigger an event (such as
 * $el.trigger('mousemove')); ) is too crude for some uses.
 *
 * @param {jqueryElement} $el
 * @param {string} type a mouse event type, such as 'mousedown' or 'mousemove'
 */
function triggerMouseEvent($el, type) {
    var pos = $el.offset();
    var e = new $.Event(type);
    // little fix since it seems on chrome, it triggers 1px too on the left
    e.pageX = e.layerX = e.screenX = pos.left + 1;
    e.pageY = e.layerY = e.screenY = pos.top;
    e.which = 1;
    $el.trigger(e);
}

/**
 * simulate a mouse event with a custom event on a position x and y. This is
 * sometimes necessary because the basic way to trigger an event (such as
 * $el.trigger('mousemove')); ) is too crude for some uses.
 *
 * @param {integer} x
 * @param {integer} y
 * @param {string} type a mouse event type, such as 'mousedown' or 'mousemove'
 */
function triggerPositionalMouseEvent(x, y, type) {
    var ev = document.createEvent("MouseEvent");
    var el = document.elementFromPoint(x, y);
    ev.initMouseEvent(
        type,
        true /* bubble */,
        true /* cancelable */,
        window, null,
        x, y, x, y, /* coordinates */
        false, false, false, false, /* modifier keys */
        0 /*left button*/, null
    );
    el.dispatchEvent(ev);
    return el;
}

/**
 * simulate a keypress event for a given character
 *
 * @param {string} char the character, or 'ENTER'
 */
function triggerKeypressEvent(char) {
    var keycode;
    if (char === "Enter") {
        keycode = $.ui.keyCode.ENTER;
    } else if (char === "Tab") {
        keycode = $.ui.keyCode.TAB;
    } else {
        keycode = char.charCodeAt(0);
    }
    return $('body').trigger($.Event('keypress', { which: keycode, keyCode: keycode }));
}

/**
 * Opens the datepicker of a given element.
 *
 * @param {jQuery} $datepickerEl element to which a datepicker is attached
 */
function openDatepicker($datepickerEl) {
    $datepickerEl.find('.o_datepicker_input').trigger('focus.datetimepicker');
}

/**
 * Click on a specified element. If the option first or last is not specified,
 * this method also check the unicity and the visibility of the target.
 *
 * @param {string|NodeList|jQuery} el (if string: it is a (jquery) selector)
 * @param {Object} [options]
 * @param {boolean} [options.first=false] if true, clicks on the first element
 * @param {boolean} [options.last=false] if true, clicks on the last element
 * @param {boolean} [options.allowInvisible=false] if true, clicks on the
 *   element event if it is invisible
 * @param {boolean} [options.shouldTriggerClick=false] if true, trigger the
 *   click event without calling the function click of jquery
 */
function click(el, options) {
    options = options || {};
    var matches = typeof el === 'string' ? $(el) : el;
    var selectorMsg = typeof el === 'string' ? `(selector: ${el})` : '';
    if (!matches.filter) { // it might be an array of dom elements
        matches = $(matches);
    }
    var validMatches = options.allowInvisible ? matches : matches.filter(':visible');

    if (options.first) {
        if (validMatches.length === 1) {
            throw new Error(`There should be more than one visible target ${selectorMsg}.  If` +
                ' you are sure that there is exactly one target, please use the ' +
                'click function instead of the clickFirst function');
        }
        validMatches = validMatches.first();
    } else if (options.last) {
        if (validMatches.length === 1) {
            throw new Error(`There should be more than one visible target ${selectorMsg}.  If` +
                ' you are sure that there is exactly one target, please use the ' +
                'click function instead of the clickLast function');
        }
        validMatches = validMatches.last();
    }
    if (validMatches.length === 0 && matches.length > 0) {
        throw new Error(`Element to click on is not visible ${selectorMsg}`);
    } else if (validMatches.length !== 1) {
        throw new Error(`Found ${validMatches.length} elements to click on, instead of 1 ${selectorMsg}`);
    }
    if (options.shouldTriggerClick) {
        validMatches.trigger('click');
    } else {
        validMatches.click();
    }

    return concurrency.delay(0);
}

/**
 * Click on the first element of a list of elements.  Note that if the list has
 * only one visible element, we trigger an error. In that case, it is better to
 * use the click helper instead.
 *
 * @param {string|NodeList|jQuery} el (if string: it is a (jquery) selector)
 * @param {boolean} [options.allowInvisible=false] if true, clicks on the
 *   element event if it is invisible
 * @param {boolean} [options.shouldTriggerClick=false] if true, trigger the
 *   click event without calling the function click of jquery
 */
function clickFirst(el, options) {
    return click(el, _.extend({}, options, {first: true}));
}

/**
 * Click on the last element of a list of elements.  Note that if the list has
 * only one visible element, we trigger an error. In that case, it is better to
 * use the click helper instead.
 *
 * @param {string|NodeList|jQuery} el
 * @param {boolean} [options.allowInvisible=false] if true, clicks on the
 *   element event if it is invisible
 * @param {boolean} [options.shouldTriggerClick=false] if true, trigger the
 *   click event without calling the function click of jquery
 */
function clickLast(el, options) {
    return click(el, _.extend({}, options, {last: true}));
}


/**
 * trigger events on the specified target
 * @param {jQuery} $el should target a single dom node
 * @param {string[]} events the events you want to trigger
 * @returns Promise
 */
function triggerEvents($el, events) {
    if ($el.length !== 1) {
        throw new Error(`target has length ${$el.length} instead of 1`);
    }
    if (typeof events === 'string') {
        events = [events];
    }
    events.forEach(function (event) {
        $el.trigger(event);
    });
    return concurrency.delay(0);
}

/**
 * Trigger events natively (as opposed to the jQuery way)
 * on the specified target.
 *
 * @param {node} el
 * @param {string []} events
 * @param {object} [options]
 * @returns Promise <Event []>
 */
function triggerNativeEvents(el, events, options) {
    options = _.defaults(options || {}, {
        view: window,
        bubbles: true,
        cancelable: true,
    });
    if (typeof events === 'string') {
        events = [events];
    }
    var triggeredEvents = []
    events.forEach(function (eventName) {
        var event;
        switch (_eventType(eventName)) {
            case 'mouse':
                event = new MouseEvent(eventName, options);
                break;
            case 'keyboard':
                event = new KeyboardEvent(eventName, options);
                break;
            default:
                event = new Event(eventName, options);
                break;
        }
        el.dispatchEvent(event);
        triggeredEvents.push(event);
    });
    return concurrency.delay(0).then(function () {
        return triggeredEvents;
    });
}

/**
 * Get the event type based on its name.
 *
 * @private
 * @param {string} eventName
 * @returns string
 *  'mouse' | 'keyboard' | 'unknown'
 */
function _eventType(eventName) {
    var types = {
        mouse: ['click', 'mouse', 'pointer', 'contextmenu', 'select', 'wheel'],
        keyboard: ['key'],
    };
    var type = 'unknown';
    Object.keys(types).forEach(function (key, index) {
        var isType = types[key].some(function (str) {
            return eventName.indexOf(str) !== -1;
        });
        if (isType) {
            type = key;
        }
    });
    return type;
}


return {
    triggerKeypressEvent: triggerKeypressEvent,
    triggerMouseEvent: triggerMouseEvent,
    triggerPositionalMouseEvent: triggerPositionalMouseEvent,
    dragAndDrop: dragAndDrop,
    openDatepicker: openDatepicker,
    click: click,
    clickFirst: clickFirst,
    clickLast: clickLast,
    triggerEvents: triggerEvents,
    triggerNativeEvents: triggerNativeEvents,
};

});
