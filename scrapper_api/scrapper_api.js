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


/*Pour FakeSond
    temperature => measure[0]
    pressure => measure[1]
    humidity => measure[2]
    luminosity => measure[3]
    wind_heading => measure[4]
    wind_speed_avg => measure[5]
    wind_speed_max => measure[6]
    wind_speed_min => measure[7]
*/

const fakeSondKeys = {
    "temperature" :0,
    "pressure" : 1,
    "humidity" : 2,
    "luminosity" : 3,
    "wind_heading" : 4,
    "wind_speed_avg" : 5,
    "wind_speed_max" : 6,
    "wind_speed_min" : 7
};

//Pour la vraie sonde, on que la date, la temperature, l'hygro et la pression

// Watcher pour regarder les fichiers où sont mis les résultats des sondes
function initializeWatcher(mode) {
    var url;
    if (mode == "mock") { url = urlMockData}
    else { url = urlRealData};

    const watcher = chokidar.watch(url);

    return watcher
}



//
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


// Insertion de la donnée d'un fichiers dans la bdd
async function insertData(path) {
    const client = new MongoClient(urlDb);
    // Pick the file
    const measureFile = await loadingFile(path+"");

    await client.connect();
    const db = client.db(dbName);

    // Pour chaque variable, on insère dans la collection correspondante
    for (const dataType in fakeSondKeys) {
        const collection = db.collection(dataType);
        const insertResult = await collection.insertOne({"date": measureFile.date, "measures": measureFile.measure[fakeSondKeys[dataType]]});
        console.log('Inserted measurements =>', insertResult);
    }
    // On insère les données pour l'hydrométrie
    // const collection = db.collection("rain");
    // const insertResult = await collection.insertOne(file.rain);
    // console.log('Inserted measurements =>', insertResult);
    // On insère les données pour la trace gps


    await client.close()
    return "done";
};

async function showData() {
    const client = new MongoClient(urlDb);
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const result = await db.collection("luminosity").find().toArray();
        console.log(result);
        
    } catch (err) {
        console.error('Error showing data:', err);
    } finally {
        await client.close();
    }
};


function launchScrapper(mode="mock") {
    setUpDatabase();
    const watcher = initializeWatcher(mode);
    watcher
        .on('change', (path) => {
            console.log("change on file")
            insertData(path)
        })
};

launchScrapper("mock");