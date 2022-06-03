const AWS = require('aws-sdk');
const express = require('express');
const serverless = require('serverless-http');
const ObjectsToCsv = require('objects-to-csv');
const path = require('path');

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.json());

app.get('/hello', (req, res) => {
	res.status(200).json({ error: 'hello world' });
});

app.get('/csv', async (req, res) => {
	const { Items: items } = await dynamoDbClient
		.scan({
			TableName: USERS_TABLE,
		})
		.promise();
	const mapping = items.map((item) => {
		return { url: item.userId };
	});
	const csv = new ObjectsToCsv(mapping);
	await csv.toDisk('./test.csv');
	console.log('path', path.join(__dirname, 'test.csv'));
	res.sendFile(path.join(__dirname, 'test.csv'), function (err) {
		if (err) {
		} else {
		}
	});
});

app.get('/users/:userId', async function (req, res) {
	const params = {
		TableName: USERS_TABLE,
		Key: {
			userId: req.params.userId,
		},
	};

	try {
		const { Item } = await dynamoDbClient.get(params).promise();
		if (Item) {
			const { userId, name } = Item;
			res.json({ userId, name });
		} else {
			res
				.status(404)
				.json({ error: 'Could not find user with provided "userId"' });
		}
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Could not retreive user' });
	}
});

app.post('/users', async function (req, res) {
	const { userId, name } = req.body;
	if (typeof userId !== 'string') {
		res.status(400).json({ error: '"userId" must be a string' });
	} else if (typeof name !== 'string') {
		res.status(400).json({ error: '"name" must be a string' });
	}

	const params = {
		TableName: USERS_TABLE,
		Item: {
			userId: userId,
			name: name,
		},
	};

	try {
		await dynamoDbClient.put(params).promise();
		res.json({ userId, name });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Could not create user' });
	}
});

app.use((req, res, next) => {
	return res.status(404).json({
		error: 'Not Found',
	});
});

module.exports.handler = serverless(app);
