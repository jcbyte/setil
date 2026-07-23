export type AvatarUrl = string;

export interface CloudinaryDetails {
	signature: string;
	timestamp: number;
	cloudName: string;
	apiKey: string;
	uploadParams: { [key: string]: any };
}
