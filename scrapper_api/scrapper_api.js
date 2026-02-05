import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {MongoClient} = require('mongodb');
import fs from 'node:fs/promises';
import chokidar from 'chokidar';

const urlMockData = "/dev/shm/sensors";
const urlRealData = "/dev/shm/";


const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const urlDb = `mongodb://${MONGO_HOST}:27017`;
const dbName = 'meteo';


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
    "hygro": "pressure",
    "press": "humidity"
};

["temp", "hygro", "press"]

async function loadingFile(path) {
    try {
        const data = await fs.readFile(path, { enconding: 'utf8'});
        return JSON.parse(data);
    }
    catch (err) {
        return err;
    }
};

// Setup de la database
async function setUpDatabase() {
    const client = new MongoClient(urlDb);
    try {
        await client.connect();
        const db = client.db(dbName);

        // On crée une collection par type de données
        for (const dataType in fakeSondKeys) {
            // console.log(dataType);
            await db.createCollection(dataType);
        }
        // On crée une collection pour la pluie
        await db.createCollection("rain");
        // On crée une collection pour le gps
        await db.createCollection("gps");

    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        // const db = client.db(dbName);
        // const colls = db.listCollections();
        // for await (const doc of colls) {
        //     console.log(doc)
        // }
        await client.close();
    }
};


// Insertion de la donnchokidar.watch(path)ée d'un fichiers dans la bdd
async function insertData(path) {
    const client = new MongoClient(urlDb);
    const file = await loadingFile(path);

    await client.connect();
    const db = client.db(dbName);

    if (path == "/dev/shm/sensors") {
        console.log("change on fakeSond file");
        // Pour chaque variable, on insère dans la collection correspondante
        for (const dataType in fakeSondKeys) {
            const collection = db.collection(dataType);
            const insertResult = await collection.insertOne({
                "date": file.date, 
                "measures": file.measure[fakeSondKeys[dataType]]
            });
            console.log('Inserted measurements =>', insertResult);
        }
    }
    else if (path == "/dev/shm/gpsNmea") {
        console.log("change on gps file");
        const collection = db.collection("gps");
        const insertResult = await collection.insertOne(file);
        console.log('Inserted gps position =>', insertResult);
    }
    else if (path == "/dev/shm/rainCounter.log") {
        console.log("change on rainCounter file");
        const collection = db.collection("rain");
        const insertResult = await collection.insertOne(file);
        console.log('Inserted gps position =>', insertResult);
    }
    else if (path == "/dev/shm/tph.log") {
        console.log("change on realSond file");
        for (const dataType in realSondKeys) {
            const collection = db.collection(realSondKeys[dataType]);
            const insertResult = await collection.insertOne({
                "date": file.date,
                "measures": {"unit":realSondUnitKeys[dataType], "value": file[dataType]}
            });
        }
        const collection = db.collection("rain");
        const insertResult = await collection.insertOne(file);
        console.log('Inserted gps position =>', insertResult);
    }

    await client.close()
    return "done";
};




function launchScrapper(mode="mock") {
    const watcherDev = chokidar.watch("/dev/shm");
    
    watcherDev
        .on('change', (path) => {
            insertData(path)
        })
};

launchScrapper("mock");