# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import werkzeug

from odoo import http
from odoo.http import request
from odoo.addons.portal.controllers.web import Home
from odoo.exceptions import UserError, ValidationError, AccessError, MissingError, AccessError, AccessDenied


class WebsiteTest(Home):

    @http.route('/test_view', type='http', auth='public', website=True)
    def test_view(self, **kwargs):
        return request.render('test_website.test_view')

    @http.route('/test_error_view', type='http', auth='public', website=True)
    def test_error_view(self, **kwargs):
        return request.render('test_website.test_error_view')

    @http.route('/test_user_error_http', type='http', auth='public', website=True)
    def test_user_error_http(self, **kwargs):
        raise UserError("This is a user http test")

    @http.route('/test_user_error_json', type='json', auth='public', website=True)
    def test_user_error_json(self, **kwargs):
        raise UserError("This is a user rpc test")

    @http.route('/test_validation_error_http', type='http', auth='public', website=True)
    def test_validation_error_http(self, **kwargs):
        raise ValidationError("This is a validation http test")

    @http.route('/test_validation_error_json', type='json', auth='public', website=True)
    def test_validation_error_json(self, **kwargs):
        raise ValidationError("This is a validation rpc test")

    @http.route('/test_access_error_json', type='json', auth='public', website=True)
    def test_access_error_json(self, **kwargs):
        raise AccessError("This is an access rpc test")

    @http.route('/test_access_error_http', type='http', auth='public', website=True)
    def test_access_error_http(self, **kwargs):
        raise AccessError("This is an access http test")

    @http.route('/test_missing_error_json', type='json', auth='public', website=True)
    def test_missing_error_json(self, **kwargs):
        raise MissingError("This is a missing rpc test")

    @http.route('/test_missing_error_http', type='http', auth='public', website=True)
    def test_missing_error_http(self, **kwargs):
        raise MissingError("This is a missing http test")

    @http.route('/test_internal_error_json', type='json', auth='public', website=True)
    def test_internal_error_json(self, **kwargs):
        raise werkzeug.exceptions.InternalServerError()

    @http.route('/test_internal_error_http', type='http', auth='public', website=True)
    def test_internal_error_http(self, **kwargs):
        raise werkzeug.exceptions.InternalServerError()

    @http.route('/test_access_denied_json', type='json', auth='public', website=True)
    def test_denied_error_json(self, **kwargs):
        raise AccessDenied("This is an access denied rpc test")

    @http.route('/test_access_denied_http', type='http', auth='public', website=True)
    def test_denied_error_http(self, **kwargs):
        raise AccessDenied("This is an access denied http test")
