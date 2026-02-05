import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {MongoClient} = require('mongodb');
import fs from 'node:fs/promises';
import chokidar from 'chokidar';

const nmea = require('nmea-simple');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const URLDB = `mongodb://${MONGO_HOST}:27017`;
const DBNAME = 'meteo';


const fakeSondKeys = {
    // "temperature" :0, //measure[0] PAS A PRENDRE
    // "pressure" : 1, //measure[1] PAS A PRENDRE
    // "humidity" : 2, //measure[2] PAS A PRENDRE
    "luminosity" : 3, //measure[3] A UTILISER
    "wind_heading" : 4, //measure[4] A UTILISER
    "wind_speed_avg" : 5, //measure[5] A UTILISER
    "wind_speed_max" : 6, //measure[6] A UTILISER
    "wind_speed_min" : 7 //measure[7] A UTILISER
};

//Pour la vraie sonde, on que la date, la temperature, l'hygro et la pression
const realSondUnitKeys = {
    "temp": "C",
    "hygro": "%",
    "press": "hP"
};

const realSondKeys = {
    "temp": "temperature",
    "hygro": "humidity",
    "press": "pressure"
};

// Fonction pour parser la première ligne du fichier gpsNmea
function parseGPS(gpsFile) {
    if (!gpsFile) {
        console.error('GPS file is null or empty');
        return { lat: null, long: null };
    }
    
    const lines = gpsFile.split("\n");
    let lat = null;
    let long = null;
    try {
        for (const line of lines){
            if (line.startsWith('$GPGGA')) {
                const packet = nmea.parseNmeaSentence(line);
                lat = packet.latitude;
                long = packet.longitude;
                break;
            }
        }
        if (lat === null || long === null) {
            console.warn('No valid GPS coordinates found in file');
        }
        return {"lat": lat, "long": long};
    } catch(error) {
        console.error('Error parsing NMEA sentence:', error);
        return {"lat": null, "long": null};
    }
}

// Fonction pour load les fichiers
async function loadingFile(path, isText = false) {
    try {
        const data = await fs.readFile(path, { encoding: 'utf8'}); // Fix typo
        return isText ? data : JSON.parse(data);
    }
    catch (err) {
        console.error(`Error loading file ${path}:`, err);
        return null;
    }
};


// Insertion de la donnée d'un fichiers dans la bdd
async function insertData(path) {
    const client = new MongoClient(URLDB);
    const fakeSondfile = await loadingFile("/dev/shm/sensors");
    const gpsFile = await loadingFile("/dev/shm/gpsNmea", true);
    const rainFile = await loadingFile("/dev/shm/rainCounter.log");
    const realSondFile = await loadingFile("/dev/shm/tph.log");

    await client.connect();
    const db = client.db(DBNAME);
    const collection = db.collection("meteo")

    // On insère la date
    const result = {
        "date": fakeSondfile.date,
    }

    // On insère les données du gps
    const gpsCoord = parseGPS(gpsFile);
    result["lat"] = gpsCoord.lat; //
    result["long"] = gpsCoord.long; //

    // On insère les données de la vraie sonde
    for (const dataType in realSondKeys) {
        result[realSondKeys[dataType]] = {"unit":realSondUnitKeys[dataType], "value": realSondFile[dataType]};
        console.log(realSondFile)
    } 

    // On insère les données de la fausse sonde
    for (const dataType in fakeSondKeys) {
        result[dataType] = {"unit":fakeSondfile.measure[fakeSondKeys[dataType]].unit, "value":fakeSondfile.measure[fakeSondKeys[dataType]].value}
    }

    // On insère la pluie

    const insertResult = await collection.insertOne(result);
    console.log('Inserted file => ', insertResult);


    await client.close()
    return "done";
};


function launchScrapper() {
    const watcherDev = chokidar.watch("/dev/shm");
    
    watcherDev
        .on('change', (path) => {
            insertData(path)
        })
};

launchScrapper("mock");