const rp = require('request-promise');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const AWS = require('aws-sdk');
const moment = require('moment');

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

const readMagnet = async () => {
	let start = 0;
	let end = 1;
	let host = 'https://sukebei.nyaa.si/?s=leechers&o=desc';
	let base = 'https://sukebei.nyaa.si';

	console.log({ start }, { end }, { host });
	const url = (index) => {
		if (host === 'https://sukebei.nyaa.si/?s=leechers&o=desc') {
			return host;
		}
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

			const needArr = arr.filter((item) => item.includes('/download/'));

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
						date: moment().format('YYYY-MM-DD'),
						type: 'su',
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
};
module.exports.readMagnet = readMagnet;
