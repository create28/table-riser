import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySupabase() {
    console.log('Verifying Supabase connection...');

    // 1. Test Insert
    console.log('Testing INSERT into fpl_weights...');
    const { data: insertData, error: insertError } = await supabase
        .from('fpl_weights')
        .insert({
            form_weight: 0.5,
            fixture_weight: 0.3,
            ict_weight: 0.15,
            price_weight: 0.05,
            active: false // Mark as inactive so it doesn't affect the app
        })
        .select();

    if (insertError) {
        console.error('INSERT failed:', insertError);
        return;
    }
    console.log('INSERT successful:', insertData);

    const id = insertData[0].id;

    // 2. Test Select
    console.log('Testing SELECT from fpl_weights...');
    const { data: selectData, error: selectError } = await supabase
        .from('fpl_weights')
        .select('*')
        .eq('id', id);

    if (selectError) {
        console.error('SELECT failed:', selectError);
        return;
    }
    console.log('SELECT successful:', selectData);

    // 3. Test Delete (Clean up)
    console.log('Testing DELETE from fpl_weights...');
    const { error: deleteError } = await supabase
        .from('fpl_weights')
        .delete()
        .eq('id', id);

    if (deleteError) {
        console.error('DELETE failed:', deleteError);
        return;
    }
    console.log('DELETE successful');

    console.log('✅ Supabase verification passed!');
}

verifySupabase();
