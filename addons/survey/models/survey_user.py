# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
import logging
import re
import uuid

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError

from dateutil.relativedelta import relativedelta

email_validator = re.compile(r"[^@]+@[^@]+\.[^@]+")
_logger = logging.getLogger(__name__)


def dict_keys_startswith(dictionary, string):
    """Returns a dictionary containing the elements of <dict> whose keys start with <string>.
        .. note::
            This function uses dictionary comprehensions (Python >= 2.7)
    """
    return {k: v for k, v in dictionary.items() if k.startswith(string)}


class SurveyUserInput(models.Model):
    """ Metadata for a set of one user's answers to a particular survey """

    _name = "survey.user_input"
    _rec_name = 'survey_id'
    _description = 'Survey User Input'

    # description
    survey_id = fields.Many2one('survey.survey', string='Survey', required=True, readonly=True, ondelete='cascade')
    scoring_type = fields.Selection(string="Scoring", related="survey_id.scoring_type")
    start_datetime = fields.Datetime('Start date and time', readonly=True)
    is_time_limit_reached = fields.Boolean("Is time limit reached?", compute='_compute_is_time_limit_reached')
    input_type = fields.Selection([
        ('manually', 'Manual'), ('link', 'Invitation')],
        string='Answer Type', default='manually', required=True, readonly=True,
        oldname="type")
    state = fields.Selection([
        ('new', 'Not started yet'),
        ('skip', 'Partially completed'),
        ('done', 'Completed')], string='Status', default='new', readonly=True)
    test_entry = fields.Boolean(readonly=True)
    # identification and access
    token = fields.Char('Identification token', default=lambda self: str(uuid.uuid4()), readonly=True, required=True, copy=False)
    # no unique constraint, as it identifies a pool of attempts
    invite_token = fields.Char('Invite token', readonly=True, copy=False)
    partner_id = fields.Many2one('res.partner', string='Partner', readonly=True)
    email = fields.Char('E-mail', readonly=True)

    # Displaying data
    last_displayed_page_id = fields.Many2one('survey.question', string='Last displayed question/page')
    # answers
    user_input_line_ids = fields.One2many('survey.user_input_line', 'user_input_id', string='Answers', copy=True)
    # Pre-defined questions
    question_ids = fields.Many2many('survey.question', string='Predefined Questions', readonly=True)
    deadline = fields.Datetime('Deadline', help="Datetime until customer can open the survey and submit answers")

    quizz_score = fields.Float("Score (%)", compute="_compute_quizz_score")
    # Stored for performance reasons while displaying results page
    quizz_passed = fields.Boolean('Quizz Passed', compute='_compute_quizz_passed', store=True, compute_sudo=True)

    @api.multi
    @api.depends('user_input_line_ids.answer_score', 'user_input_line_ids.question_id')
    def _compute_quizz_score(self):
        for user_input in self:
            total_possible_score = sum([
                answer_score if answer_score > 0 else 0
                for answer_score in user_input.question_ids.mapped('labels_ids.answer_score')
            ])

            if total_possible_score == 0:
                user_input.quizz_score = 0
            else:
                score = (sum(user_input.user_input_line_ids.mapped('answer_score')) / total_possible_score) * 100
                user_input.quizz_score = round(score, 2) if score > 0 else 0

    @api.multi
    @api.depends('quizz_score', 'survey_id.passing_score')
    def _compute_quizz_passed(self):
        for user_input in self:
            user_input.quizz_passed = user_input.quizz_score >= user_input.survey_id.passing_score

    _sql_constraints = [
        ('unique_token', 'UNIQUE (token)', 'A token must be unique!'),
    ]

    @api.model
    def do_clean_emptys(self):
        """ Remove empty user inputs that have been created manually
            (used as a cronjob declared in data/survey_cron.xml)
        """
        an_hour_ago = fields.Datetime.to_string(datetime.datetime.now() - datetime.timedelta(hours=1))
        self.search([('input_type', '=', 'manually'),
                     ('state', '=', 'new'),
                     ('create_date', '<', an_hour_ago)]).unlink()

    @api.model
    def _generate_invite_token(self):
        return str(uuid.uuid4())

    @api.multi
    def action_resend(self):
        partners = self.env['res.partner']
        emails = []
        for user_answer in self:
            if user_answer.partner_id:
                partners |= user_answer.partner_id
            elif user_answer.email:
                emails.append(user_answer.email)

        return self.survey_id.with_context(
            default_existing_mode='resend',
            default_partner_ids=partners.ids,
            default_emails=','.join(emails)
        ).action_send_survey()

    @api.multi
    def action_print_answers(self):
        """ Open the website page with the survey form """
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'name': "View Answers",
            'target': 'self',
            'url': '/survey/print/%s?answer_token=%s' % (self.survey_id.access_token, self.token)
        }

    @api.depends('start_datetime', 'survey_id.is_time_limited', 'survey_id.time_limit')
    def _compute_is_time_limit_reached(self):
        """ Checks that the user_input is not exceeding the survey's time limit. """
        for user_input in self:
            user_input.is_time_limit_reached = user_input.survey_id.is_time_limited and fields.Datetime.now() \
                > user_input.start_datetime + relativedelta(minutes=user_input.survey_id.time_limit)

    @api.multi
    def _send_certification(self):
        """ Will send the certification email with attached document if
        - The survey is a certification
        - It has a certification_mail_template_id set
        - The user succeeded the test """
        for user_input in self:
            if user_input.survey_id.certificate and user_input.quizz_passed and user_input.survey_id.certification_mail_template_id:
                user_input.survey_id.certification_mail_template_id.send_mail(user_input.id, notif_layout="mail.mail_notification_light")

    @api.multi
    def _get_survey_url(self):
        self.ensure_one()
        return '/survey/start/%s?answer_token=%s' % (self.survey_id.access_token, self.token)


class SurveyUserInputLine(models.Model):
    _name = 'survey.user_input_line'
    _description = 'Survey User Input Line'
    _rec_name = 'user_input_id'

    user_input_id = fields.Many2one('survey.user_input', string='User Input', ondelete='cascade', required=True)
    question_id = fields.Many2one('survey.question', string='Question', ondelete='cascade', required=True)
    page_id = fields.Many2one(related='question_id.page_id', string="Page", readonly=False)
    survey_id = fields.Many2one(related='user_input_id.survey_id', string='Survey', store=True, readonly=False)
    skipped = fields.Boolean('Skipped')
    answer_type = fields.Selection([
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('datetime', 'Datetime'),
        ('free_text', 'Free Text'),
        ('suggestion', 'Suggestion')], string='Answer Type')
    value_text = fields.Char('Text answer')
    value_number = fields.Float('Numerical answer')
    value_date = fields.Date('Date answer')
    value_datetime = fields.Datetime('Datetime answer')
    value_free_text = fields.Text('Free Text answer')
    value_suggested = fields.Many2one('survey.label', string="Suggested answer")
    value_suggested_row = fields.Many2one('survey.label', string="Row answer")
    answer_score = fields.Float('Score given for this choice')

    @api.constrains('skipped', 'answer_type')
    def _answered_or_skipped(self):
        for uil in self:
            if not uil.skipped != bool(uil.answer_type):
                raise ValidationError(_('This question cannot be unanswered or skipped.'))

    @api.constrains('answer_type')
    def _check_answer_type(self):
        for uil in self:
            fields_type = {
                'text': bool(uil.value_text),
                'number': (bool(uil.value_number) or uil.value_number == 0),
                'date': bool(uil.value_date),
                'free_text': bool(uil.value_free_text),
                'suggestion': bool(uil.value_suggested)
            }
            if not fields_type.get(uil.answer_type, True):
                raise ValidationError(_('The answer must be in the right type'))

    def _get_mark(self, value_suggested):
        label = self.env['survey.label'].browse(int(value_suggested))
        mark = label.answer_score if label.exists() else 0.0
        return mark

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            value_suggested = vals.get('value_suggested')
            if value_suggested:
                vals.update({'answer_score': self._get_mark(value_suggested)})
        return super(SurveyUserInputLine, self).create(vals_list)

    @api.multi
    def write(self, vals):
        value_suggested = vals.get('value_suggested')
        if value_suggested:
            vals.update({'answer_score': self._get_mark(value_suggested)})
        return super(SurveyUserInputLine, self).write(vals)

    def _get_save_line_values(self, answer, answer_type):
        if not answer or (isinstance(answer, str) and not answer.strip()):
            return {'answer_type': None, 'skipped': True}
        if answer_type == 'suggestion':
            return {'answer_type': answer_type, 'value_suggested': answer}
        value = float(answer) if answer_type == 'number' else answer
        return {'answer_type': answer_type, 'value_' + answer_type: value}

    @api.model
    def save_lines(self, user_input_id, question, answer, comment=None):
        """ Save answers to questions, depending on question type

            If an answer already exists for question and user_input_id, it will be
            overwritten (or deleted for 'choice' questions) (in order to maintain data consistency).
        """
        vals = {
            'user_input_id': user_input_id,
            'question_id': question.id,
            'survey_id': question.survey_id.id,
            'skipped': False,
        }
        old_answers = self.search([
            ('user_input_id', '=', user_input_id),
            ('survey_id', '=', question.survey_id.id),
            ('question_id', '=', question.id)
        ])

        if question.question_type in ['textbox', 'free_text', 'numerical_box', 'date', 'datetime']:
            self._save_line_simple_answer(vals, old_answers, question, answer)
        elif question.question_type in ['simple_choice', 'multiple_choice']:
            self._save_line_choice(vals, old_answers, question, answer, comment)
        elif question.question_type == 'matrix':
            self._save_line_matrix(vals, old_answers, answer, comment)
        else:
            raise AttributeError(question.question_type + ": This type of question has no saving function")

    @api.model
    def _save_line_simple_answer(self, vals, old_answers, question, answer):
        answer_type = question.question_type
        if question.question_type == 'textbox':
            answer_type = 'text'
        elif question.question_type == 'numerical_box':
            answer_type = 'number'

        vals.update(self._get_save_line_values(answer, answer_type))
        if old_answers:
            old_answers.write(vals)
        else:
            self.create(vals)
        return True

    @api.model
    def _save_line_choice(self, vals, old_answers, question, answers, comment):
        if not (isinstance(answers, list)):
            answers = [answers]

        vals_list = []

        if question.question_type == 'simple_choice':
            if not (question.comment_count_as_answer and question.comments_allowed and comment):
                for answer in answers:
                    vals.update(self._get_save_line_values(answer, 'suggestion'))
                    vals_list.append(vals)
        elif question.question_type == 'multiple_choice':
            for answer in answers:
                vals.update(self._get_save_line_values(answer, 'suggestion'))
                vals_list.append(vals.copy())

        if comment:
            vals.update({'answer_type': 'text', 'value_text': comment, 'skipped': False, 'value_suggested': False})
            vals_list.append(vals.copy())

        old_answers.sudo().unlink()
        self.create(vals_list)

        return True

    @api.model
    def _save_line_matrix(self, vals, old_answers, answers, comment):
        vals_list = []

        for row_key, row_answer in answers.items():
            for answer in row_answer:
                vals.update({'answer_type': 'suggestion', 'value_suggested': answer, 'value_suggested_row': row_key})
                vals_list.append(vals.copy())

        if comment:
            vals.update({'answer_type': 'text', 'value_text': comment, 'skipped': False, 'value_suggested': False})
            vals_list.append(vals.copy())

        old_answers.sudo().unlink()
        self.create(vals_list)

        return True
