var express = require('express');
var router = express.Router();
const {MongoClient} = require('mongodb');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const urlDb = `mongodb://${MONGO_HOST}:27017`;
const dbName = 'meteo';

// Pour vérifier si les paramètres passés en arguments sont valides
function hasValidParameters(params) {
    validParameters = ['temperature', 'humidity', 'pressure', 'rain', 'wind_heading', 'wind_speed_avg', 'wind_speed_max', 'wind_speed_min'];
    return params.every((param) => validParameters.includes(param));
}

// Fonction pour récupérer les dernières données dans la bdd
async function loadData(params) {
    const client = new MongoClient(urlDb);
    try {
        await client.connect();
        const db = client.db(dbName);

        for (param in params) {
            const result = await db.collection(param).find().toArray();
        }
        console.log(result);
        return result;
    }  catch (err) {
        console.error('Error importing data:', err);
    } finally {
        await client.close();
    }
}

// Le routeur pour meteo/v1/live
router.get('/', (req, res) => {
    try {
        const  { data } = req.query;
        console.log(data);
        if (!data) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter"
            })
        }

        params = data.split(',').map(m => m.trim());
        console.log(params);

        // Si un des paramètres passés est faux, on renvoie une erreyr
        if (!hasValidParameters(params)) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter"
            })
        }
        return res.json(params)
    }

    catch (error) {
        res.status(500).json({
            error_code: 500,
            error_message: "Internal server error"
        })
    };
})


module.exports = router;