const rp = require('request-promise');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const AWS = require('aws-sdk');
const moment = require('moment');

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

const torrent = async () => {
	let start = 0;
	let end = 3;
	let base = 'https://jav-torrent.org';
	let host = 'https://jav-torrent.org/new?page=2';

	const url = (index) => {
		return `${host}${index}`;
	};

	try {
		let data = [];
		for (let j = parseInt(start); j < parseInt(end); j++) {
			console.log('test', url(j + 1));
			const html = await rp(url(j + 1));
			const dom = new JSDOM(`${html}`);
			var arr = [],
				l = dom.window.document.links;

			for (var i = 0; i < l.length; i++) {
				arr.push(l[i].href);
			}

			const needArr = arr.filter((item) => item.includes('/storage/torrent'));
			const haveDomain = needArr.map((item) => base + item);
			data = [...data, ...haveDomain];
		}
		const mapping = data.map((item, index) => {
			return { url: item };
		});
		const mappingPut = mapping.map((item, index) => {
			return {
				PutRequest: {
					Item: {
						userId: item?.url,
						date: moment().format('YYYY-MM-DD'),
						type: 'torrent',
					},
				},
			};
		});
		const slice = Math.ceil(mappingPut.length / 25);
		for (let i = 0; i < slice; i++) {
			const params = {
				RequestItems: {
					[USERS_TABLE]: mappingPut.slice(25 * i, 25 * i + 25),
				},
			};
			await dynamoDbClient.batchWrite(params).promise();
		}

		console.log({ mappingPut });
	} catch (e) {
		console.log({ e });
	}
};
module.exports.torrent = torrent;
