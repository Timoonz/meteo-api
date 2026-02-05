var express = require('express');
var router = express.Router();
const {MongoClient} = require('mongodb');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const urlDb = `mongodb://${MONGO_HOST}:27017`;
const dbName = 'meteo';

function hasValidParameters(params) {
    validParameters = ['temperature', 'humidity', 'pressure', 'rain', 'wind_heading', 'wind_speed_avg', 'wind_speed_max', 'wind_speed_min'];
    return params.every((param) => validParameters.includes(param));
}

async function loadData(start, end, params) {
    const client = new MongoClient(urlDb);
    try {
        await client.connect();
        const db = client.db(dbName);

        results = {};

        // Construction de la légende
        const legend = ["time", "lat", "long"]
        for (const param of params) {
            legend.push(param);
        }
        results["legend"] = legend;

        // Construction du tableau des unités 
        const units = ["ISO8601", "°", "°"]
        for (const param of params) {
            // on ne prend que le dernier fichier pour construire le tableau des unités
            const data = await db.collection(param).find().sort({_id: -1}).limit(1).toArray();
            units.push(data[0].measures.unit);
        }
        results["units"] = units;

        results["data"] = [];

        return results;
    }  catch (err) {
        console.error('Error importing data:', err);
    } finally {
        await client.close();
    }
}

// Le routeur pour meteo/v1/archive
router.get('/', async (req, res) => {
    try {
        // On check s'il y a un timestamp de début et un timestamp de fin
        if (!req.query.start || !req.query.end) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter: 'start' and 'end' are required"
            });
        }

        const startTimeStamp = parseInt(req.query.start);

        if (isNaN(startTimeStamp)) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter: 'start' must be a timestamp"
            })
        }

        let endTimeStamp;
        if (req.query.end == "now") {
            end = Math.floor(Date.now() / 1000);
        } else {
            endTimeStamp = parseInt(req.query.end);
            if (isNaN(startTimeStamp)) {
                return res.status(400).json({
                    error_code: 400,
                    error_message: "Invalid query parameter: 'end' must be a timestamp"
                })
            }
        }

        if (!req.query.data) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter: data is required"
            })
        }
        

        // Si un des paramètres passés est faux, on renvoie une erreur
        if (!hasValidParameters(params)) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter"
            })
        }
        
        params = data.split(',').map(m => m.trim());

    }

    catch (error) {
        res.status(500).json({
            error_code: 500,
            error_message: "Internal server error"
        })
    };
})


module.exports = router;