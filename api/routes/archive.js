var express = require('express');
var router = express.Router();
const {MongoClient} = require('mongodb');

const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const URLDB = `mongodb://${MONGO_HOST}:27017`;
const DBNAME = 'meteo';

function hasValidParameters(params) {
    validParameters = ['temperature', 'humidity', 'pressure', 'rain', 'wind_heading', 'wind_speed_avg', 'wind_speed_max', 'wind_speed_min', 'luminosity'];
    return params.every((param) => validParameters.includes(param));
}

async function loadData(start, end, params) {
    const client = new MongoClient(URLDB);
    try {
        await client.connect();
        const db = client.db(DBNAME);
        const collection = db.collection("meteo");

        // Convertir les timestamps en ISO8601 strings pour la comparaison
        const startDate = new Date(start * 1000).toISOString();
        const endDate = new Date(end * 1000).toISOString();

        console.log('Searching from', startDate, 'to', endDate);

        const data = await collection.find({
            date: { 
                $gte: startDate, 
                $lte: endDate 
            }
        }).sort({ date: 1 }).toArray();

        console.log(`Found ${data.length} documents`);

        const results = {};

        // Construction de la légende
        const legend = ["time", "lat", "long"];
        for (const param of params) {
            legend.push(param);
        }
        results["legend"] = legend;

        // Construction du tableau des unités
        const units = ["ISO8601", "°", "°"];
        
        // On prend le premier document qui a des données pour extraire les unités
        if (data.length > 0) {
            for (const param of params) {
                if (data[0][param] && data[0][param].unit) {
                    units.push(data[0][param].unit);
                } else {
                    units.push("N/A");
                }
            }
        } else {
            for (const param of params) {
                units.push("N/A");
            }
        }
        results["units"] = units;

        // Construction du tableau de données
        results["data"] = [];
        for (const doc of data) {
            const row = [
                doc.date,           // time
                doc.lat || 0,       // latitude
                doc.long || 0       // longitude
            ];
            
            // Ajout des valeurs pour chaque paramètre demandé
            for (const param of params) {
                if (doc[param] && doc[param].value !== undefined) {
                    row.push(doc[param].value);
                } else {
                    row.push(null);
                }
            }
            
            results["data"].push(row);
        }

        return results;
    } catch (err) {
        console.error('Error loading data:', err);
        throw err;
    } finally {
        await client.close();
    }
}

// Le routeur pour meteo/v1/archive
router.get('/', async (req, res) => {
    try {
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
            endTimeStamp = Math.floor(Date.now() / 1000);
        } else {
            endTimeStamp = parseInt(req.query.end);
            if (isNaN(endTimeStamp)) {
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
        
        const params = req.query.data.split(',').map(m => m.trim());

        if (!hasValidParameters(params)) {
            return res.status(400).json({
                error_code: 400,
                error_message: "Invalid query parameter: valid parameters are temperature, humidity, pressure, rain, wind_heading, wind_speed_avg, wind_speed_max, wind_speed_min, luminosity"
            })
        }
        
        const results = await loadData(startTimeStamp, endTimeStamp, params);
        return res.json(results);

    } catch (error) {
        console.error('Error in /archive route:', error);
        return res.status(500).json({
            error_code: 500,
            error_message: "Internal server error"
        })
    }
})

module.exports = router;