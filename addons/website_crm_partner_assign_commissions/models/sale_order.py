# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    reseller_id = fields.Many2one('res.partner', 'Reseller', help='This field is used to track the reseller in order to generate commisions')
    commission_ratio = fields.Float('Commission Ratio', default=1, help="1 means that all the commission goes to the partner")

    @api.multi
    def _prepare_invoice(self):
        res = super(SaleOrder, self)._prepare_invoice()
        res.update({
            'reseller_id': self.reseller_id.id,
            'commission_ratio': self.commission_ratio,
        })
        return res
