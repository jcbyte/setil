import { v2 as cloudinary, TransformationOptions } from "cloudinary";

export const getAvatarPublicId = (uid: string) => `users/${uid}/avatar`;

export const avatarTransformation: TransformationOptions = [
	{
		crop: "fill",
		width: 150,
		height: 150,
	},
	{
		radius: "max",
	},
];
export const avatarTransformationString = cloudinary.utils.generate_transformation_string(avatarTransformation);

export const avatarApiOptions = {
	overwrite: true,
	invalidate: true,
};
