const express = require('express');
const authRoutes = require('./authRoutes');
const bucketRoutes = require('./bucketsRoutes');
const objectRoutes = require('./objectsRoutes');
const systemRoutes = require('./systemRoutes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/buckets', bucketRoutes);
router.use('/objects', objectRoutes);
router.use('/system', systemRoutes);

module.exports = router;
