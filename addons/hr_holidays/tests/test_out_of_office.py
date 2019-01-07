# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import datetime
from dateutil.relativedelta import relativedelta

from odoo.tests.common import tagged
from odoo.addons.hr_holidays.tests.common import TestHrHolidaysBase


@tagged('out_of_office')
class TestOutOfOffice(TestHrHolidaysBase):

    def test_leave_ooo(self):
        leave_type = self.env['hr.leave.type'].create({
            'name': 'Legal Leaves',
            'time_type': 'leave',
            'allocation_type': 'no',
        })
        self.assertNotEqual(self.employee_hruser.user_id.im_status, 'leave_offline', 'user should not be on leave')
        self.assertNotEqual(self.employee_hruser.user_id.partner_id.im_status, 'leave_offline', 'user should not be on leave')
        leave_date_end = (datetime.today() + relativedelta(days=3))
        leave = self.env['hr.leave'].create({
            'name': 'Christmas',
            'employee_id': self.employee_hruser.id,
            'holiday_status_id': leave_type.id,
            'date_from': (datetime.today() - relativedelta(days=1)),
            'date_to': leave_date_end,
            'out_of_office_message': 'contact tde in case of problems',
            'number_of_days': 4,
        })
        leave.action_approve()
        self.assertEqual(self.employee_hruser.user_id.im_status, 'leave_offline', 'user should be out (leave_offline)')
        self.assertEqual(self.employee_hruser.user_id.partner_id.im_status, 'leave_offline', 'user should be out (leave_offline)')

        partner = self.employee_hruser.user_id.partner_id
        partner2 = self.user_employee.partner_id

        channel = self.env['mail.channel'].with_context({
            'mail_create_nolog': True,
            'mail_create_nosubscribe': True,
            'mail_channel_noautofollow': True,
        }).create({
            'channel_partner_ids': [(4, partner.id), (4, partner2.id)],
            'public': 'private',
            'channel_type': 'chat',
            'email_send': False,
            'name': 'OdooBot'
        })
        infos = channel.sudo(self.user_employee).channel_info()
        self.assertEqual(infos[0]['direct_partner'][0]['out_of_office_date_end'], leave_date_end)
        self.assertEqual(infos[0]['direct_partner'][0]['out_of_office_message'], 'contact tde in case of problems')
