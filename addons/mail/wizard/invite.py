# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from lxml import etree
from lxml.html import builder as html

from odoo import _, api, fields, models


class Invite(models.TransientModel):
    """ Wizard to invite partners (or channels) and make them followers. """
    _name = 'mail.wizard.invite'
    _description = 'Invite wizard'

    @api.model
    def default_get(self, fields):
        result = super(Invite, self).default_get(fields)
        if self._context.get('mail_invite_follower_channel_only'):
            result['send_mail'] = False
        if 'message' not in fields:
            return result

        user_name = self.env.user.display_name
        model = result.get('res_model')
        res_id = result.get('res_id')
        if model and res_id:
            document = self.env['ir.model']._get(model).display_name
            title = self.env[model].browse(res_id).display_name
            msg_fmt = _('%(user_name)s invited you to follow %(document)s document: %(title)s')
        else:
            msg_fmt = _('%(user_name)s invited you to follow a new document.')

        text = msg_fmt % locals()
        message = html.DIV(
            html.P(_('Hello,')),
            html.P(text)
        )
        result['message'] = etree.tostring(message)
        return result

    res_model = fields.Char('Related Document Model', required=True, index=True, help='Model of the followed resource')
    res_id = fields.Integer('Related Document ID', index=True, help='Id of the followed resource')
    partner_ids = fields.Many2many('res.partner', string='Recipients', help="List of partners that will be added as follower of the current document.")
    channel_ids = fields.Many2many('mail.channel', string='Channels', help='List of channels that will be added as listeners of the current document.',
                                   domain=[('channel_type', '=', 'channel')])
    message = fields.Html('Message')
    send_mail = fields.Boolean('Send Email', default=True, help="If checked, the partners will receive an email warning they have been added in the document's followers.")

    @api.multi
    def add_followers(self):
        for wizard in self:
            Model = self.env[wizard.res_model]
            document = Model.browse(wizard.res_id)

            # filter partner_ids to get the new followers, to avoid sending email to already following partners
            new_partners = wizard.partner_ids - document.message_partner_ids
            new_channels = wizard.channel_ids - document.message_channel_ids
            document.message_subscribe(new_partners.ids, new_channels.ids)

            model_name = self.env['ir.model']._get(wizard.res_model).display_name
            # send an email if option checked and if a message exists (do not send void emails)
            if wizard.send_mail and wizard.message and not wizard.message == '<br>':  # when deleting the message, cleditor keeps a <br>
                values = {
                    'res_model': wizard.res_model,
                    'res_id': wizard.res_id,
                    'model_description': model_name,
                    'invite_message': wizard.message
                }
                body_template = self.env.ref('mail.message_add_new_follower')
                assignation_msg = body_template.render(values, engine='ir.qweb', minimal_qcontext=True)
                assignation_msg = self.env['mail.thread']._replace_local_links(assignation_msg)

                self.env['mail.thread'].message_notify(
                    partner_ids=new_partners.ids,
                    body=assignation_msg,
                    subject=_('Invitation to follow %s: %s') % (model_name, document.display_name),
                    message_type='email',
                    record_name=document.display_name,
                    model_description=model_name,
                    no_auto_thread=True,
                    add_sign=True,
                )
        return {'type': 'ir.actions.act_window_close'}
