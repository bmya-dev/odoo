
# -*- coding: utf-8 -*-
from odoo.addons.account.tests.account_test_savepoint import AccountingSavepointCase
from odoo.tests.common import Form
from odoo.tests import tagged
from odoo import fields

import logging
_logger = logging.getLogger(__name__)


@tagged('post_install', '-at_install')
class TestAccountMoveReversal(AccountingSavepointCase):

    # -------------------------------------------------------------------------
    # TESTS out_invoice
    # -------------------------------------------------------------------------

    def test_reversal_out_invoice_1_draft_refund(self):
        # Create an 'out_invoice' journal entry.
        move = self.env['account.move'].with_context(type='out_invoice').create({
            'type': 'out_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 1000.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.taxes_id.ids)],
            })]
        })

        # Create an 'out_refund' journal entry with refund_method='refund'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'refund',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_sale_1.name,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_sale_1.id,
            'type': 'out_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 1000.0,
            'amount_tax': 150.0,
            'amount_total': 1150.0,
            'residual': 1150.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])

    def test_reversal_out_invoice_2_cancel_refund(self):
        # Create an 'out_invoice' journal entry.
        move = self.env['account.move'].with_context(type='out_invoice').create({
            'type': 'out_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 1000.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.taxes_id.ids)],
            })]
        })

        # Create an 'out_refund' journal entry with refund_method='cancel'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'cancel',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
            {
                'name': self.parent_tax_sale_1.name,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_sale_1.id,
            'type': 'out_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 1000.0,
            'amount_tax': 150.0,
            'amount_total': 1150.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

    def test_reversal_out_invoice_3_modify_refund(self):
        # Create an 'out_invoice' journal entry.
        move = self.env['account.move'].with_context(type='out_invoice').create({
            'type': 'out_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 1000.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.taxes_id.ids)],
            })]
        })
        
        # Create an 'out_refund' journal entry with refund_method='modify'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'modify',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = move.mapped('line_ids.matched_credit_ids.credit_move_id.move_id')
        draft_move = self.env['account.move'].browse(reversal['res_id'])

        # Check the reverse_move.
        self.assertTrue(reverse_move.exists())
        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_sale_1.name,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_sale_1.id,
            'type': 'out_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 1000.0,
            'amount_tax': 150.0,
            'amount_total': 1150.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

        # Check the draft move.
        self.assertAmlsValues(draft_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1000.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(draft_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_sale_1.name,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1000.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(draft_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_sale_1.id,
            'type': 'out_invoice',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': '/',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 1000.0,
            'amount_tax': 150.0,
            'amount_total': 1150.0,
            'residual': 1150.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])

    # -------------------------------------------------------------------------
    # TESTS in_invoice
    # -------------------------------------------------------------------------

    def test_reversal_in_invoice_1_draft_refund(self):
        # Create an 'in_invoice' journal entry.
        move = self.env['account.move'].with_context(type='in_invoice').create({
            'type': 'in_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 800.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.supplier_taxes_id.ids)],
            })]
        })

        # Create an 'out_refund' journal entry with refund_method='refund'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'refund',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_payable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -920.0,
                'price_subtotal': -920.0,
                'price_total': -920.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 920.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_sale_1.name,
                'product_id': False,
                'account_id': self.parent_tax_purchase_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 120.0,
                'price_subtotal': 120.0,
                'price_total': 120.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_purchase_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 120.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_purchase_1.id,
            'type': 'in_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 800.0,
            'amount_tax': 120.0,
            'amount_total': 920.0,
            'residual': 920.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])

    def test_reversal_in_invoice_2_cancel_refund(self):
        # Create an 'in_invoice' journal entry.
        move = self.env['account.move'].with_context(type='in_invoice').create({
            'type': 'in_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 800.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.supplier_taxes_id.ids)],
            })]
        })

        # Create an 'out_refund' journal entry with refund_method='cancel'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'cancel',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_payable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -920.0,
                'price_subtotal': -920.0,
                'price_total': -920.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 920.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
            {
                'name': self.parent_tax_purchase_1.name,
                'product_id': False,
                'account_id': self.parent_tax_purchase_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 120.0,
                'price_subtotal': 120.0,
                'price_total': 120.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_purchase_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 120.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
                'amount_residual': 0.0,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_purchase_1.id,
            'type': 'in_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 800.0,
            'amount_tax': 120.0,
            'amount_total': 920.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

    def test_reversal_in_invoice_3_modify_refund(self):
        # Create an 'in_invoice' journal entry.
        move = self.env['account.move'].with_context(type='in_invoice').create({
            'type': 'in_invoice',
            'partner_id': self.partner_a.id,
            'invoice_date': fields.Date.from_string('2019-01-01'),
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'invoice_line_ids': [(0, None, {
                'partner_id': self.partner_a.id,
                'product_id': self.product_a.id,
                'product_uom_id': self.product_a.uom_id.id,
                'name': self.product_a.name,
                'price_unit': 800.0,
                'quantity': 1,
                'tax_ids': [(6, 0, self.product_a.supplier_taxes_id.ids)],
            })]
        })

        # Create an 'out_refund' journal entry with refund_method='modify'.
        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'modify',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = move.mapped('line_ids.matched_debit_ids.debit_move_id.move_id')
        draft_move = self.env['account.move'].browse(reversal['res_id'])

        # Check the reverse_move.
        self.assertTrue(reverse_move.exists())
        self.assertAmlsValues(reverse_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_payable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -920.0,
                'price_subtotal': -920.0,
                'price_total': -920.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 920.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_purchase_1.name,
                'product_id': False,
                'account_id': self.parent_tax_purchase_1.refund_account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 120.0,
                'price_subtotal': 120.0,
                'price_total': 120.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_purchase_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 120.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 800.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_purchase_1.id,
            'type': 'in_refund',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 800.0,
            'amount_tax': 120.0,
            'amount_total': 920.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

        # Check the draft move.
        self.assertAmlsValues(draft_move.invoice_line_ids, [
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 800.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertAmlsValues(draft_move.line_ids, [
            {
                'name': '/',
                'product_id': False,
                'account_id': self.parent_acc_payable_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -920.0,
                'price_subtotal': -920.0,
                'price_total': -920.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 920.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'balance',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': self.parent_tax_purchase_1.name,
                'product_id': False,
                'account_id': self.parent_tax_purchase_1.account_id.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 120.0,
                'price_subtotal': 120.0,
                'price_total': 120.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_purchase_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 120.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': 'tax',
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
            {
                'name': 'product_a',
                'product_id': self.product_a.id,
                'account_id': self.parent_acc_expense_1.id,
                'partner_id': self.partner_a.id,
                'product_uom_id': self.uom_unit.id,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 800.0,
                'price_subtotal': 800.0,
                'price_total': 920.0,
                'tax_ids': self.parent_tax_purchase_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 800.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': fields.Date.from_string('2019-01-01'),
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(draft_move, [{
            'partner_id': self.partner_a.id,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_purchase_1.id,
            'type': 'in_invoice',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': '/',
            'invoice_payment_term_id': self.pay_terms_immediate.id,
            'amount_untaxed': 800.0,
            'amount_tax': 120.0,
            'amount_total': 920.0,
            'residual': 920.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])

    # -------------------------------------------------------------------------
    # TESTS Miscellaneous operations
    # -------------------------------------------------------------------------

    def test_reversal_misc_1_draft_refund(self):
        move = self.env['account.move'].create({
            'type': 'misc',
            'line_ids': [
                (0, None, {
                    'account_id': self.parent_acc_revenue_1.id,
                    'debit': 0.0,
                    'credit': 1000.0,
                    'tax_ids': [(6, 0, self.parent_tax_sale_1.ids)],
                }),
                (0, None, {
                    'account_id': self.parent_tax_sale_1.account_id.id,
                    'debit': 0.0,
                    'credit': 150.0,
                    'tax_line_id': self.parent_tax_sale_1.id,
                }),
                (0, None, {
                    'account_id': self.parent_acc_receivable_1.id,
                    'debit': 1150.0,
                    'credit': 0.0,
                }),
            ]
        })

        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'refund',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.account_id.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': False,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_misc_1.id,
            'type': 'misc',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': False,
            'amount_total': 1150.0,
            'residual': 1150.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])

    def test_reversal_misc_2_cancel_refund(self):
        move = self.env['account.move'].create({
            'type': 'misc',
            'line_ids': [
                (0, None, {
                    'account_id': self.parent_acc_revenue_1.id,
                    'debit': 0.0,
                    'credit': 1000.0,
                    'tax_ids': [(6, 0, self.parent_tax_sale_1.ids)],
                }),
                (0, None, {
                    'account_id': self.parent_tax_sale_1.account_id.id,
                    'debit': 0.0,
                    'credit': 150.0,
                    'tax_line_id': self.parent_tax_sale_1.id,
                }),
                (0, None, {
                    'account_id': self.parent_acc_receivable_1.id,
                    'debit': 1150.0,
                    'credit': 0.0,
                }),
            ]
        })

        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'cancel',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = self.env['account.move'].browse(reversal['res_id'])

        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.account_id.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': False,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_misc_1.id,
            'type': 'misc',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': False,
            'amount_total': 1150.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

    def test_reversal_misc_3_modify_refund(self):
        move = self.env['account.move'].create({
            'type': 'misc',
            'line_ids': [
                (0, None, {
                    'account_id': self.parent_acc_revenue_1.id,
                    'debit': 0.0,
                    'credit': 1000.0,
                    'tax_ids': [(6, 0, self.parent_tax_sale_1.ids)],
                }),
                (0, None, {
                    'account_id': self.parent_tax_sale_1.account_id.id,
                    'debit': 0.0,
                    'credit': 150.0,
                    'tax_line_id': self.parent_tax_sale_1.id,
                }),
                (0, None, {
                    'account_id': self.parent_acc_receivable_1.id,
                    'debit': 1150.0,
                    'credit': 0.0,
                }),
            ]
        })

        move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
            'date': fields.Date.from_string('2019-01-01'),
            'reason': 'no reason',
            'refund_method': 'modify',
        })
        reversal = move_reversal.reverse_moves()
        reverse_move = move.mapped('line_ids.matched_credit_ids.credit_move_id.move_id')
        draft_move = self.env['account.move'].browse(reversal['res_id'])

        # Check the reverse_move.
        self.assertTrue(reverse_move.exists())
        self.assertAmlsValues(reverse_move.line_ids, [
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1150.0,
                'price_subtotal': -1150.0,
                'price_total': -1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.account_id.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 150.0,
                'price_subtotal': 150.0,
                'price_total': 150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1000.0,
                'price_subtotal': 1000.0,
                'price_total': 1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1000.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(reverse_move, [{
            'partner_id': False,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_misc_1.id,
            'type': 'misc',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': 'no reason',
            'invoice_payment_term_id': False,
            'amount_total': 1150.0,
            'residual': 0.0,
            'state': 'posted',
            'invoice_payment_state': 'paid',
        }])

        # Check the draft move.
        self.assertAmlsValues(draft_move.line_ids, [
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_revenue_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -1000.0,
                'price_subtotal': -1000.0,
                'price_total': -1150.0,
                'tax_ids': self.parent_tax_sale_1.ids,
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 1000.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_tax_sale_1.account_id.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': -150.0,
                'price_subtotal': -150.0,
                'price_total': -150.0,
                'tax_ids': [],
                'tax_line_id': self.parent_tax_sale_1.id,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 0.0,
                'credit': 150.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
            {
                'name': False,
                'product_id': False,
                'account_id': self.parent_acc_receivable_1.id,
                'partner_id': False,
                'product_uom_id': False,
                'quantity': 1.0,
                'discount': 0.0,
                'price_unit': 1150.0,
                'price_subtotal': 1150.0,
                'price_total': 1150.0,
                'tax_ids': [],
                'tax_line_id': False,
                'currency_id': False,
                'amount_currency': 0.0,
                'debit': 1150.0,
                'credit': 0.0,
                'analytic_account_id': False,
                'analytic_tag_ids': [],
                'display_type': False,
                'date_maturity': False,
                'tax_exigible': True,
            },
        ])
        self.assertRecordValues(draft_move, [{
            'partner_id': False,
            'currency_id': self.company_parent.currency_id.id,
            'journal_id': self.parent_journal_misc_1.id,
            'type': 'misc',
            'date': fields.Date.from_string('2019-01-01'),
            'fiscal_position_id': False,
            'invoice_payment_ref': '/',
            'invoice_payment_term_id': False,
            'amount_total': 1150.0,
            'residual': -1150.0,
            'state': 'draft',
            'invoice_payment_state': 'not_paid',
        }])









































    # def test_out_invoice_refund_and_reconcile_date(self):
    #     move_form = Form(self.env['account.move'].with_context(type='out_invoice'))
    #     move_form.invoice_date = fields.Date.from_string('2019-01-01')
    #     move_form.partner_id = self.partner_a
    #     with move_form.invoice_line_ids.new() as line_form:
    #         line_form.product_id = self.product_a
    #     move = move_form.save()
    #     move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
    #         'date': fields.Date.from_string('2017-01-01'),
    #         'invoice_date': fields.Date.from_string('2018-01-01'),
    #         'reason': 'no reason',
    #         'refund_method': 'cancel',
    #     })
    #     reversal = move_reversal.reverse_moves()
    #     reverse_move = self.env['account.move'].browse(reversal['res_id'])
    #
    #     self.assertAmlsValues(reverse_move.invoice_line_ids, [
    #         {
    #             'name': 'product_a',
    #             'product_id': self.product_a.id,
    #             'account_id': self.parent_acc_revenue_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': self.uom_unit.id,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 1000.0,
    #             'price_subtotal': 1000.0,
    #             'price_total': 1150.0,
    #             'tax_ids': self.parent_tax_sale_1.ids,
    #             'tax_line_id': False,
    #             'currency_id': False,
    #             'amount_currency': 0.0,
    #             'debit': 1000.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': False,
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #     ])
    #     self.assertAmlsValues(reverse_move.line_ids, [
    #         {
    #             'name': '/',
    #             'product_id': False,
    #             'account_id': self.parent_acc_receivable_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': False,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': -1150.0,
    #             'price_subtotal': -1150.0,
    #             'price_total': -1150.0,
    #             'tax_ids': [],
    #             'tax_line_id': False,
    #             'currency_id': False,
    #             'amount_currency': 0.0,
    #             'debit': 0.0,
    #             'credit': 1150.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': 'balance',
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #         {
    #             'name': self.parent_tax_sale_1.name,
    #             'product_id': False,
    #             'account_id': self.parent_tax_sale_1.refund_account_id.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': False,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 150.0,
    #             'price_subtotal': 150.0,
    #             'price_total': 150.0,
    #             'tax_ids': [],
    #             'tax_line_id': self.parent_tax_sale_1.id,
    #             'currency_id': False,
    #             'amount_currency': 0.0,
    #             'debit': 150.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': 'tax',
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #         {
    #             'name': 'product_a',
    #             'product_id': self.product_a.id,
    #             'account_id': self.parent_acc_revenue_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': self.uom_unit.id,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 1000.0,
    #             'price_subtotal': 1000.0,
    #             'price_total': 1150.0,
    #             'tax_ids': self.parent_tax_sale_1.ids,
    #             'tax_line_id': False,
    #             'currency_id': False,
    #             'amount_currency': 0.0,
    #             'debit': 1000.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': False,
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #     ])
    #     self.assertRecordValues(reverse_move, [{
    #         'partner_id': self.partner_a.id,
    #         'currency_id': self.company_parent.currency_id.id,
    #         'journal_id': self.parent_journal_sale_1.id,
    #         'type': 'out_refund',
    #         'date': fields.Date.from_string('2017-01-01'),
    #         'invoice_date': fields.Date.from_string('2018-01-01'),
    #         'fiscal_position_id': False,
    #         'invoice_payment_ref': 'no reason',
    #         'invoice_payment_term_id': self.pay_terms_immediate.id,
    #         'amount_untaxed': 1000.0,
    #         'amount_tax': 150.0,
    #         'amount_total': 1150.0,
    #         'residual': 0.0,
    #     }])
    #
    # def test_out_invoice_refund_simple_currency(self):
    #     move_form = Form(self.env['account.move'].with_context(type='out_invoice'))
    #     move_form.invoice_date = fields.Date.from_string('2019-01-01')
    #     move_form.partner_id = self.partner_a
    #     move_form.currency_id = self.gold_currency
    #     with move_form.invoice_line_ids.new() as line_form:
    #         line_form.product_id = self.product_a
    #     move = move_form.save()
    #     move_reversal = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
    #         'date': fields.Date.from_string('2019-01-01'),
    #         'invoice_date': fields.Date.from_string('2019-01-01'),
    #         'reason': 'no reason',
    #         'refund_method': 'cancel',
    #     })
    #
    #     reversal = move_reversal.reverse_moves()
    #     reverse_move = self.env['account.move'].browse(reversal['res_id'])
    #
    #     self.assertAmlsValues(reverse_move.invoice_line_ids, [
    #         {
    #             'name': 'product_a',
    #             'product_id': self.product_a.id,
    #             'account_id': self.parent_acc_expense_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': self.uom_unit.id,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 2000.0,
    #             'price_subtotal': 2000.0,
    #             'price_total': 2300.0,
    #             'tax_ids': self.parent_tax_sale_1.ids,
    #             'tax_line_id': False,
    #             'currency_id': self.gold_currency.id,
    #             'amount_currency': 2000.0,
    #             'debit': 1000.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': False,
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #     ])
    #     self.assertAmlsValues(reverse_move.line_ids, [
    #         {
    #             'name': '/',
    #             'product_id': False,
    #             'account_id': self.parent_acc_receivable_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': False,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': -2300.0,
    #             'price_subtotal': -2300.0,
    #             'price_total': -2300.0,
    #             'tax_ids': [],
    #             'tax_line_id': False,
    #             'currency_id': self.gold_currency.id,
    #             'amount_currency': -2300.0,
    #             'debit': 0.0,
    #             'credit': 1150.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': 'balance',
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #         {
    #             'name': self.parent_tax_sale_1.name,
    #             'product_id': False,
    #             'account_id': self.parent_tax_sale_1.refund_account_id.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': False,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 300.0,
    #             'price_subtotal': 300.0,
    #             'price_total': 300.0,
    #             'tax_ids': [],
    #             'tax_line_id': self.parent_tax_sale_1.id,
    #             'currency_id': self.gold_currency.id,
    #             'amount_currency': 300.0,
    #             'debit': 150.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': 'tax',
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #         {
    #             'name': 'product_a',
    #             'product_id': self.product_a.id,
    #             'account_id': self.parent_acc_revenue_1.id,
    #             'partner_id': self.partner_a.id,
    #             'product_uom_id': self.uom_unit.id,
    #             'quantity': 1.0,
    #             'discount': 0.0,
    #             'price_unit': 2000.0,
    #             'price_subtotal': 2000.0,
    #             'price_total': 2300.0,
    #             'tax_ids': self.parent_tax_sale_1.ids,
    #             'tax_line_id': False,
    #             'currency_id': self.gold_currency.id,
    #             'amount_currency': 2000.0,
    #             'debit': 1000.0,
    #             'credit': 0.0,
    #             'analytic_account_id': False,
    #             'analytic_tag_ids': [],
    #             'display_type': False,
    #             'date_maturity': fields.Date.from_string('2019-01-01'),
    #             'tax_exigible': True,
    #             'amount_residual': 0.0,
    #         },
    #     ])
    #     self.assertRecordValues(reverse_move, [{
    #         'partner_id': self.partner_a.id,
    #         'currency_id': self.gold_currency.id,
    #         'journal_id': self.parent_journal_sale_1.id,
    #         'type': 'out_refund',
    #         'date': fields.Date.from_string('2019-01-01'),
    #         'fiscal_position_id': False,
    #         'invoice_payment_ref': 'no reason',
    #         'invoice_payment_term_id': self.pay_terms_immediate.id,
    #         'amount_untaxed': 2000.0,
    #         'amount_tax': 300.0,
    #         'amount_total': 2300.0,
    #         'residual': 0.0,
    #     }])
    #
    # def test_in_invoice_refund_already_refund_not_allowed(self):
    #     move_form = Form(self.env['account.move'].with_context(type='out_invoice'))
    #     move_form.invoice_date = fields.Date.from_string('2019-01-01')
    #     move_form.partner_id = self.partner_a
    #     with move_form.invoice_line_ids.new() as line_form:
    #         line_form.product_id = self.product_a
    #     move = move_form.save()
    #     move_reversal_1 = self.env['account.move.reversal'].with_context(active_ids=move.ids).create({
    #         'date': fields.Date.from_string('2019-01-01'),
    #         'invoice_date': fields.Date.from_string('2019-01-01'),
    #         'reason': 'no reason',
    #         'refund_method': 'cancel',
    #     })
    #     move_reversal_2 = move_reversal_1.copy()
    #
    #     move_reversal_1.reverse_moves()
    #     with self.assertRaises(UserError):
    #         move_reversal_2.reverse_moves()