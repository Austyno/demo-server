const ChartOfAccount = require('../models/ChartOfAccount');

const getChartOfAccounts = async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};
    
    if (q) {
      console.log(`Searching for accounts with query: "${q}"`);
      query = {
        $or: [
          { code: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { full_name: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const accounts = await ChartOfAccount.find(query).limit(50).sort({ code: 1 });
    console.log(`Found ${accounts.length} results for query: "${q || ''}"`);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ message: 'Server error fetching chart of accounts' });
  }
};

module.exports = {
  getChartOfAccounts
};
