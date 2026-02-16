const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bank = require('./models/Bank');
const connectDB = require('./config/db');

dotenv.config();

const banks = [
  {
    name: 'EcoBank',
    accounts: ['1234567890', '0987654321', '1122334455']
  },
  {
    name: 'UBA',
    accounts: ['5566778899', '6677889900']
  },
  {
    name: 'GTBank',
    accounts: ['9988776655', '4433221100']
  },
  {
    name: 'First Bank',
    accounts: ['1029384756', '5647382910']
  }
];

const seedBanks = async () => {
    await connectDB();

    try {
        await Bank.deleteMany();
        await Bank.insertMany(banks);

        console.log('Banks Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

seedBanks();
