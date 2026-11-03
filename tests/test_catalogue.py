import importlib.util
import io
import math
import unittest
from pathlib import Path
from unittest.mock import mock_open, patch

spec = importlib.util.spec_from_file_location('catalogue', Path(__file__).resolve().parents[1] / 'exosky/planets/functions.py')
catalogue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalogue)


class CatalogueTests(unittest.TestCase):
    def parse(self, ra='12 30 00', dec='-00 30 00', distance='10', nested=False, mass='', orbit='2', host_kind='star'):
        planet = f'<planet><name>Synthetic b</name><mass>{mass}</mass><semimajoraxis>{orbit}</semimajoraxis></planet>'
        host = f'<{host_kind}><name>Synthetic</name>{planet}</{host_kind}>'
        if nested:
            host = f'<binary>{host}</binary>'
        xml = f'<systems><system><rightascension>{ra}</rightascension><declination>{dec}</declination><distance>{distance}</distance>{host}</system></systems>'
        with patch.object(catalogue.gzip, 'open', return_value=io.BytesIO(xml.encode())), patch('builtins.open', mock_open()), patch('builtins.print'):
            return catalogue.parse_data()

    def test_full_sexagesimal_coordinates_use_system_distance_in_parsecs(self):
        row = self.parse()[0]
        ra, dec, distance = math.radians(187.5), math.radians(-0.5), 10
        expected = (distance * math.cos(dec) * math.cos(ra), distance * math.cos(dec) * math.sin(ra), distance * math.sin(dec))
        for key, value in zip(('x', 'y', 'z'), expected):
            self.assertAlmostEqual(row['coordinates'][key], value, places=9)
        self.assertEqual(row['distance_unit'], 'pc')
        self.assertEqual(row['coordinates_unit'], 'pc')
        self.assertAlmostEqual(math.hypot(*row['coordinates'].values()), 10)

    def test_reference_axes_and_missing_orbit(self):
        for ra, dec, expected in [('00 00 00', '+00 00 00', (10, 0, 0)),
                                  ('06 00 00', '+00 00 00', (0, 10, 0)),
                                  ('00 00 00', '+90 00 00', (0, 0, 10)),
                                  ('00 00 00', '-90 00 00', (0, 0, -10))]:
            row = self.parse(ra=ra, dec=dec, orbit='')[0]
            for key, value in zip(('x', 'y', 'z'), expected):
                self.assertAlmostEqual(row['coordinates'][key], value)
            self.assertIsNone(row['semimajor_axis_au'])
        self.assertEqual(len(self.parse(host_kind='binary')), 1)

    def test_distance_scales_location_not_orbit_size(self):
        near, far = self.parse(distance='10')[0], self.parse(distance='20')[0]
        for key in ('x', 'y', 'z'):
            self.assertAlmostEqual(far['coordinates'][key], 2 * near['coordinates'][key])

    def test_nested_stars_are_not_dropped(self):
        self.assertEqual(len(self.parse(nested=True)), 1)

    def test_unknown_mass_is_json_null(self):
        self.assertIsNone(self.parse()[0]['mass'])

    def test_invalid_coordinates_and_distances_are_excluded(self):
        for kw in [dict(distance='Unknown'), dict(distance='0'), dict(distance='-1'), dict(distance='nan'), dict(ra='24 00 01'), dict(ra='12 60 00'), dict(dec='90 00 01'), dict(dec='nan')]:
            with self.subTest(kw=kw):
                self.assertEqual(self.parse(**kw), [])


if __name__ == '__main__':
    unittest.main()
