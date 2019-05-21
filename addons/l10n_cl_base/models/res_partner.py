# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

class ResPartner(models.Model):
    _name = 'res.partner'
    _inherit = 'res.partner'

    def _get_validation_module(self):
        self.ensure_one()
        if self.l10n_cl_identification_type_id.code in ['RUT', 'RUN']:
            country_validator = getattr(__import__('stdnum', fromlist=['cl']), 'cl')
            return country_validator.rut
        elif self.country_id:
            country_origin = self.country_id.code.lower()
            country_validator = getattr(__import__('stdnum', fromlist=[country_origin]), country_origin)
            return country_validator.vat
        else:
            return False

    def l10n_cl_identification_validator(self):
        for rec in self.filtered('vat'):
            module = rec._get_validation_module()
            if not module:
                continue
            try:
                module.validate(rec.vat)
            except module.InvalidChecksum:
                raise ValidationError(_('The validation digit is not valid.'))
            except module.InvalidLength:
                raise ValidationError(_('Invalid length.'))
            except module.InvalidFormat:
                raise ValidationError(_('Only numbers allowed.'))
            except Exception as error:
                raise ValidationError(repr(error))

    l10n_cl_identification_type_id = fields.Many2one(
        string="Identification Type",
        comodel_name='l10n_cl.identification.type',
        index=True,
        auto_join=True,
        help='The type of identifications used in Chile that could identify'
        ' a physical or legal person',
    )
    l10n_cl_rut = fields.Char(
        compute='_compute_l10n_cl_rut',
        string="Invoicing RUT",
        help='Computed field that will convert the given rut number to often'
        ' local used format',
    )
    l10n_cl_rut_dv = fields.Char(
        compute='_compute_l10n_cl_rut',
        string="RUT's DV",
        help='Computed field that returns RUT or nothing if this one is not'
        ' set for the partner',
    )

    @api.constrains('vat', 'l10n_cl_identification_type_id')
    def check_vat(self):
        l10n_cl_partners = self.filtered('l10n_cl_identification_type_id')
        l10n_cl_partners.l10n_cl_identification_validator()
        return super(ResPartner, self - l10n_cl_partners).check_vat()

    @api.depends('vat', 'country_id')
    @api.onchange('vat', 'country_id')
    def _compute_l10n_cl_rut(self):
        """ This will add some dash to the rut number in order to show in his
        natural format: {person_category}-{number}-{validation_number}
        """
        for rec in self.filtered('vat'):
            module = rec._get_validation_module()
            rec.l10n_cl_rut = module.format(rec.vat).replace('.', '')
            # rec.l10n_cl_rut = stdnum.cl.vat.format(rec.vat).replace('.', '')
            rec.vat = rec.l10n_cl_rut
            commercial_partner = rec.commercial_partner_id
            if commercial_partner.country_id:
                origin_country = commercial_partner.country_id.code.lower()
                _logger.info('origin country: %s' % origin_country)
                # country_formatter = getattr(__import__('stdnum', fromlist=[origin_country]), origin_country)
                rec.vat = module.format(rec.vat)
                if origin_country == 'cl':
                    rec.vat = rec.vat.replace('.', '')
                    rec.l10n_cl_rut = rec.vat
                    rec.l10n_cl_rut_dv = rec.vat[-1:]
                else:
                    rec.l10n_cl_rut = '55555555-5'
                    rec.l10n_cl_rut_dv = '5'

    # @api.depends('l10n_cl_identification_type_id', 'vat')
    # def _compute_l10n_cl_rut_dv(self):
    #     for rec in self:
    #         commercial_partner = rec.commercial_partner_id
    #         if commercial_partner.country_id:
    #             if commercial_partner.country_id.code == 'CL':
    #                 rec.l10n_cl_rut_dv = rec.vat[-1:]
    #                 # If the partner is not from Chile then we return the defined
    #                 # country rut defined by sii for that specific partner
    #             else:
    #                 rec.l10n_cl_rut_dv = '5'

    # @api.model
    # def _commercial_fields(self):
    #     return super(ResPartner, self)._commercial_fields() + [
    #         'l10n_cl_identification_type_id']

    @api.multi
    def validate_rut(self):
        self.ensure_one()
        if not self.l10n_cl_rut:
            raise UserError(_(
                'No RUT configured for partner [%i] %s') % (self.id, self.name))
        return self.l10n_cl_rut

    @api.onchange('country_id')
    def _adjust_identification_type(self):
        if self.country_id == self.env.ref('base.cl'):
            self.l10n_cl_identification_type_id = self.env.ref('l10n_cl_base.dt_RUT')
        else:
            self.l10n_cl_identification_type_id = self.env.ref('l10n_cl_base.dt_XVAT')
