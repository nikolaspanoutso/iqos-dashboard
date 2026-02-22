const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function generatePassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

async function main() {
    console.log('--- 🛡️ Starting Secure Password Generation ---');

    const users = await prisma.user.findMany();
    const passwordsReport = [];

    for (const user of users) {
        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        passwordsReport.push(`${user.name.padEnd(30)} | ${plainPassword}`);
        console.log(`✅ Secured user: ${user.name}`);
    }

    const reportPath = path.join(__dirname, '..', 'passwords.txt');
    fs.writeFileSync(reportPath, "IQOS DASHBOARD - SECURE PASSWORDS\n" + "=".repeat(50) + "\n" + passwordsReport.join('\n'));

    console.log('\n--- 📝 Success! ---');
    console.log(`All ${users.length} users have been updated with new passwords.`);
    console.log(`The password list has been saved to: passwords.txt`);
    console.log(`⚠️  ACTION REQUIRED: Copy the passwords.txt and delete the file from the server!`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
