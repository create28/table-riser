const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchManagerInfo(teamId) {
    console.log(`Fetching info for team ${teamId}...`);
    const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/`);
    if (!response.ok) {
        console.error(`Failed to fetch manager info: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error('Failed to fetch manager info');
    }
    return response.json();
}

async function test() {
    // Try a known large ID (if user provided one, I'd use it, but I'll try a random 10-digit one or just the logic)
    // Since I don't have a specific 10-digit ID from the user, I'll just test the fetch function logic.
    // I'll try to fetch the default ID first to ensure connectivity.
    try {
        const defaultId = 3992229;
        const info = await fetchManagerInfo(defaultId);
        console.log('Success for default ID:', info.id);
    } catch (e) {
        console.error('Error for default ID:', e);
    }
}

test();
