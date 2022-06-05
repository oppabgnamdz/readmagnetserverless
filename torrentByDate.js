const rp = require('request-promise');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const AWS = require('aws-sdk');
const moment = require('moment');

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

const torrentByDate = async () => {
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

			console.log({ mappingPut });
		} catch (e) {
			console.log({ e });
		}
	}
};
module.exports.torrentByDate = torrentByDate;
