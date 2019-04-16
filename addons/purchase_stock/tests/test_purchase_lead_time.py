# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import timedelta

from odoo import fields
from .common import TestPurchase


class TestPurchaseLeadTime(TestPurchase):

    def test_00_product_company_level_delays(self):
        """ To check dates, set product's Delivery Lead Time
            and company's Purchase Lead Time."""

        company = self.env.ref('base.main_company')

        # Update company with Purchase Lead Time
        company.write({'po_lead': 3.00})

        # Make procurement request from product_1's form view, create procurement and check it's state
        date_planned = fields.Datetime.to_string(fields.datetime.now() + timedelta(days=10))
        self._create_make_procurement(self.product_1, 15.00, date_planned=date_planned)
        purchase = self.env['purchase.order.line'].search([('product_id', '=', self.product_1.id)], limit=1).order_id
        

        # Confirm purchase order
        purchase.button_confirm()

        # Check order date of purchase order
        order_date = fields.Datetime.from_string(date_planned) - timedelta(days=company.po_lead) - timedelta(days=self.product_1.seller_ids.delay)
        self.assertEqual(purchase.date_order, order_date, 'Order date should be equal to: Date of the procurement order - Purchase Lead Time - Delivery Lead Time.')

        # Check scheduled date of purchase order
        schedule_date = order_date + timedelta(days=self.product_1.seller_ids.delay)
        self.assertEqual(purchase.date_planned, schedule_date, 'Schedule date should be equal to: Order date of Purchase order + Delivery Lead Time.')

        # check the picking created or not
        self.assertTrue(purchase.picking_ids, "Picking should be created.")

        # Check scheduled date of In Type shipment
        self.assertEqual(purchase.picking_ids.scheduled_date, schedule_date, 'Schedule date of In type shipment should be equal to: schedule date of purchase order.')

    def test_01_product_level_delay(self):
        """ To check schedule dates of multiple purchase order line of the same purchase order,
            we create two procurements for the two different product with same vendor
            and different Delivery Lead Time."""

        # Make procurement request from product_1's form view, create procurement and check it's state
        date_planned1 = fields.Datetime.to_string(fields.datetime.now() + timedelta(days=10))
        self._create_make_procurement(self.product_1, 10.00, date_planned=date_planned1)
        purchase1 = self.env['purchase.order.line'].search([('product_id', '=', self.product_1.id)], limit=1).order_id

        # Make procurement request from product_2's form view, create procurement and check it's state
        date_planned2 = fields.Datetime.to_string(fields.datetime.now() + timedelta(days=10))
        self._create_make_procurement(self.product_2, 5.00, date_planned=date_planned2)
        purchase2 = self.env['purchase.order.line'].search([('product_id', '=', self.product_2.id)], limit=1).order_id

        # Check purchase order is same or not
        self.assertEqual(purchase1, purchase2, 'Purchase orders should be same for the two different product with same vendor.')

        # Confirm purchase order
        purchase1.button_confirm()

        # Check order date of purchase order
        order_line_pro_1 = purchase2.order_line.filtered(lambda r: r.product_id == self.product_1)
        order_line_pro_2 = purchase2.order_line.filtered(lambda r: r.product_id == self.product_2)
        order_date = fields.Datetime.from_string(date_planned1) - timedelta(days=self.product_1.seller_ids.delay)
        self.assertEqual(purchase2.date_order, order_date, 'Order date should be equal to: Date of the procurement order - Delivery Lead Time.')

        # Check scheduled date of purchase order line for product_1
        schedule_date_1 = order_date + timedelta(days=self.product_1.seller_ids.delay)
        self.assertEqual(order_line_pro_1.date_planned, schedule_date_1, 'Schedule date of purchase order line for product_1 should be equal to: Order date of purchase order + Delivery Lead Time of product_1.')

        # Check scheduled date of purchase order line for product_2
        schedule_date_2 = order_date + timedelta(days=self.product_2.seller_ids.delay)
        self.assertEqual(order_line_pro_2.date_planned, schedule_date_2, 'Schedule date of purchase order line for product_2 should be equal to: Order date of purchase order + Delivery Lead Time of product_2.')

        # Check scheduled date of purchase order
        po_schedule_date = min(schedule_date_1, schedule_date_2)
        self.assertEqual(purchase2.date_planned, po_schedule_date, 'Schedule date of purchase order should be minimum of schedule dates of purchase order lines.')

        # Check the picking created or not
        self.assertTrue(purchase2.picking_ids, "Picking should be created.")

        # Check scheduled date of In Type shipment
        self.assertEqual(purchase2.picking_ids.scheduled_date, po_schedule_date, 'Schedule date of In type shipment should be same as schedule date of purchase order.')

    def test_02_product_route_level_delays(self):
        """ In order to check dates, set product's Delivery Lead Time
            and warehouse route's delay."""

        # Update warehouse_1 with Incoming Shipments 3 steps
        self.warehouse_1.write({'reception_steps': 'three_steps'})

        # Set delay on push rule
        for push_rule in self.warehouse_1.reception_route_id.rule_ids:
            push_rule.write({'delay': 2})

        rule_delay = sum(self.warehouse_1.reception_route_id.rule_ids.mapped('delay'))

        date_planned = fields.Datetime.to_string(fields.datetime.now() + timedelta(days=10))
        # Create procurement order of product_1
        self.env['procurement.group'].run([self.env['procurement.group'].Procurement(
            self.product_1, 5.000, self.uom_unit, self.warehouse_1.lot_stock_id, 'Test scheduler for RFQ', '/', self.env.user.company_id,
            {
                'warehouse_id': self.warehouse_1,
                'date_planned': date_planned,  # 10 days added to current date of procurement to get future schedule date and order date of purchase order.
                'rule_id': self.warehouse_1.buy_pull_id,
                'group_id': False,
                'route_ids': [],
            }
        )])

        # Confirm purchase order

        purchase = self.env['purchase.order.line'].search([('product_id', '=', self.product_1.id)], limit=1).order_id
        purchase.button_confirm()

        # Check order date of purchase order
        order_date = fields.Datetime.from_string(date_planned) - timedelta(days=self.product_1.seller_ids.delay + rule_delay)
        self.assertEqual(purchase.date_order, order_date, 'Order date should be equal to: Date of the procurement order - Delivery Lead Time(supplier and pull rules).')

        # Check scheduled date of purchase order
        schedule_date = order_date + timedelta(days=self.product_1.seller_ids.delay + rule_delay)
        self.assertEqual(date_planned, str(schedule_date), 'Schedule date should be equal to: Order date of Purchase order + Delivery Lead Time(supplier and pull rules).')

        # Check the picking crated or not
        self.assertTrue(purchase.picking_ids, "Picking should be created.")

        # Check scheduled date of Internal Type shipment
        incoming_shipment1 = self.env['stock.picking'].search([('move_lines.product_id', 'in', (self.product_1.id, self.product_2.id)), ('picking_type_id', '=', self.warehouse_1.int_type_id.id), ('location_id', '=', self.warehouse_1.wh_input_stock_loc_id.id), ('location_dest_id', '=', self.warehouse_1.wh_qc_stock_loc_id.id)])
        incoming_shipment1_date = order_date + timedelta(days=self.product_1.seller_ids.delay)
        self.assertEqual(incoming_shipment1.scheduled_date, incoming_shipment1_date, 'Schedule date of Internal Type shipment for input stock location should be equal to: schedule date of purchase order + push rule delay.')

        incoming_shipment2 = self.env['stock.picking'].search([('picking_type_id', '=', self.warehouse_1.int_type_id.id), ('location_id', '=', self.warehouse_1.wh_qc_stock_loc_id.id), ('location_dest_id', '=', self.warehouse_1.lot_stock_id.id)])
        incoming_shipment2_date = schedule_date - timedelta(days=incoming_shipment2.move_lines[0].rule_id.delay)
        self.assertEqual(incoming_shipment2.scheduled_date, incoming_shipment2_date, 'Schedule date of Internal Type shipment for quality control stock location should be equal to: schedule date of Internal type shipment for input stock location + push rule delay..')

    def _create_outgoing_shipment(self):
        # This is a private method used to create purchase order from picking out i.e. delivery.
        self.supplier = self.env['res.partner'].create({'name': "George"})
        self.customer = self.env['res.partner'].create({'name': "jacky"})

        stock_location = self.env.ref('stock.stock_location_stock')
        cust_location = self.env.ref('stock.stock_location_customers')
        seller = self.env['product.supplierinfo'].create({
            'name': self.supplier.id,
            'price': 100.0,
        })

        # Create a product - Product A with route - Buy and MTO and set the vendor.
        product = self.env['product.product'].create({
            'name': 'Product A',
            'type': 'product',
            'route_ids': [(4, self.route_mto), (4, self.route_buy)],
            'seller_ids': [(6, 0, [seller.id])],
            'categ_id': self.env.ref('product.product_category_all').id,
        })

        picking_out = self.env['stock.picking'].create({
            'location_id': stock_location.id,
            'location_dest_id': cust_location.id,
            'partner_id': self.customer.id,
            'picking_type_id': self.ref('stock.picking_type_out'),
        })

        out_move = self.env['stock.move'].create({
            'name': product.name,
            'product_id': product.id,
            'product_uom_qty': 10,
            'product_uom': product.uom_id.id,
            'picking_id': picking_out.id,
            'location_id': stock_location.id,
            'location_dest_id': cust_location.id,
            'procure_method': 'make_to_order',
            'previous_move_propagate': True
        })
        picking_out.action_confirm()  # by confirming move1 one purchase order will be created
        return picking_out, out_move

    def test_03_forward_cancel_draft_po(self):
        """ Test canceling purchase order based on forward canceling option on the rule.
            - Create a outgoing picking.
            - Confirm it, a purchase order is generated from it
            - Then cancel outgoing shipment.
            - Purchase order state should be cancelled.
        """
        # Create outgoing shipment.
        picking_out, out = self._create_outgoing_shipment()
        # Find the purchase order generated.
        purchase_order = self.env['purchase.order'].search([('partner_id', '=', self.supplier.id), ('state', '=', 'draft')])
        self.assertTrue(purchase_order, 'Purchase order should be created.')
        # Cancel outgoing shipment should cancel purchase order.
        picking_out.action_cancel()
        # Check status of the purchase order.
        self.assertEquals(purchase_order.state, 'cancel')

    def test_04_forward_cancel_confirm_po(self):
        """ Test canceling purchase order based on forward canceling option on the rule.
            - Create a outgoing picking.
            - Confirm it, a purchase order is generated from it.
            - Confirm the purchase order.
            - Then cancel outgoing shipment
            - Purchase order state should be cancelled.
        """
        # Create outgoing shipment.
        picking_out, out = self._create_outgoing_shipment()
        # Find the purchase order generated.
        purchase_order = self.env['purchase.order'].search([('partner_id', '=', self.supplier.id), ('state', '=', 'draft')])
        self.assertTrue(purchase_order, 'Purchase order should be created.')
        purchase_order.button_confirm()
        # Cancel outgoing shipment should cancel purchase order.
        picking_out.action_cancel()
        # Check status of the purchase order.
        self.assertEquals(purchase_order.state, 'purchase')