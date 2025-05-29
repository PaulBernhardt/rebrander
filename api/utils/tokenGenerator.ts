import { Buffer } from "node:buffer";
import jwt from "npm:jsonwebtoken";

/**
 * A token generator for the Ghost Admin API.
 *
 * This class generates a JWT token for the Ghost API.
 * Calling get() will return a token that is valid for the next 5 minutes. Calling
 * it again will return the same token if it is still valid. After four minutes,
 * the token will be regenerated on the next call.
 */
export class TokenGenerator {
	private expiry = 0;
	private token = "";

	constructor(
		private readonly id: string,
		private readonly secret: string,
	) {}

	get(): string {
		if (this.expiry < Date.now()) {
			this.token = jwt.sign({}, Buffer.from(this.secret, "hex"), {
				keyid: this.id,
				algorithm: "HS256",
				expiresIn: "5m",
				audience: "/admin/",
			});
			// Regenerate a token if we're within 1 minute of expiry
			this.expiry = Date.now() + 4 * 60 * 1000;
		}
		return this.token;
	}
}
