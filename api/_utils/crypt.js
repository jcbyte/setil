import crypto from "crypto";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "base64");

export function encrypt(text) {
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

export function decrypt(encryptedData) {
	const { ciphertext, iv, authTag } = encryptedData;

	const ivBuffer = Buffer.from(iv, "hex");
	const authTagBuffer = Buffer.from(authTag, "hex");
	const ciphertextBuffer = Buffer.from(ciphertext, "hex");

	const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, ivBuffer);
	decipher.setAuthTag(authTagBuffer);

	try {
		let decrypted = decipher.update(ciphertextBuffer, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch (e) {
		throw new Error("Authentication failed or incorrect key/data.");
	}
}
