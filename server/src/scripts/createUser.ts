import { createInterface } from 'node:readline/promises';

import { z } from 'zod';

import { closeDb, initDb } from '../db/index.js';
import { createUser, normalizeEmail } from '../services/userService.js';

/**
 * Q25: the password used to be `process.argv[3]`, which left it in shell history and in
 * `ps` output for anyone on the machine. It is now prompted for with echo suppressed.
 * The script also had no `.catch`, so a duplicate email produced an unhandled rejection
 * and a raw SQLite error, and it defaulted `role` to 'admin' here but 'user' in the
 * service — the service default now matches.
 */

const EmailSchema = z.email().max(254);
const PasswordSchema = z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(200, 'Password must be at most 200 characters');

async function prompt(question: string, { silent = false } = {}): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    if (!silent) {
        try {
            return (await rl.question(question)).trim();
        } finally {
            rl.close();
        }
    }

    // readline has no built-in masking, so echo is suppressed for the duration.
    const output = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    const answer = rl.question(question);
    output.muted = true;
    const originalWrite = output.write.bind(output);
    output.write = ((chunk: string | Uint8Array, ...rest: unknown[]) =>
        output.muted && typeof chunk === 'string' && !chunk.includes('\n')
            ? true
            : originalWrite(chunk, ...(rest as []))) as typeof output.write;

    try {
        return (await answer).trim();
    } finally {
        output.muted = false;
        output.write = originalWrite;
        rl.close();
        process.stdout.write('\n');
    }
}

async function main(): Promise<void> {
    const [, , argEmail, argRole] = process.argv;

    await initDb();

    const email = argEmail ?? (await prompt('Email: '));
    const emailResult = EmailSchema.safeParse(email);
    if (!emailResult.success) {
        throw new Error(`Invalid email: ${emailResult.error.issues[0]?.message ?? 'unknown'}`);
    }

    const password = await prompt('Password (hidden): ', { silent: true });
    const passwordResult = PasswordSchema.safeParse(password);
    if (!passwordResult.success) {
        throw new Error(passwordResult.error.issues[0]?.message ?? 'Invalid password');
    }

    const confirmation = await prompt('Confirm password: ', { silent: true });
    if (confirmation !== password) throw new Error('Passwords do not match');

    const id = await createUser({
        email: emailResult.data,
        password: passwordResult.data,
        role: argRole ?? 'admin',
    });
    console.log(`Created user #${id} (${normalizeEmail(emailResult.data)})`);
}

main()
    .then(async () => {
        await closeDb();
        process.exit(0);
    })
    .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
            message.includes('UNIQUE constraint failed')
                ? 'A user with that email already exists.'
                : `Could not create user: ${message}`,
        );
        await closeDb().catch(() => undefined);
        process.exit(1);
    });
