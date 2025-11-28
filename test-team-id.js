
const teamId = 12345678;
const inputValue = "12345678";

if (isNaN(teamId)) {
    console.log('Error: Please enter a valid team ID (numbers only)');
} else if (teamId < 1 || teamId > 99999999999) {
    console.log('Error: Team ID must be between 1 and 99,999,999,999');
} else {
    console.log('Success: Team ID is valid');
}
