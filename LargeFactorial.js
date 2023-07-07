// Include the AWS SDK module
const AWS = require('aws-sdk');
// Instantiate a DynamoDB document client with the SDK
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Define handler function, the entry point to our code for the Lambda service
// We receive the object that triggers the function as a parameter
exports.handler = async (event) => {
  // Extract values from event
  const num = Number(event.num);

  // TEST TEST TEST
  // num = 200;
  // test update
  if (num === 0 || num === 1) return Response(1);
  if ((num < 0) || (num > 1000)) {
    return Response("Invalid Number, can't calculate factorial");
  }

  // see if the result is already present in the DB
  let storedFactorial = await ReadFromDB(dynamodb, num);

  if (storedFactorial) {
    console.log('Found cached result in DB ', storedFactorial);
    return Response(storedFactorial);
  }

  // if not already in DB, then calculate it
  console.log("Didn't find result in DB, calculating");

  // find the last largest number, stored at Key '-1', for which we have a stored result in the DB
  let lastNum = await ReadFromDB(dynamodb, -1);

  if (lastNum) {
    console.log('Using existing factorial for ', lastNum);
    storedFactorial = await ReadFromDB(dynamodb, lastNum);
  }

  // safety check, just in case there was garbage stored in the DB
  if (!storedFactorial || !lastNum || (storedFactorial <= 1)) lastNum = storedFactorial = 1;

  console.log('Calculating factorials onwards from ', lastNum, storedFactorial);

  let bigFactorial = BigInt(storedFactorial);

  for (let i = lastNum + 1; i <= num; i++) {
    bigFactorial *= BigInt(i);
    await WriteToDB(dynamodb, i, bigFactorial.toString());
    await WriteToDB(dynamodb, -1, i);
  }

  return Response(bigFactorial.toString());
};

function Response(_resp) {
  // Create a JSON object with our response and store it in a constant
  const _response = {
    statusCode: 200,
    body: _resp,
  };
  return _response;
}

async function ReadFromDB(_dbObj, _key) {
  try {
    const data = await _dbObj.get(ReadParams(_key)).promise();
    // console.log("Success", data);
    return data.Item?.factorial;
  } catch (err) {
    console.log(err);
  }
}

async function WriteToDB(_dbObj, _key, _value) {
  try {
    await _dbObj.put(WriteParams(_key, _value)).promise();
    console.log('wrote ', _key, _value);
  } catch (err) {
    console.log(err);
  }
}

function ReadParams(_key) {
  const params = {
    TableName: 'FactorialDatabase',
    Key: { num: _key },
  };

  return params;
}

function WriteParams(_key, _value) {
  const params = {
    TableName: 'FactorialDatabase',
    Item: {
      num: _key,
      factorial: _value,
    },
  };

  return params;
}
