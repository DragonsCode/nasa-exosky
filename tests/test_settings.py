import os
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured

SETTINGS = Path(__file__).resolve().parents[1] / 'exosky/exosky/settings.py'


class SettingsTests(unittest.TestCase):
    def test_key_is_required(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(ImproperlyConfigured):
            runpy.run_path(str(SETTINGS))

    def test_safe_defaults_and_explicit_development_mode(self):
        with patch.dict(os.environ, {'DJANGO_SECRET_KEY': 'synthetic-test-key'}, clear=True):
            settings = runpy.run_path(str(SETTINGS))
        self.assertFalse(settings['DEBUG'])
        self.assertNotIn('*', settings['ALLOWED_HOSTS'])
        with patch.dict(os.environ, {'DJANGO_SECRET_KEY': 'synthetic-test-key', 'DJANGO_DEBUG': 'true', 'DJANGO_ALLOWED_HOSTS': 'localhost, testserver'}, clear=True):
            settings = runpy.run_path(str(SETTINGS))
        self.assertTrue(settings['DEBUG'])
        self.assertEqual(settings['ALLOWED_HOSTS'], ['localhost', 'testserver'])
