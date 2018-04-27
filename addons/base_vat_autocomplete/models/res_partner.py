# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import re

from odoo import api, models

from suds.client import Client

_logger = logging.getLogger(__name__)

try:
    import stdnum.eu.vat as stdnum_vat
    if not hasattr(stdnum_vat, "country_codes"):
        # stdnum version >= 1.9
        stdnum_vat.country_codes = stdnum_vat._country_codes
except ImportError:
    _logger.warning('Python `stdnum` library not found, unable to call VIES service to detect address based on VAT number.')
    stdnum_vat = None


class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def _get_partner_vals(self, vat):
        def _check_city(lines, country='BE'):
            if country == 'GB':
                ukzip = '[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}'
                if re.match(ukzip, lines[-1]):
                    cp = lines.pop()
                    city = lines.pop()
                    return (cp, city)
            elif country == 'SE':
                result = re.match('([0-9]{3}\s?[0-9]{2})\s?([A-Z]+)', lines[-1])
                if result:
                    lines.pop()
                    return (result.group(1), result.group(2))
            else:
                result = re.match('((?:L-|AT-)?[0-9\-]+[A-Z]{,2}) (.+)', lines[-1])
                if result:
                    lines.pop()
                    return (result.group(1), result.group(2))
            return False

        partner_vat = self.compact_vat_number(vat)
        result = self.vies_vat_check(partner_vat[:2], partner_vat[2:])

        if not result:
            return False, {}
        partner_name = False
        partner_address = {}
        if result['name'] != '---':
            partner_name = result['name']

        #parse the address from VIES and fill the partner's data
        if result['address'] == '---': return partner_name, {}

        lines = [x for x in result['address'].split("\n") if x]
        if len(lines) == 1:
            lines = [x.strip() for x in lines[0].split(',') if x]
        if len(lines) == 1:
            lines = [x.strip() for x in lines[0].split('   ') if x]

        partner_address['street'] = lines.pop(0)
        #_set_address_field(partner, 'street', lines.pop(0))

        if len(lines) > 0:
            res = _check_city(lines, result['countryCode'])
            if res:
                partner_address['zip'] = res[0]
                partner_address['city'] = res[1]
                #_set_address_field(partner, 'zip', res[0])
                #_set_address_field(partner, 'city', res[1])
        if len(lines) > 0:
            partner_address['street2'] = lines.pop(0)
            #_set_address_field(partner, 'street2', lines.pop(0))

        country = self.env['res.country'].search([('code', '=', result['countryCode'])], limit=1)

        #_set_address_field(partner, 'country_id', country and country.id or False)
        partner_address['country_id'] = country and country.id or False
        return partner_name, partner_address

    @api.onchange('vat')
    def vies_vat_change(self):
        eu_country_codes = self.env.ref('base.europe').country_ids.mapped('code')
        for partner in self:
            if not partner.vat:
                continue
            # If a field is not set in the response, wipe it anyway
            non_set_address_fields = set(['street', 'street2', 'city', 'zip', 'state_id', 'country_id'])
            if len(partner.vat) > 5 and partner.vat[:2].upper() in eu_country_codes:
                partner_name, partner_address = self._get_partner_vals(partner.vat)

                if not partner.name and partner_name:
                    partner.name = partner_name

                if partner_address:
                    #set the address fields
                    for field, value in partner_address.items():
                        partner[field] = value
                        non_set_address_fields.remove(field)
                    for field in non_set_address_fields:
                        if partner[field]:
                            partner[field] = False


class ResCompany(models.Model):
    _inherit = 'res.company'

    @api.onchange('vat')
    def vies_vat_change(self):
        self.ensure_one()
        company_address_fields = set(['street', 'street2', 'city', 'zip', 'state_id', 'country_id'])
        company_name, company_address = self.env['res.partner']._get_partner_vals(self.vat)
        if not self.name and company_name:
            self.name = company_name
        #set the address fields
        for field, value in company_address.items():
            self[field] = value
            company_address_fields.remove(field)
        for field in company_address_fields:
            if self[field]:
                self[field] = False
