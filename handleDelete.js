const AWS = require('aws-sdk');
const moment = require('moment');

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();
const handleDelete = async () => {
	let endDay = 10;
	for (let day = 5; day < endDay; day++) {
		const { Items: items } = await dynamoDbClient
			.scan({
				TableName: USERS_TABLE,
				FilterExpression: '#date = :date',
				ExpressionAttributeValues: {
					':date': moment().subtract(day, 'd').format('YYYY-MM-DD'),
				},
				ExpressionAttributeNames: {
					'#date': 'date',
				},
			})
			.promise();
		const torrents = items.map((item) => {
			return { DeleteRequest: { Key: { userId: item.userId } } };
		});
		const slice = Math.ceil(torrents.length / 25);
		for (let i = 0; i < slice; i++) {
			const params = {
				RequestItems: {
					[USERS_TABLE]: torrents.slice(25 * i, 25 * i + 25),
				},
			};
			await dynamoDbClient.batchWrite(params).promise();
		}
	}
};
module.exports.handleDelete = handleDelete;
