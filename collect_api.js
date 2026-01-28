const { MongoClient } = require('mongodb');
const fs = require('node:fs/promises');

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
}

const url = 'mongodb://localhost:27017';
const dbName = 'meteo';

async function setUpDatabase() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db(dbName);

        //On crée une collection par type de données
        for (const dataType in fakeSondKeys) {
            // console.log(dataType);
            await db.createCollection(dataType);
        }
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



async function insertData(path) {
    const client = new MongoClient(url);
    // Pick the file
    const file = await loadingFile(path);

    await client.connect();
    const db = client.db(dbName);

    for (const dataType in fakeSondKeys) {
        //pour chaque variable, on insère dans la collection correspondante
        const collection = db.collection(dataType);
        const insertResult = await collection.insertOne(file.measure[fakeSondKeys[dataType]]);
        // console.log('Inserted documents =>', insertResult);
    }

    await client.close()
    return "done";
}

async function showData(){
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db(dbName);
        
        // Use await instead of callback
        const result = await db.collection("luminosity").find().toArray();
        console.log(result);
        
    } catch (err) {
        console.error('Error showing data:', err);
    } finally {
        await client.close();
    }
}

setUpDatabase();
insertData("/dev/shm/sensors");
showData();