 
import xml.etree.ElementTree as ET
import gzip
import io
import math
import json


def parse_data():
    # Parse the gzipped XML data
    with gzip.open('exosky/planets/systems.xml.gz', 'rb') as f:
        oec = ET.parse(io.BytesIO(f.read()))

    # Initialize a list to hold exoplanet data
    exoplanets = []

    # Extract data from the XML structure
    for system in oec.findall(".//system"):
        distance = system.findtext("distance")  # Distance in light years
        right_ascension = system.findtext("rightascension")
        declination = system.findtext("declination")
        
        # Set default distance if it's None or "Unknown"
        if distance is None or distance == "Unknown":
            distance_au = 1  # Placeholder value (1 AU) if unknown
        else:
            distance_au = float(distance) * 206265  # Convert light years to AU

        for star in system.findall("star"):
            star_name = star.findtext("name") or "Unnamed Star"
            
            for planet in star.findall("planet"):
                planet_name = planet.findtext("name") or "Unnamed Planet"
                mass = planet.findtext("mass") or "Unknown"
                semi_major_axis = planet.findtext("semimajoraxis") or "Unknown"
                description = planet.findtext("description") or "No description available."

                # Convert right ascension (RA) and declination (Dec) to radians
                if right_ascension is not None and declination is not None:
                    try:
                        ra_hours = float(right_ascension.split()[0])  # Assuming right ascension is in hours
                        dec_degrees = float(declination.split()[0])
                        
                        ra_rad = math.radians(ra_hours * 15)  # Convert hours to degrees, then to radians
                        dec_rad = math.radians(dec_degrees)    # Convert degrees to radians

                        # Calculate Cartesian coordinates
                        if semi_major_axis != "Unknown":
                            semi_major_axis_au = float(semi_major_axis)  # Semi-major axis in AU
                            x = semi_major_axis_au * math.cos(dec_rad) * math.cos(ra_rad)
                            y = semi_major_axis_au * math.cos(dec_rad) * math.sin(ra_rad)
                            z = semi_major_axis_au * math.sin(dec_rad)
                            
                            # Only append if coordinates are not all zeros
                            if (x, y, z) != (0, 0, 0):
                                exoplanets.append({
                                    'star_name': star_name,
                                    'planet_name': planet_name,
                                    'mass': mass,
                                    'coordinates': {'x': x, 'y': y, 'z': z},
                                    'distance': distance_au,
                                    'right_ascension': right_ascension,
                                    'declination': declination,
                                    'description': description
                                })
                    except ValueError:
                        # Handle conversion errors
                        continue  # Skip this planet if there's a conversion error
                else:
                    continue  # Skip if right ascension or declination is None

    # Display the exoplanets' information
    for exoplanet in exoplanets:
        print(f"Star: {exoplanet['star_name']}, Planet: {exoplanet['planet_name']}, "
            f"Mass: {exoplanet['mass']}, Coordinates: {exoplanet['coordinates']}, "
            f"Distance: {exoplanet['distance']} AU, "
            f"RA: {exoplanet['right_ascension']}, Dec: {exoplanet['declination']}, "
            f"Description: {exoplanet['description']}")
    # make json file
    with open('exoplanets.json', 'w') as f:
        json.dump(exoplanets, f)
    return exoplanets


if __name__ == '__main__':
    parse_data()