import * as fs from 'fs';
import * as stream from 'stream';
import * as readline from 'readline';

interface LatLng {
    latitude: number;
    longitude: number;
}

export class GeoNames {
    constructor(private readonly path: string) {}

    async* [Symbol.asyncIterator](): AsyncGenerator<Place, void, void> {
        const file = fs.createReadStream(this.path);

        const lines = readline.createInterface({
            input: file,
            crlfDelay: Infinity
        });

        for await (const line of lines) yield new Place(line);
    }

    stream(): stream.Readable {
        const transform = new stream.Transform({
            transform(line: string, encoding: string, callback: stream.TransformCallback) {
                callback(null, new Place(line));
            }
        });

        const file = fs.createReadStream(this.path);

        readline.createInterface({
            input: file,
            output: transform,
            crlfDelay: Infinity
        });

        return transform;
    }

    async nearest(to: LatLng): Promise<Place | undefined> {
        let closestPlace: Place | undefined = undefined;
        let minDistance = Infinity;
        for await (const place of this) {
            const distance = place.distance(to);
            if (distance < minDistance) {
                minDistance = distance;
                closestPlace = place;
            }
        }

        return closestPlace;
    }
}

type Transformation = ((input: string) => void) | null;
const transformations: Transformation[] = [];
const F = (transformation: Transformation = null) => (t: any, k: any): void => { transformations.push(transformation); };

export class Place {
    @F() id: number;

    @F() name: string;
    @F() asciiName: string;
    @F(e => e.split(',')) alternativeNames: string[];

    @F(parseFloat) latitude: number;
    @F(parseFloat) longitude: number;

    @F() featureClass: string;
    @F() featureCode: string;

    @F() countryCode: string;
    @F() alternativeCountryCode: string;

    @F() adminCode1: string;
    @F() adminCode2: string;
    @F() adminCode3: string;
    @F() adminCode4: string;

    @F(parseInt) population: number;

    @F(parseInt) elevation: number;
    @F(parseInt) digitalElevationModel: number;

    @F() timezone: string;
    @F(Date.parse) modificationDate: Date;

    constructor(line: string) {
        const elements = line.split('\t');

        [this.id, this.name, this.asciiName, this.alternativeNames, this.latitude, this.longitude,
            this.featureClass, this.featureCode, this.countryCode, this.alternativeCountryCode,
            this.adminCode1, this.adminCode2, this.adminCode3, this.adminCode4, this.population,
            this.elevation, this.digitalElevationModel, this.timezone, this.modificationDate]
                = elements.map((e, i) => transformations[i] === null ? e : transformations[i]!(e)) as any[];
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