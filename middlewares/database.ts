import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;

export const database = createClient(supabaseUrl, supabaseKey)

//function to connect to the database
const databaseConnect = async function () {
    try {
        createClient(supabaseUrl, supabaseKey)
        console.log(`Database connected 🍃`)
    } catch (error:any) {
        throw error("Error connecting to the database", error)
    }
}

export default databaseConnect;