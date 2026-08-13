import { SignApiOptions } from "cloudinary";

const avatarTransformation = "c_fill,h_150,w_150/r_max";
export const getAvatarPublicId = (uid: string) => `users/${uid}/avatar`;

export const avatarApiOptions: SignApiOptions = {
	overwrite: true,
	invalidate: true,
	transformation: avatarTransformation,
};
