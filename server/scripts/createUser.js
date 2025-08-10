import { createUser } from '../services/userService.js';

const [, , email, password, role = 'admin'] = process.argv;

if (!email || !password) {
    console.error('Usage: node scripts/createUser.js <email> <password> [role]');
    process.exit(1);
}

createUser({ email, password, role }).then(id => {
    console.log('User created:', id);
    process.exit(0);
});
