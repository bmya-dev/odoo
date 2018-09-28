# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.


{
    'name': 'Task Logs',
    'version': '1.0',
    'category': 'Human Resources',
    'sequence': 23,
    'summary': 'Track employee time on tasks',
    'description': """
This module implements a timesheet system.
==========================================

Each employee can encode and track their time spent on the different projects.

Lots of reporting on time and employee tracking are provided.

It is completely integrated with the cost accounting module. It allows you to set
up a management by affair.
    """,
    'website': 'https://www.odoo.com/page/timesheet-mobile-app',
    'depends': ['hr', 'analytic', 'uom'],
    'data': [
        'security/hr_timesheet_security.xml',
        'security/ir.model.access.csv',
        'views/assets.xml',
        'views/hr_timesheet_views.xml',
        'views/res_config_settings_views.xml',
        'report/hr_timesheet_report_view.xml',
        'views/hr_views.xml',
        'data/hr_timesheet_data.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
