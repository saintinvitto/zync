const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
const { tratarErro, rotaNaoEncontrada } = require('./middleware/errorMiddleware');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use(rotaNaoEncontrada);
app.use(tratarErro);

module.exports = app;
