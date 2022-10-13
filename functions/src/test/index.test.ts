
const test = require('firebase-functions-test')({
    databaseURL: 'https://my-project.firebaseio.com',
    storageBucket: 'my-project.appspot.com',
    projectId: 'my-project',
  }, '../serviceAccountKey.json');

const myFunctions = require('../index.ts'); // relative path to functions code
const wrapped = test.wrap(myFunctions.helloWorld);

