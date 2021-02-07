/*eslint-disable */

const express = require("express");
const axios = require("axios");

const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

const limiter = rateLimit({
	windowMs: 30 * 1000, // 30 seconds
	max: 10, // limit each IP to 10 requests per windowMs
});

const speedLimiter = slowDown({
	windowMs: 30 * 1000,
	delayAfter: 1,
	delayMs: 500,
});

const router = express.Router();

const BASE_URL = "https://api.nasa.gov/insight_weather/?";

//caching
let cachedData;
let cacheTime;

//setup my own api_key
const apiKeys = new Map();
apiKeys.set("12345", true);

router.get(
	"/",
	limiter,
	speedLimiter,
	(req, res, next) => {
		//validate the header contains my api_key
		const apiKey = req.get("X-API-KEY");
		if (apiKeys.has(apiKey)) {
			next();
		} else {
			const error = new Error("INVALID API KEY");
			next(error);
		}
	},
	async (req, res, next) => {
		//in memory cache
		if (cacheTime && cacheTime > Date.now() - 30 * 1000) {
			return res.json(cachedData);
		}

		try {
			const params = new URLSearchParams({
				api_key: process.env.NASA_API_KEY,
				feedtype: "json",
				ver: "1.0",
			});
			//1. make a request to the nasa api

			const { data } = await axios.get(`${BASE_URL}${params}`);

			//2.Respond with data from the nasa api
			cachedData = data;
			cacheTime = Date.now();
			data.cacheTime = cacheTime;
			return res.json(data);
		} catch (error) {
			return next(error);
		}
	}
);

module.exports = router;
