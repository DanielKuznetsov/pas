'use server'

import supabase from '@/utils/supabase/client'

export async function testAction() {
    const { data, error } = await supabase.from('todos').insert({
        name: 'Buy groceries'
    })

    const { data: todos, error: todosError } = await getTodos()

    if (error) {
        return { error: error.message }
    }

    return { data, message: 'Data inserted successfully', todos }
}

export async function getTodos() {
    const { data, error } = await supabase.from('todos').select('*')

    if (error) {
        return { error: error.message }
    }

    return { data, message: 'Data fetched successfully' }
}