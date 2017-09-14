# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

# Copyright (c) 2008-2010 Zikzakmedia S.L. (http://zikzakmedia.com) All Rights Reserved.
#                         Jordi Esteve <jesteve@zikzakmedia.com>
# Copyright (c) 2012-2013, Grupo OPENTIA (<http://opentia.com>) Registered EU Trademark.
#                         Dpto. Consultoría <consultoria@opentia.es>
# Copyright (c) 2013 Serv. Tecnol. Avanzados (http://www.serviciosbaeza.com)
#                    Pedro Manuel Baeza <pedro.baeza@serviciosbaeza.com>

{
    "name" : "Spain - Accounting (PGCE 2008)",
    "version" : "4.0",
    "author" : "Spanish Localization Team",
    'website' : 'https://launchpad.net/openerp-spain',
    'category': 'Localization',
    "description": """
Spanish charts of accounts (PGCE 2008).
========================================

    * Defines the following chart of account templates:
        * Spanish general chart of accounts 2008
        * Spanish general chart of accounts 2008 for small and medium companies
        * Spanish general chart of accounts 2008 for associations
    * Defines templates for sale and purchase VAT
    * Defines tax code templates
    * Defines fiscal positions for spanish fiscal legislation
""", #TODO OCO quand tu auras fini, revoir la description du module
    "depends" : [
        "account",
        "base_iban",
        "base_vat",
    ],
    "data" : [
        'data/account_chart_template_data.xml',
        'data/account_account_template_common_data.xml',
        'data/account_account_template_pymes_data.xml',
        'data/account_account_template_assoc_data.xml',
        'data/account_account_template_full_data.xml',
        'data/account_chart_template_account_account_link.xml',
        'data/account_data.xml',
        'data/account_tax_data.xml',
        'data/account_fiscal_position_template_data.xml',
        'data/account_chart_template_data.yml',
    ],
}
