odoo.define('mail.wip.widget.Composer', function (require) {
'use strict';

const EmojisButton = require('mail.wip.widget.EmojisButton');

const dom = require('web.dom');

const { Component } = owl;

class Composer extends Component {

    constructor(...args) {
        super(...args);
        this.template = 'mail.wip.widget.Composer';
        this.widgets = { EmojisButton };
    }

    mounted() {
        dom.autoresize($(this.refs.input), { min_height: 30 });
    }

    //--------------------------------------------------------------------------
    // Getters / Setters
    //--------------------------------------------------------------------------

    get userAvatar() {
        const avatar =
            this.env.session.uid > 0
                ? this.env.session.url('/web/image', {
                      model: 'res.users',
                      field: 'image_small',
                      id: this.env.session.uid
                  })
                : '/web/static/src/img/user_menu_avatar.png';
        return avatar;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _postMessage() {
        this.env.store.dispatch('thread/post_message', {
            $thread: this.props.$thread,
            data: { content: this.refs.input.value },
        });
        this.refs.input.value = '';
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onClickAddAttachment() {}

    _onClickSend() {
        if (!this.refs.input.value) {
            return;
        }
        this._postMessage();
    }

    _onEmojiSelection({ source }) {
        const input = this.refs.input;
        const cursorPosition = dom.getSelectionRange(input);
        const leftSubstring = input.value.substring(0, cursorPosition.start);
        const rightSubstring = input.value.substring(cursorPosition.end);
        const newValue = [leftSubstring, source, rightSubstring].join(" ");
        const newCursorPosition = newValue.length - rightSubstring.length;
        input.value = newValue;
        input.focus();
        input.setSelectionRange(newCursorPosition, newCursorPosition);
    }

    _onInputKeydown(ev) {
        if (ev.which === $.ui.keyCode.ENTER) {
            if (!this.refs.input.value) {
                return;
            }
            this._postMessage();
            ev.preventDefault();
        }
    }
}

return Composer;
});
