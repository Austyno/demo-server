const Bank = require('../models/Bank');

const getBanks = async (req, res) => {
    try {
        const banks = await Bank.find().sort({ name: 1 });
        res.json(banks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching banks" });
    }
};

// Seed Logic
const seedBanks = async (req, res) => {
    try {
        // Only seed if empty to prevent overwrites
        const count = await Bank.countDocuments();
        if (count > 0) {
                return res.json({ message: "Banks already exist. Skipping seed." });
        }

        const banks = [
            { name: 'EcoBank', accounts: ['1234567890', '0987654321', '1122334455'] },
            { name: 'UBA', accounts: ['5566778899', '6677889900'] },
            { name: 'GTBank', accounts: ['9988776655', '4433221100'] },
            { name: 'First Bank', accounts: ['1029384756', '5647382910'] }
        ];
        
        await Bank.insertMany(banks);
        res.json({ message: "Banks seeded successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error seeding banks" });
    }
};

module.exports = {
    getBanks,
    seedBanks
};
