from openerp import fields, models
from openerp import tools

class report_stock_forecast(models.Model):
    _name = 'report.stock.forecast'
    _auto = False


    date = fields.Datetime(string='Date')
    product_id = fields.Many2one('product.product', string='Product', required=True)
    cumulative_quantity = fields.Float(string='Cumulative Quantity')
    quantity = fields.Integer(string='Quantity')

    def init(self, cr):
        tools.drop_view_if_exists(cr, 'report_stock_forecast')
        cr.execute("""CREATE or REPLACE VIEW report_stock_forecast AS (SELECT
                        max(id) AS id,
                        product_id,
                        date,
                        sum(product_qty) as quantity,
                        sum(sum(product_qty)) OVER(PARTITION BY product_id ORDER BY date) AS cumulative_quantity
                        FROM (
                            SELECT
                                max(sq.id) AS id,
                                sq.product_id,
                                CASE WHEN sm.date is null
                                THEN CURRENT_DATE ELSE (sm.date) END AS date,
                                sum(sq.qty) AS product_qty
                            FROM
                               stock_quant as sq
                            LEFT JOIN
                               product_product ON product_product.id = sq.product_id
                            LEFT JOIN
                                stock_location location_id ON sq.location_id = location_id.id
                            LEFT JOIN
                                (SELECT product_id, MIN(date) AS date FROM stock_move WHERE stock_move.state IN ('confirmed','assigned','waiting') GROUP BY product_id) sm
                                ON sm.product_id = sq.product_id
                            WHERE
                                location_id.usage = 'internal'
                            GROUP BY
                                date,
                                sq.product_id
                            UNION ALL
                            SELECT
                                max(sm.id) AS id,
                                sm.product_id,
                                date AS date,
                                sum(sm.product_qty) AS product_qty
                            FROM
                               stock_move as sm
                            LEFT JOIN
                               product_product ON product_product.id = sm.product_id
                            LEFT JOIN
                                stock_location dest_location ON sm.location_dest_id = dest_location.id
                            LEFT JOIN
                                stock_location source_location ON sm.location_id = source_location.id
                            WHERE
                                sm.state IN ('confirmed','assigned','waiting') and
                                source_location.usage != 'internal' and dest_location.usage = 'internal'
                            GROUP BY
                                date,
                                sm.product_id
                            UNION ALL
                            SELECT
                                max(sm.id) AS id,
                                sm.product_id,
                                date AS date,
                                -sum(sm.product_qty) AS product_qty
                            FROM
                               stock_move as sm
                            LEFT JOIN
                               product_product ON product_product.id = sm.product_id
                            LEFT JOIN
                               stock_location source_location ON sm.location_id = source_location.id
                            LEFT JOIN
                               stock_location dest_location ON sm.location_dest_id = dest_location.id
                            WHERE
                                sm.state IN ('confirmed','assigned','waiting') and
                            source_location.usage = 'internal' and dest_location.usage != 'internal'
                            GROUP BY
                                date,
                                sm.product_id
                            ) as report
                        GROUP BY date,product_id)""")

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
