
import React from 'react';
import { getCombinedSelectableProducts } from './src/lib/chemicals';
import { getChemicals } from './src/lib/inventory-data';

export async function runCompare() {
  const invChems = await getChemicals();
  
  // InventoryControl logic
  const productGroups = Object.values(invChems.reduce((acc, chem) => {
    const key = chem.chemicalLibraryId ? 'lib_' + chem.chemicalLibraryId : ((chem.name || '').trim().toLowerCase()) + '_' + ((chem.brand || '').trim().toLowerCase());
    if (!acc[key]) acc[key] = [];
    acc[key].push(chem);
    return acc;
  }, {}));

  const combined = await getCombinedSelectableProducts();

  console.log('InventoryControl Groups:', productGroups.length);
  console.log('RicksTips Combined:', combined.length);
}

