const express = require('express');
const router = express.Router();
const taxRateController = require('../controllers/taxRateController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(checkRole('admin')); // Only admin can manage tax rates

router.get('/', taxRateController.getAllTaxRates);
router.get('/:id', taxRateController.getTaxRate);
router.post('/', taxRateController.createTaxRate);
router.put('/:id', taxRateController.updateTaxRate);
router.delete('/:id', taxRateController.deleteTaxRate);

module.exports = router;