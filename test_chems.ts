import { getChemicals } from './src/lib/inventory-data.js';

async function run() {
    try {
        const chems = await getChemicals();
        console.log(JSON.stringify(chems[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
