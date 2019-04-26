# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models
from odoo.exceptions import AccessError


class PosConfig(models.Model):
    _inherit = 'pos.config'

    def _get_default_pos_team(self):
        try:
            team = self.env.ref('sales_team.pos_sales_team', raise_if_not_found=False)
            return team if team.active else None
        except AccessError:
            return None 

    crm_team_id = fields.Many2one(
        'crm.team', string="Sales Team",
        help="This Point of sale's sales will be related to this Sales Team.", 
        default=_get_default_pos_team)
