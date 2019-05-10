# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.osv import expression
from odoo.addons.portal.controllers.portal import CustomerPortal


class CustomerPortal(CustomerPortal):

    def get_domain_my_timesheet(self):
        domain = super(CustomerPortal, self).get_domain_my_timesheet()
        domain = expression.AND([domain, [('timesheet_invoice_type', 'in', ['billable_time', 'non_billable'])]])
        return expression.OR([domain, [('timesheet_invoice_id', '!=', False)]])

    def _invoice_get_page_view_values(self, invoice, access_token, **kw):
        values = super(CustomerPortal, self)._invoice_get_page_view_values(invoice, access_token, **kw)

        # add invoice related timesheets
        values['timesheets'] = invoice.timesheet_ids
        return values
