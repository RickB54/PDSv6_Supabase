
import supabase from './src/lib/supabase';

async function inspectSchema() {
    console.log("Checking 'learning_library_items' schema...");
    const { data, error } = await supabase
        .from('learning_library_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching item:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Found item keys:", Object.keys(data[0]));
            console.log("Sample Item:", data[0]);
        } else {
            console.log("Table is empty, trying to insert a dummy to see errors...");
            const dummy = {
                title: "Test Schema Probe",
                type: "video", // Assuming required
                description: "Probing schema",
                category: "General"
            };
            const { data: insData, error: insError } = await supabase
                .from('learning_library_items')
                .insert(dummy)
                .select();

            if (insError) {
                console.error("Insert Error:", insError);
            } else {
                console.log("Insert Success! Keys:", Object.keys(insData[0]));
            }
        }
    }
}

inspectSchema();
