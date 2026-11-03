# nasa-exosky

Educational 3D map of exoplanet host systems using a bundled Open Exoplanet Catalogue (OEC) snapshot. This is a catalogue visualization, not an orbital simulation or a current NASA data service.

## Run locally

Requires Python 3.12+ and a browser with WebGL. Node 18+ runs the renderer regression tests.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
export DJANGO_DEBUG=true
python exosky/manage.py runserver 127.0.0.1:8000
```

The browser loads pinned Three.js 0.169.0 modules from jsDelivr. Catalogue conversion and regression tests work offline after installing dependencies.

```sh
python exosky/planets/functions.py
python -m unittest discover -s tests -v
node --test tests/rendering.test.mjs
python exosky/manage.py check
```

## Coordinates and coverage

The [OEC schema](https://github.com/OpenExoplanetCatalogue/open_exoplanet_catalogue#data-structure) defines distance in **parsecs**, right ascension in `hh mm ss`, declination in signed `dd mm ss`, planet mass in Jupiter masses and semimajor axis in AU. The converter uses all sexagesimal components, including negative-zero declinations.

Cartesian positions use heliocentric equatorial axes: +X at RA 0h/Dec 0°, +Y at RA 6h/Dec 0°, +Z at the north celestial pole. For system distance `d`, `x=d cos(dec) cos(ra)`, `y=d cos(dec) sin(ra)`, `z=d sin(dec)`. JSON coordinates and distances use parsecs, and one scene unit equals one parsec. Semimajor axes remain separate AU metadata; no orbital positions are inferred. Planets in the same system overlap at their host system position. Marker sizes are exaggerated for visibility and do not represent physical radii. The initial view focuses on nearby systems (up to a 1,000 pc extent); zoom out to see more distant entries.

Nested stars, circumbinary planets and direct system planets are traversed. Missing/invalid positions are excluded instead of assigned placeholder distances. Unknown mass is `null` and appears neutral gray. Other colors map mass linearly up to 10 Jupiter masses and distance logarithmically up to 10,000 pc; the spatial geometry remains linear.

Running the converter regenerates the bundled JSON and `exoplanets.metadata.json`, which records the input SHA-256 and inclusion/exclusion counts. It does not download data. The original snapshot's acquisition date, upstream revision and coordinate epoch are not recorded and have not been independently established. Do not use this map for precise astrometry or claim current catalogue completeness. OEC documents its data under MIT; its upstream attribution and terms apply independently of this repository's code license.

## Configuration

`DJANGO_SECRET_KEY` is required; debug defaults to false. `DJANGO_ALLOWED_HOSTS` is a comma-separated list and defaults to loopback hostnames. Set `DJANGO_DEBUG=true` only for local development. These defaults do not constitute a production deployment configuration.

A secret key was previously committed. If it was used in any deployed environment, its owner must replace it and assess invalidating signed sessions/tokens and repository history. Removing the literal from the current tree does not revoke it; no live secret was tested or rotated, and history was not rewritten.
