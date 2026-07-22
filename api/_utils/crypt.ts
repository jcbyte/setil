import crypto from "crypto";

if (!process.env.ENCRYPTION_KEY) {
	throw new Error("Environment variable `ENCRYPTION_KEY` is not set.");
}

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "base64");

export interface EncryptedData {
	ciphertext: string;
	iv: string;
	authTag: string;
}

export function encrypt(text: string): EncryptedData {
	const iv = crypto.randomBytes(IV_LENGTH);

	const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");

	const authTag = cipher.getAuthTag();

	return {
		ciphertext: encrypted,
		iv: iv.toString("hex"),
		authTag: authTag.toString("hex"),
	};
}

export function decrypt(encryptedData: EncryptedData): string {
	const { ciphertext, iv, authTag } = encryptedData;

	const ivBuffer = Buffer.from(iv, "hex");
	const authTagBuffer = Buffer.from(authTag, "hex");
	const ciphertextBuffer = Buffer.from(ciphertext, "hex");

	const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, ivBuffer);
	decipher.setAuthTag(authTagBuffer);

	try {
		let decrypted = decipher.update(ciphertext, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch (e) {
		throw new Error("Decryption failed: Incorrect key/data.");
	}
}
