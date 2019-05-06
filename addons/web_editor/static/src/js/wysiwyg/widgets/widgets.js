odoo.define('wysiwyg.widgets', function (require) {
'use strict';

var WeDialog = require('wysiwyg.widgets.Dialog');
var AltDialog = require('wysiwyg.widgets.AltDialog');
var MediaDialog = require('wysiwyg.widgets.MediaDialog');
var LinkDialog = require('wysiwyg.widgets.LinkDialog');
var CropImageDialog = require('wysiwyg.widgets.CropImageDialog');
var ColorpickerDialog = require('wysiwyg.widgets.ColorpickerDialog');

var media = require('wysiwyg.widgets.media');

return {
    Dialog: WeDialog,
    AltDialog: AltDialog,
    MediaDialog: MediaDialog,
    LinkDialog: LinkDialog,
    CropImageDialog: CropImageDialog,
    ColorpickerDialog: ColorpickerDialog,

    MediaWidget: media.MediaWidget,
    SearchWidget: media.SearchWidget,
    FileWidget: media.FileWidget,
    ImageWidget: media.ImageWidget,
    DocumentWidget: media.DocumentWidget,
    IconWidget: media.IconWidget,
    VideoWidget: media.VideoWidget,
};
});
