# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
from ast import literal_eval

from werkzeug import urls

from odoo import api, fields, models, tools


class ResConfigSettings(models.TransientModel):
    """ Inherit the base settings to add a counter of failed email + configure
    the alias domain. """
    _inherit = 'res.config.settings'

    fail_counter = fields.Integer('Fail Mail', readonly=True)
    alias_domain = fields.Char('Alias Domain', help="If you have setup a catch-all email domain redirected to "
                               "the Odoo server, enter the domain name here.")
    email_template_layout = fields.Many2one('ir.ui.view', string='Email Template Layout', domain=[('key', 'ilike', '_email_layout')])
    
    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()

        previous_date = datetime.datetime.now() - datetime.timedelta(days=30)
        IrConfigParameter = self.env['ir.config_parameter']

        alias_domain = IrConfigParameter.get_param("mail.catchall.domain", default=None)
        if alias_domain is None:
            domain = IrConfigParameter.get_param("web.base.url")
            try:
                alias_domain = urls.url_parse(domain).host
            except Exception:
                pass
        email_template_layout = literal_eval(IrConfigParameter.sudo().get_param('email_template_layout', 'False'))
        res.update(
            fail_counter=self.env['mail.mail'].sudo().search_count([
                ('date', '>=', previous_date.strftime(tools.DEFAULT_SERVER_DATETIME_FORMAT)),
                ('state', '=', 'exception')]),
            alias_domain=alias_domain or False,
            email_template_layout=email_template_layout,

        )

        return res

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        IrConfigParameter = self.env['ir.config_parameter']
        IrConfigParameter.set_param("mail.catchall.domain", self.alias_domain or '')
        IrConfigParameter.sudo().set_param('email_template_layout', self.email_template_layout.id or False)

    def edit_email_template_layout(self):
        template_id = self.email_template_layout.id
        return {
           'type': 'ir.actions.act_window',
           'res_model': 'ir.ui.view',
           'view_type': 'form',
           'view_mode': 'form',
           'res_id': template_id,
        }
