const fs = require('fs');
const readline = require('readline');

interface LatLng {
    latitude: number;
    longitude: number;
}

export class GeoNames {
    constructor(private readonly path: string) {}

    async* generator() {
        const file = fs.createReadStream(this.path);

        const input = readline.createInterface({
            input: file,
            crlfDelay: Infinity
        });

        for await (const line of input) {
            yield new Place(line);
        }
    }

    async nearest(to: LatLng) {
        let closest: Place | undefined = undefined;
        let distance = Infinity;
        for await (const place of this.generator()) {
            if (closest === undefined) {
                closest = place;
                continue;
            }

            let d = place.distance(to);
            if (d < distance) {
                distance = d;
                closest = place;
            }
        }

        return closest;
    }
}

const TRANSFORMATIONS = [
    parseInt,

    null,
    null,
    (e: string) => e.split(','),

    parseFloat,
    parseFloat,

    null,
    null,

    null,
    null,

    null,
    null,
    null,
    null,

    parseInt,

    parseInt,
    parseInt,

    null,
    Date.parse
];

export class Place {
    id: number;

    name: string;
    asciiName: string;
    alternativeNames: string[];

    latitude: number;
    longitude: number;

    featureClass: string;
    featureCode: string;

    countryCode: string;
    alternativeCountryCode: string;

    adminCode1: string;
    adminCode2: string;
    adminCode3: string;
    adminCode4: string;

    population: number;

    elevation: number;
    digitalElevationModel: number;

    timezone: string;
    modificationDate: Date;

    constructor(line: string) {
        const elements = line.split('\t');

        [this.id, this.name, this.asciiName, this.alternativeNames, this.latitude, this.longitude,
            this.featureClass, this.featureCode, this.countryCode, this.alternativeCountryCode,
            this.adminCode1, this.adminCode2, this.adminCode3, this.adminCode4, this.population,
            this.elevation, this.digitalElevationModel, this.timezone, this.modificationDate]
                = elements.map((e, i) => TRANSFORMATIONS[i] === null ? e : TRANSFORMATIONS[i]!(e)) as any[];
    }

    distance(to: LatLng) {
        return distance(this, to);
    }
}

const EARTH_RADIUS = 6378137;

function distance(a: LatLng, b: LatLng) {
    if ((a.latitude === b.latitude) && (a.longitude === b.longitude)) return 0;

    const aLatitude = a.latitude * Math.PI / 180;
    const bLatitude = b.latitude * Math.PI / 180;
    const theta = (a.longitude - b.longitude) * Math.PI / 180;
    return Math.acos(
            Math.max(-1, Math.min(1,
                    Math.sin(aLatitude) * Math.sin(bLatitude)
                    + Math.cos(aLatitude) * Math.cos(bLatitude) * Math.cos(theta))
            )
    ) * EARTH_RADIUS;
}