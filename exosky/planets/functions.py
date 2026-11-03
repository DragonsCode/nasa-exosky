"""Offline conversion of Open Exoplanet Catalogue XML into a system map."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

BASE_DIR = Path(__file__).resolve().parent


def finite_positive(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) and value > 0 else None


def sexagesimal_degrees(value, *, right_ascension=False):
    """Parse OEC hh mm ss or signed dd mm ss, retaining a negative zero sign."""
    parts = str(value).split()
    if len(parts) != 3:
        raise ValueError('Expected three sexagesimal components')
    first, minutes, seconds = map(float, parts)
    if not all(math.isfinite(v) for v in (first, minutes, seconds)):
        raise ValueError('Coordinates must be finite')
    if not 0 <= minutes < 60 or not 0 <= seconds < 60:
        raise ValueError('Minutes and seconds must be in [0, 60)')
    negative = parts[0].startswith('-')
    magnitude = abs(first) + minutes / 60 + seconds / 3600
    if right_ascension:
        if negative or magnitude >= 24:
            raise ValueError('Right ascension must be in [0, 24) hours')
        return magnitude * 15
    if magnitude > 90:
        raise ValueError('Declination must be in [-90, 90] degrees')
    return -magnitude if negative else magnitude


def parse_data(source=None, output=None, *, coverage=None):
    """Return one record per planet at its host system's heliocentric position.

    Input and output distances are parsecs. Orbital semimajor axes remain metadata
    in AU; orbital phase and planet offsets cannot be inferred from this map.
    Missing/invalid system positions are excluded, never assigned invented values.
    """
    source = Path(source) if source is not None else BASE_DIR / 'systems.xml.gz'
    with gzip.open(source, 'rb') as handle:
        tree = ET.parse(handle)
    records = []
    counts = {'total_planets': 0, 'included_planets': 0, 'excluded_invalid_distance': 0,
              'excluded_invalid_coordinates': 0}
    for system in tree.findall('.//system'):
        planets = list(system.iter('planet'))
        counts['total_planets'] += len(planets)
        distance = finite_positive(system.findtext('distance'))
        if distance is None:
            counts['excluded_invalid_distance'] += len(planets)
            continue
        ra_text, dec_text = system.findtext('rightascension'), system.findtext('declination')
        try:
            ra = math.radians(sexagesimal_degrees(ra_text, right_ascension=True))
            dec = math.radians(sexagesimal_degrees(dec_text))
        except (ValueError, TypeError):
            counts['excluded_invalid_coordinates'] += len(planets)
            continue
        position = {'x': distance * math.cos(dec) * math.cos(ra),
                    'y': distance * math.cos(dec) * math.sin(ra),
                    'z': distance * math.sin(dec)}
        parents = {child: parent for parent in system.iter() for child in parent}
        for planet in planets:
            host = parents[planet]
            records.append({
                'star_name': host.findtext('name') or system.findtext('name') or 'Unnamed host system',
                'planet_name': planet.findtext('name') or 'Unnamed Planet',
                'mass': finite_positive(planet.findtext('mass')),
                'mass_unit': 'M_jup',
                'semimajor_axis_au': finite_positive(planet.findtext('semimajoraxis')),
                'coordinates': position.copy(),
                'coordinates_unit': 'pc',
                'distance': distance,
                'distance_unit': 'pc',
                'right_ascension': ra_text,
                'declination': dec_text,
                'description': planet.findtext('description') or 'No description available.',
            })
    counts['included_planets'] = len(records)
    if coverage is not None:
        coverage.update(counts)
    if output is not None:
        Path(output).write_text(json.dumps(records, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=BASE_DIR / 'systems.xml.gz')
    parser.add_argument('--output', type=Path, default=BASE_DIR / 'static/planets/exoplanets.json')
    args = parser.parse_args()
    coverage = {}
    parse_data(args.source, args.output, coverage=coverage)
    report = {'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'coordinate_frame': 'heliocentric equatorial axes; catalogue epoch not independently verified',
              'distance_unit': 'pc', 'coordinate_unit': 'pc', **coverage}
    args.output.with_suffix('.metadata.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
