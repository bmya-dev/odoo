# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class PurchaseOrderLine(models.Model):
    _inherit = "purchase.order.line"

    def _prepare_compute_all_values(self):
        res = super(PurchaseOrderLine, self)._prepare_compute_all_values()
        default_analytic_account = self.env['account.analytic.default'].account_get(self.product_id.id, self.partner_id.id, self.order_id.user_id.id, fields.Date.today())
        if default_analytic_account:
            res.update({'account_analytic_id': default_analytic_account.analytic_id.id})
            res.update({'analytic_tag_ids': [(6, 0, default_analytic_account.analytic_tag_ids.ids)]})
        print(res)
        return res
