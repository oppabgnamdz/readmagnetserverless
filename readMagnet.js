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
	// let host =
	// 	req.query?.host == 'jav'
	// 		? `https://www.141jav.com/new?page=`
	// 		: `https://www.141ppv.com/new?page=`;
	// if (!req.query?.host) {
	// 	start = 0;
	// 	end = 1;
	// 	host = 'https://sukebei.nyaa.si/?s=leechers&o=desc';
	// }
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
			console.log('test', url(j + 1));
			const html = await rp(url(j + 1));
			const dom = new JSDOM(`${html}`);
			var arr = [],
				l = dom.window.document.links;

			for (var i = 0; i < l.length; i++) {
				arr.push(l[i].href);
			}

			const needArr = arr.filter((item) => item.includes('magnet:'));

			data = [...data, ...needArr];
		}
		const mapping = data.map((item, index) => {
			return { url: item };
		});
		const mappingPut = mapping.map((item, index) => {
			return {
				PutRequest: {
					Item: { userId: item?.url, date: moment().format('YYYY-MM-DD') },
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
		// console.log({ data });
		// const csv = new ObjectsToCsv(mapping);
		// await csv.toDisk('./test.csv');
		// console.log('path', path.join(__dirname, 'test.csv'));
		// res.sendFile(path.join(__dirname, 'test.csv'), function (err) {
		// 	if (err) {
		// 	} else {
		// 	}
		// });
	} catch (e) {
		console.log({ e });
	}
};
module.exports.readMagnet = readMagnet;
