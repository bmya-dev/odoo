# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Account Analytic Defaults for Sales.',
    'version': '1.0',
    'category': 'Accounting',
    'description': """
Set default values for your analytic accounts on your hr expenses.
==================================================================

Allows to automatically select analytic accounts based on Product
    """,
    'depends': ['account_analytic_default', 'sale_stock'],
    'auto_install': True,
}
