const AWS = require('aws-sdk');
const express = require('express');
const serverless = require('serverless-http');
const moment = require('moment');
const rp = require('request-promise');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.json());

app.get('/hello', (req, res) => {
	res.status(200).json({ error: 'hello world' });
});
app.get('/abc', async (req, res) => {
	let start = 0;
	let end = 200;
	let subtractDay = 10;
	let base = 'https://jav-torrent.org';
	for (let day = 0; day < subtractDay; day++) {
		let host = `https://jav-torrent.org/date/${moment()
			.subtract(day, 'd')
			.format('YYYY-MM-DD')}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};
		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await rp(url(j + 1));
				const dom = new JSDOM(`${html}`);
				var arr = [],
					l = dom.window.document.links;

				for (var i = 0; i < l.length; i++) {
					arr.push(l[i].href);
				}
				const breakPage = arr.find((item) => item.includes('/date/'));
				if (!breakPage) {
					break;
				}

				const needArr = arr.filter((item) => item.includes('/storage/torrent'));
				const haveDomain = needArr.map((item) => base + item);
				data = [...data, ...haveDomain];
			}
			const mapping = data.map((item, index) => {
				return { url: item };
			});
			const mappingPut = mapping.map((item, index) => {
				return dynamoDbClient
					.put({
						TableName: USERS_TABLE,
						Item: {
							userId: item?.url,
							date: moment().subtract(day, 'd').format('YYYY-MM-DD'),
							type: 'torrent-day',
						},
						ConditionExpression: 'attribute_not_exists(userId)',
					})
					.promise();
			});
			await Promise.all(mappingPut).then((values) => {
				console.log(values);
			});

			res.send('done');
		} catch (e) {
			console.log({ e });
		}
	}
});

app.get('/csv', async (req, res) => {
	const date = req.query?.date;
	const type = req.query?.type;
	const { Items: items } = await dynamoDbClient
		.scan({
			TableName: USERS_TABLE,
			FilterExpression: '#date = :date AND #type = :type',
			ExpressionAttributeValues: {
				':date': date ? date : moment().format('YYYY-MM-DD'),
				':type': type ? type : 'su',
			},
			ExpressionAttributeNames: {
				'#date': 'date',
				'#type': 'type',
			},
		})
		.promise();
	const mapping = items.map((item) => item.userId);
	// const csv = new ObjectsToCsv(mapping);
	// await csv.toDisk('./test.csv');
	// console.log('path', path.join(__dirname, 'test.csv'));
	console.log({ mapping });
	res.status(200).json({ data: mapping });
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
