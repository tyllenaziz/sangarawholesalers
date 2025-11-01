const express = require('express');
const router = express.Router();
const discountRuleController = require('../controllers/discountRuleController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(checkRole('admin')); // Only admin can manage discount rules

router.get('/', discountRuleController.getAllDiscountRules);
router.get('/:id', discountRuleController.getDiscountRule);
router.post('/', discountRuleController.createDiscountRule);
router.put('/:id', discountRuleController.updateDiscountRule);
router.delete('/:id', discountRuleController.deleteDiscountRule);

module.exports = router;