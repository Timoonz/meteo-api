var express = require('express');
var router = express.Router();

/* Get the data*/
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