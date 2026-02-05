var express = require('express');
var router = express.Router();
const {MongoClient} = require('mongodb');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const urlDb = `mongodb://${MONGO_HOST}:27017`;
const dbName = 'meteo';

// Pour vérifier si les paramètres passés en arguments sont valides
function hasValidParameters(params) {
    const validParameters = ['temperature', 'humidity', 'pressure', 'rain', 'wind_heading', 'wind_speed_avg', 'wind_speed_max', 'wind_speed_min', "luminosity"];
    return params.every((param) => validParameters.includes(param));
}

// Fonction pour récupérer les dernières données dans la bdd
async function loadData(params) {
    const client = new MongoClient(urlDb);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection("meteo");

        let results = {
            "date": null, 
            "location": null,
            "measurements": {} 
        };
        

        const firstFile = await collection.find().sort({_id: -1}).limit(1).toArray();

        if (firstFile.length === 0) {
            throw new Error("No data found in database");
        }


        results.date = firstFile[0].date;
        results.location = {
                "lat": firstFile[0].lat,
                "long": firstFile[0].long
        };

        for (const param of params) {
            results["measurements"][param] = firstFile[0][param]
        }
        return results;
    }  catch (err) {
        console.error('Error importing data:', err);
        throw err;
    } finally {
        await client.close();
    }
}

// Le routeur pour meteo/v1/live
router.get('/', async (req, res) => {
    try {
        const  { data } = req.query;
        // console.log(data);
        if (!data) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter: data is required"
            })
        }

        params = data.split(',').map(m => m.trim());
        // console.log(params);

        // Si un des paramètres passés est faux, on renvoie une erreur
        if (!hasValidParameters(params)) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter"
            })
        }
        
        const results = await loadData(params);
        console.log('Results:', results);
        return res.json(results);
    }

    catch (error) {
        res.status(500).json({
            error_code: 500,
            error_message: "Internal server error"
        })
    };
})


module.exports = router;