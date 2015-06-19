# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import sets

from openerp import models, fields, api

_logger = logging.getLogger(__name__)

class barcode_rule(models.Model):
    _inherit = 'barcode.rule'

    def _get_type_selection(self):
        types = sets.Set(super(barcode_rule, self)._get_type_selection())
        types.update([
            ('Credit', 'Credit Card')
        ])
        return list(types)


class pos_mercury_payment_data(models.Model):
    _name = 'pos_mercury.configuration'

    # FIELDS #
    merchant_id = fields.Char(string='Merchant ID', size=24, required=True, help='Id of the merchant to authenticate him on the payment provider server')
    merchant_pwd = fields.Char(string='Merchant Password', required=True, help='Password of the merchant to authenticate him on the payment provider server')

class account_bank_statement_line(models.Model):
    _inherit = "account.bank.statement.line"

    card_number = fields.Char(string='Card Number', size=4, help='The last 4 numbers of the card used to pay')
    prefixed_card_number = fields.Char(string='Card Number', compute='_compute_prefixed_card_number')
    card_brand = fields.Char(string='Card Brand', help='The brand of the payment card (e.g. Visa, AMEX, ...)')
    card_owner_name = fields.Char(string='Card Owner Name', help='The name of the card owner')
    ref_no = fields.Char(string='Mercury reference number')
    record_no = fields.Char(string='Mercury record number')
    invoice_no = fields.Integer(string='Mercury invoice number')

    @api.one
    def _compute_prefixed_card_number(self):
        if self.card_number:
            self.prefixed_card_number = "********" + self.card_number
        else:
            self.prefixed_card_number = ""

class account_journal(models.Model):
    _inherit = 'account.journal'

    pos_mercury_config_id = fields.Many2one('pos_mercury.configuration', string='Mercury configuration', help='The configuration of Mercury used for this journal')

class pos_order_card(models.Model):
    _inherit = "pos.order"

    @api.model
    def _payment_fields(self, ui_paymentline):
        fields = super(pos_order_card, self)._payment_fields(ui_paymentline)

        fields.update({
            'card_number': ui_paymentline.get('card_number'),
            'card_brand': ui_paymentline.get('card_brand'),
            'card_owner_name': ui_paymentline.get('card_owner_name'),
            'ref_no': ui_paymentline.get('ref_no'),
            'record_no': ui_paymentline.get('record_no'),
            'invoice_no': ui_paymentline.get('invoice_no')
        })

        return fields

    @api.model
    def add_payment(self, order_id, data):
        statement_id = super(pos_order_card, self).add_payment(order_id, data)
        statement_lines = self.env['account.bank.statement.line'].search([('statement_id', '=', statement_id),
                                                                         ('pos_statement_id', '=', order_id),
                                                                         ('journal_id', '=', data['journal']),
                                                                         ('amount', '=', data['amount'])])

        # we can get multiple statement_lines when there are >1 credit
        # card payments with the same amount. In that case it doesn't
        # matter which statement line we pick, just pick one that
        # isn't already used.
        for line in statement_lines:
            if not line.card_brand:
                line.card_brand = data.get('card_brand')
                line.card_number = data.get('card_number')
                line.card_owner_name = data.get('card_owner_name')

                line.ref_no = data.get('ref_no')
                line.record_no = data.get('record_no')
                line.invoice_no = data.get('invoice_no')

                break

        return statement_id
