'use server'

import supabase from '@/utils/supabase/client'

export async function testAction() {
    const { data, error } = await supabase.from('todos').insert({
        name: 'Buy groceries'
    })

    if (error) {
        return { error: error.message }
    }

    return { data, message: 'Data inserted successfully' }
}