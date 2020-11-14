const express = require('express');
const speakeasy = require('speakeasy');
const uuid = require('uuid');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

const app = express();

// middleware
app.use(express.json());

const myDb = new JsonDB(new Config('myDatabase', true, false, '/'));

// register user & create temp secret
app.post('/api/register', (req, res) => {
  const id = uuid.v4();
  try {
    const path = `/user/${id}`;
    const temp_secret = speakeasy.generateSecret();
    myDb.push(path, { id, temp_secret });
    res.json({ id, secret: temp_secret.base32 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'oops! secret key not generated' });
  }
});

// validate with token
app.post('/api/verify', (req, res) => {
  const { token, userid } = req.body; //pulling t,u
  try {
    const path = `/user/${userid}`;
    const user = myDb.getData(path);

    const { base32: secret } = user.temp_secret; //pulling base32 and adding to the variable secret
    const tokenValidates = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 6,
    });
    if (tokenValidates) {
      myDb.push(path, { id: userid, secret: user.temp_secret });
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'not validated' });
  }
});

app.get('/api', (req, res) =>
  res.json({ message: 'welcome to two way authentication' })
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`->server listening on ${PORT}`));
